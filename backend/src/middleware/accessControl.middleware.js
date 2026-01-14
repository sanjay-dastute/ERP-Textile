// Custom Policy Engine for ABAC
// Let's build a lightweight ABAC Engine.

class PolicyEngine {
    constructor() {
        this.policies = [];
    }

    // Add a policy: { resource, action, condition: (user, resource) => boolean }
    addPolicy(resource, action, condition) {
        this.policies.push({ resource, action, condition });
    }

    check(user, resourceType, action, resourceData = null) {
        // 1. Filter policies for this resource/action
        const relevantPolicies = this.policies.filter(
            p => (p.resource === '*' || p.resource === resourceType) &&
                (p.action === '*' || p.action === action)
        );

        if (relevantPolicies.length === 0) {
            // Default Deny
            return false;
        }

        // 2. Evaluate
        // If ANY policy allows it, we allow (or we could require ALL). 
        // Let's assume we are defining "Allow" policies.
        for (const policy of relevantPolicies) {
            if (policy.condition) {
                if (resourceData) {
                    if (policy.condition(user, resourceData)) return true;
                } else {
                    // Static check (no resource instance yet) - if policy requires instance, we might pass or fail?
                    // Usually we distinguish "can read ANY order" vs "can read THIS order".
                    // If condition doesn't use resourceData, it passes.
                    try {
                        if (policy.condition(user, {})) return true;
                    } catch (e) {
                        // Condition probably needed data
                    }
                }
            } else {
                return true; // No condition = public/allow
            }
        }
        return false;
    }
}

const engine = new PolicyEngine();

// Define Policies (Move this to a config file later)
// Admin can do anything
engine.addPolicy('*', '*', (user) => user.role === 'admin');

// Managers can read all within their organization
engine.addPolicy('*', 'read', (user, resource) => {
    return user.role === 'manager' && (!resource.organization || user.organization.toString() === resource.organization.toString());
});

// Staff can read/write only if they are "active" and matches organization
engine.addPolicy('order', '*', (user, resource) => {
    return user.role === 'staff' &&
        user.isActive &&
        (!resource.organization || user.organization.toString() === resource.organization.toString());
});

// Middleware
const checkPermission = (action, resourceType) => {
    return (req, res, next) => {
        // Check if we have the resource loaded in req[resourceType] or req.resource
        // Or if it's a list request (no ID).
        const resourceData = req[resourceType] || req.body || {}; // simplistic mapping

        // Add Organization to resourceData from body if creating
        if (req.method === 'POST' && !resourceData.organization) {
            // In real app, we might force it:
            // resourceData.organization = req.user.organization;
            // But for checking:
        }

        if (resourceData && !resourceData.organization) {
            // Treat as generic check against user's org if not present?
            // For now, pass what we have.
        }

        const allowed = engine.check(req.user, resourceType, action, resourceData);

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: `ABAC: You do not have permission to ${action} this ${resourceType}`
            });
        }
        next();
    };
};

module.exports = { engine, checkPermission };
