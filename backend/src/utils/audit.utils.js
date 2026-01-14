const AuditLog = require('../modules/core/models/AuditLog');

const logAudit = async (req, action, resource, resourceId = null, details = {}) => {
    try {
        // If no user (e.g. failed login or public route), we might want to log purely by IP?
        // For now, only log authenticated or identifiable actions.
        const user = req.user ? req.user._id : null;
        const organization = req.user ? req.user.organization : null; // Context middleware might help here too

        if (!user) return; // Skip anonymous for now unless critical

        await AuditLog.create({
            user,
            organization,
            action,
            resource,
            resourceId,
            details,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    } catch (error) {
        console.error('Audit Logging Failed:', error.message);
        // Don't crash the request if logging fails
    }
};

module.exports = { logAudit };
