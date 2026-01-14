const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const runInContext = (callback) => {
    // Initialize context with empty store
    return storage.run(new Map(), callback);
};

const getContext = () => {
    return storage.getStore();
};

const setKey = (key, value) => {
    const store = getContext();
    if (store) {
        store.set(key, value);
    }
};

const getKey = (key) => {
    const store = getContext();
    return store ? store.get(key) : undefined;
};

module.exports = {
    runInContext,
    getContext,
    setKey,
    getKey
};
