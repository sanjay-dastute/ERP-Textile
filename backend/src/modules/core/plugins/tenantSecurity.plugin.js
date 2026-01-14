const { getKey } = require('../../../utils/context');

const tenantSecurityPlugin = (schema, options) => {
    schema.add({
        organization: {
            type: require('mongoose').Schema.Types.ObjectId,
            ref: 'Organization',
            index: true
        }
    });

    const applyRLS = function (next) {
        // If query explicitly sets ignoreRLS, skip
        if (this.options && this.options.ignoreRLS) {
            return typeof next === 'function' ? next() : undefined;
        }

        const currentUser = getKey('user');

        // If no user context (e.g. system job or login), skip
        // BUT logic depends: do we want fail-safe?
        // For Login, we don't have user yet.
        // For Public routes, no user.
        if (!currentUser) {
            return typeof next === 'function' ? next() : undefined;
        }

        // System Admin can see all? (checking ABAC role usually better, but RLS layer can override)
        // Let's assume 'superadmin' role ignores RLS, otherwise enforce.
        if (currentUser.role === 'superadmin') {
            return typeof next === 'function' ? next() : undefined;
        }

        // Apply filter
        const orgId = getKey('organization');
        if (orgId) {
            this.where({ organization: orgId });
        }

        if (typeof next === 'function') {
            next();
        }
    };

    // Hook into find calls
    schema.pre('find', applyRLS);
    schema.pre('findOne', applyRLS);
    schema.pre('findOneAndUpdate', applyRLS);
    schema.pre('countDocuments', applyRLS);
    schema.pre('count', applyRLS);
    schema.pre('deleteOne', applyRLS);
    schema.pre('deleteMany', applyRLS);
    // updateOne/Many need care as 'this' might differ in various mongoose versions, but mostly works for Query middleware
};

module.exports = tenantSecurityPlugin;
