const User = require('../core/models/User');
const Organization = require('../core/models/Organization');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { setCache, getCache, deleteCache } = require('../../utils/cache.utils');
const { logAudit } = require('../../utils/audit.utils');

// @desc    Register user and organization
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, organizationName, address, contactEmail } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create Tenant (Organization)
        const organization = await Organization.create({
            name: organizationName,
            address,
            contactEmail: contactEmail || email
        });

        // Create Admin User
        const user = await User.create({
            name,
            email,
            password,
            organization: organization._id,
            role: 'admin'
        });

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check MFA
        if (user.mfaEnabled) {
            const { token } = req.body;
            if (!token) {
                return res.status(200).json({ success: false, mfaRequired: true, message: 'MFA token required' });
            }

            const verified = speakeasy.totp.verify({
                secret: user.mfaSecret.base32,
                encoding: 'base32',
                token
            });

            if (!verified) {
                return res.status(401).json({ success: false, message: 'Invalid MFA Token' });
            }
        }

        sendTokenResponse(user, 200, res, req);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Enable MFA (Generate Secret & QR)
// @route   POST /api/auth/mfa/enable
// @access  Private
exports.enableMFA = async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: `Textile-ERP (${req.user.email})`
        });

        // Save secret to user (but don't enable yet)
        const user = await User.findById(req.user.id).select('+mfaSecret');
        user.mfaSecret = secret;
        await user.save();

        // Generate QR Code
        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error generating QR Code' });
            }
            res.json({ success: true, secret: secret.base32, qrCode: data_url });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify MFA Token and Activate
// @route   POST /api/auth/mfa/verify
// @access  Private
exports.verifyMFA = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user.id).select('+mfaSecret');

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret.base32,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.mfaEnabled = true;
            await user.save();
            res.json({ success: true, message: 'MFA Enabled Successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid Token' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('organization');
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh-token
// @access  Public (needs valid refresh token)
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken, userId } = req.body;

        if (!refreshToken || !userId) {
            return res.status(400).json({ success: false, message: 'Missing token or user ID' });
        }

        const sessionKey = `session:${userId}:${refreshToken}`;
        const session = await getCache(sessionKey);

        if (!session || !session.valid) {
            return res.status(401).json({ success: false, message: 'Invalid or Expired Refresh Token' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            token
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout / Revoke Token
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // In a real app, user might have multiple sessions. 
            // If they send the RT, we revoke that specific session.
            const sessionKey = `session:${req.user.id}:${refreshToken}`;
            await deleteCache(sessionKey);
        }

        // Also log audit
        logAudit(req, 'LOGOUT', 'User', req.user._id);

        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper to Send Token Response (Access + Refresh)
const sendTokenResponse = async (user, statusCode, res, req) => {
    // 1. Audit Log Logic (Async)
    if (req) {
        logAudit(req, 'LOGIN', 'User', user._id, { role: user.role });
    }

    // 2. Generate Access Token
    const token = user.getSignedJwtToken();

    // 3. Generate Refresh Token
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // 4. Store Valid Session in Redis (7 days)
    const sessionKey = `session:${user._id}:${refreshToken}`;
    await setCache(sessionKey, {
        ip: req ? req.ip : 'unknown',
        userAgent: req ? req.get('User-Agent') : 'unknown',
        valid: true
    }, 7 * 24 * 3600);

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Cookie expiry
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organization: user.organization
            }
        });
};
