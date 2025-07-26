const express = require('express');
const axios = require('axios');
const tough = require('tough-cookie');
const QRCode = require('qrcode');
const cheerio = require('cheerio');
const router = express.Router();

router.use((req, res, next) => {
    if (!req.session || !req.session.cookies) {
        return res.redirect('/auth/login');
    }
    next();
});

// Fetch CSRF token from panel main page
async function fetchCsrfToken(jar, panelUrl) {
    const cookieString = await jar.getCookieString(panelUrl);
    const response = await axios.get(panelUrl, {
        headers: { Cookie: cookieString, Accept: 'text/html' },
        withCredentials: true,
    });
    const $ = cheerio.load(response.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');
    if (!csrfToken) throw new Error('CSRF token not found in panel page');
    return csrfToken;
}

// Generate auth headers with cookies and CSRF token
async function authHeaders(req) {
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;
    const jar = tough.CookieJar.fromJSON(req.session.cookies);
    const cookieString = await jar.getCookieString(panelUrl);

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieString,
    };

    if (req.session.csrfToken) {
        headers['X-CSRF-Token'] = req.session.csrfToken;
    }

    return headers;
}

router.get('/', async (req, res) => {
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const jar = tough.CookieJar.fromJSON(req.session.cookies);
        const cookieString = await jar.getCookieString(panelUrl);

        const response = await axios.get(`${panelUrl}/api/client/account`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Cookie: cookieString,
            },
            withCredentials: true,
        });

        const user = response.data.attributes;
        res.render('my/account', { user, error: null });
    } catch (err) {
        console.error('[ACCOUNT] API error:', err);
        res.status(500).render('account', {
            user: null,
            error: 'Failed to fetch account details',
        });
    }
});

router.get('/two-factor', async (req, res) => {
  const panelUrl = process.env.PTERODACTYL_PANEL_URL;

  try {
    if (!req.session.cookies) {
      throw new Error('Session cookies missing');
    }

    console.log('Session cookies:', req.session.cookies);

    const jar = tough.CookieJar.fromJSON(req.session.cookies);
    const cookieString = await jar.getCookieString(panelUrl);

    // Fetch account details first to get 2FA status
    const accountRes = await axios.get(`${panelUrl}/api/client/account`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieString,
      },
      withCredentials: true,
    });

    const user = accountRes.data.attributes;
    const twoFactorEnabled = user['2fa'] === true;

    let qrCodeImage = null;

    if (!twoFactorEnabled) {
      req.session.csrfToken = await fetchCsrfToken(jar, panelUrl);

      const setupRes = await axios.get(`${panelUrl}/api/client/account/two-factor`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: cookieString,
        },
        withCredentials: true,
      });

      const imageData = setupRes.data.data?.image_url_data;
      if (!imageData) throw new Error('QR code image not found in response');

      const modifiedUrl = imageData.replace(/issuer=Pterodactyl/, 'issuer=ShadowPanel');
      qrCodeImage = await QRCode.toDataURL(modifiedUrl);
    }

    res.render('my/twofactor', {
      twoFactorEnabled,
      image: qrCodeImage,
      error: null,
    });
  } catch (err) {
    console.error('[2FA GET] Error:', err.stack || err.message || err);
    const apiError = err.response?.data?.errors?.[0]?.detail || err.message;
    res.render('my/twofactor', {
      twoFactorEnabled: false,
      image: null,
      error: apiError,
    });
  }
});



router.post('/two-factor', async (req, res) => {
    const panelUrl = process.env.PTERODACTYL_PANEL_URL;

    try {
        const jar = tough.CookieJar.fromJSON(req.session.cookies);
        const cookieString = await jar.getCookieString(panelUrl);

        // Check if 2FA already enabled
        const statusRes = await axios.get(`${panelUrl}/api/client/account/two-factor`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Cookie: cookieString,
            },
            withCredentials: true,
        });

        if (statusRes.data.data?.enabled) {
            return res.render('my/twofactor', { image: null, error: 'Two-factor authentication is already enabled.', twoFactorEnabled: true });
        }

        // Otherwise proceed with enabling 2FA
        const headers = await authHeaders(req);
        const payload = {
            code: req.body.code,
            password: req.body.password,
        };

        const response = await axios.post(`${panelUrl}/api/client/account/two-factor`, payload, { headers });

        if (response.status !== 200) {
            throw new Error(response.data.errors?.[0]?.detail || 'Invalid token or password');
        }

        res.render('my/recovery', { tokens: response.data.attributes.tokens, error: null });
    } catch (err) {
        console.error('[TWO-FACTOR POST] Error:', err.response?.data || err.message || err);
        res.render('my/twofactor', { image: null, error: err.message, twoFactorEnabled: false });
    }
});

router.post('/two-factor/disable', async (req, res) => {
  const panelUrl = process.env.PTERODACTYL_PANEL_URL;

  if (!req.body.password) {
    return res.render('my/twofactor', { image: null, error: 'Password is required to disable 2FA.', enabled: true });
  }

  try {
    const headers = await authHeaders(req);
    const payload = { password: req.body.password };

    const response = await axios.post(`${panelUrl}/api/client/account/two-factor/disable`, payload, { headers });

    if (response.status !== 204) { // 204 No Content expected on success
      throw new Error(response.data.errors?.[0]?.detail || 'Failed to disable 2FA');
    }

    // After disable success, reload to show QR code for enabling 2FA again
    res.redirect('/my/account/two-factor');
  } catch (err) {
    console.error('[TWO-FACTOR DISABLE] Error:', err.response?.data || err.message || err);
    res.render('my/twofactor', { image: null, error: err.message, enabled: true });
  }
});


module.exports = router;
