const sanitizeInput = (req, res, next) => {
    if (req.body) {
        // Prevent Mass Assignment of sensitive fields
        const sensitiveFields = ['organization', 'role', 'permissions', 'flags', 'mfaEnabled', 'mfaSecret'];

        // Allow Admin to update these (optional, or separate route)
        // For now, strict: even admin should use specific endpoints for these, not generic updates
        if (req.user && req.user.role !== 'admin') {
            sensitiveFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    delete req.body[field];
                }
            });
        }
    }
    next();
};

const preventTenantHopping = (req, res, next) => {
    // Explicitly block organization updates if not caught by sanitization (redundant safety)
    if (req.body && req.body.organization) {
        // If it's the same organization, maybe okay? But safer to just block.
        // Unless it's an admin creating a user? (Use separate route)
        // For general updates:
        if (req.method === 'PUT' || req.method === 'PATCH') {
            delete req.body.organization;
        }
    }
    next();
};

module.exports = { sanitizeInput, preventTenantHopping };
