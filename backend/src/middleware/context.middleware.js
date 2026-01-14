const { runInContext, setKey } = require('../utils/context');

const contextMiddleware = (req, res, next) => {
    runInContext(() => {
        // We will set the user later in the auth middleware, 
        // but we need the context to exist now.
        next();
    });
};

// Helper middleware to set user in context AFTER auth
const setContextUser = (req, res, next) => {
    if (req.user) {
        setKey('user', req.user);
        setKey('organization', req.user.organization);
    }
    next();
};

module.exports = { contextMiddleware, setContextUser };
