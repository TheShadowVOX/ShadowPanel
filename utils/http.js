const axios = require('axios');

const http = axios.create({
    withCredentials: true,
    timeout: 20000,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

module.exports = {
    http,

    httpErrorToHuman: (error) => {
        if (error.response && error.response.data) {
            let data = error.response.data;

            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (_) {}
            }

            if (data.errors && data.errors[0] && data.errors[0].detail) {
                return data.errors[0].detail;
            }

            if (data.error && typeof data.error === 'string') {
                return data.error;
            }
        }

        return error.message;
    },

    getPaginationSet: (meta) => ({
        total: meta.total,
        count: meta.count,
        perPage: meta.per_page,
        currentPage: meta.current_page,
        totalPages: meta.total_pages,
    }),
};
