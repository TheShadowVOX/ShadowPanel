const { httpErrorToHuman } = require('../utils/http');

const flashes = {
    items: [],

    addFlash(payload) {
        this.items.push(payload);
    },

    addError({ message, key }) {
        this.items.push({ type: 'error', title: 'Error', message, key });
    },

    clearAndAddHttpError({ error = null, key }) {
        if (!error) {
            this.items = [];
        } else {
            console.error(error);
            this.items = [{
                type: 'error',
                title: 'Error',
                key,
                message: httpErrorToHuman(error),
            }];
        }
    },

    clearFlashes(key) {
        this.items = key
            ? this.items.filter(msg => msg.key !== key)
            : [];
    },
};

module.exports = flashes;
