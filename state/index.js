const flashes = require('./flashes');

// Stubs for other stores:
const user = {};          // Fill in if needed
const permissions = {};   // Fill in if needed
const settings = {};      // Fill in if needed
const progress = {};      // Fill in if needed

const store = {
    permissions,
    flashes,
    user,
    settings,
    progress,
};

module.exports = { store };
