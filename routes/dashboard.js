const express = require('express');
const axios = require('axios');
const router = express.Router();
const tough = require('tough-cookie');

const { rawDataToServerObject } = require('../utils/transformers');
const { httpErrorToHuman } = require('../utils/http');

router.use((req, res, next) => {
    if (!req.session || !req.session.cookies) {
        return res.redirect('/auth/login');
    }
    next();
});

router.get('/', async (req, res) => {
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;
    const user = req.session.user || {};

    try {
        // Rehydrate jar from session
        const jar = tough.CookieJar.fromJSON(req.session.cookies);
        const cookieString = await jar.getCookieString(panelUrl);

        const response = await axios.get(`${panelUrl}/api/client`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookieString,
            },
            withCredentials: true,
        });

        const servers = response.data.data.map(s => rawDataToServerObject(s));

        res.render('dashboard', {
            user,
            servers,
        });
    } catch (err) {
        console.error('[DASHBOARD] API error:', err);
        res.status(500).render('dashboard', {
            user,
            servers: [],
            error: httpErrorToHuman(err),
        });
    }
});

module.exports = router;
