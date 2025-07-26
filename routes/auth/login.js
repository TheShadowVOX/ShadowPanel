const express = require('express')
const router = express.Router()
const { login, submit2FA } = require('../../utils/auth')

router.get('/', (req, res) => {
  console.log('[GET /auth] Rendering login page')
  res.render('login', { error: null, requires2FA: false })
})

router.post('/', async (req, res) => {
  const { username, password } = req.body
  console.log('[POST /auth] Login attempt:', { username })

  try {
    const result = await login({ username, password })
    console.log('[POST /auth] Login result:', result)

    if (result.requires2FA) {
      req.session.confirmationToken = result.confirmationToken
      console.log('[POST /auth] Requires 2FA, token stored in session')
      return res.render('login', { error: null, requires2FA: true })
    }

    // Save cookies JSON directly
    req.session.cookies = result.cookies
    console.log('[POST /auth] Login complete, redirecting to /dashboard')
    res.redirect('/dashboard')
  } catch (err) {
    console.error('[POST /auth] Login error:', err.message)
    res.render('login', { error: err.message, requires2FA: false })
  }
})

router.post('/2fa', async (req, res) => {
  const { code } = req.body
  const token = req.session.confirmationToken

  if (!token) {
    console.warn('[POST /auth/2fa] No token in session, redirecting to /')
    return res.redirect('/')
  }

  console.log('[POST /auth/2fa] Submitting 2FA code:', code)

  try {
    // Pass stored cookies JSON to submit2FA
    const result = await submit2FA(token, code, null, req.session.cookies)
    console.log('[POST /auth/2fa] 2FA result:', result)

    req.session.cookies = result.cookies
    console.log('[POST /auth/2fa] 2FA complete, redirecting to /dashboard')
    res.redirect('/dashboard')
  } catch (err) {
    console.error('[POST /auth/2fa] 2FA error:', err.message)
    res.render('login', { error: err.message, requires2FA: true })
  }
})

module.exports = router
