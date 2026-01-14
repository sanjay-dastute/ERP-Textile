const requestIp = require('request-ip');

const sessionMiddleware = (req, res, next) => {
    req.clientIp = requestIp.getClientIp(req);
    req.userAgent = req.get('User-Agent') || 'Unknown';
    req.deviceId = `${req.clientIp}-${req.userAgent}`; // Simple device fingerprint
    next();
};

module.exports = { sessionMiddleware };
