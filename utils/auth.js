// utils/auth.js
require('dotenv').config()
const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const tough = require('tough-cookie')

const BASE_URL = process.env.PTERODACTYL_PANEL_URL
if (!BASE_URL) throw new Error('PTERODACTYL_PANEL_URL is not defined in .env')

console.log('[auth.js] Using BASE_URL:', BASE_URL)

function createClientFromJar(jar) {
  return wrapper(axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    jar,
  }))
}

async function login({ username, password, recaptchaData = null }) {
  // Use fresh jar per login to avoid stale cookies
  const jar = new tough.CookieJar()
  const client = createClientFromJar(jar)

  console.log('[auth.js] Fetching CSRF cookie...')
  await client.get('/sanctum/csrf-cookie')

  const xsrfCookie = (await jar.getCookies(BASE_URL))
    .find(c => c.key === 'XSRF-TOKEN')
  const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : ''

  console.log('[auth.js] Sending login POST request...')
  const response = await client.post('/auth/login', {
    user: username,
    password,
    'g-recaptcha-response': recaptchaData,
  }, {
    headers: { 'X-XSRF-TOKEN': xsrfToken }
  })

  const data = response.data?.data
  console.log('[auth.js] Login response data:', data)

  if (!data) throw new Error('Login failed or invalid response')

  if (data.confirmation_token) {
    return { requires2FA: true, confirmationToken: data.confirmation_token }
  }

  return { complete: data.complete, user: data.user, cookies: jar.toJSON() }
}

async function submit2FA(token, code, recoveryToken, cookiesJSON) {
  // Recreate jar from stored cookies JSON
  const jar = tough.CookieJar.fromJSON(cookiesJSON)
  const client = createClientFromJar(jar)

  console.log('[auth.js] Submitting 2FA with token:', token)

  // Refresh CSRF cookie for 2FA post
  await client.get('/sanctum/csrf-cookie')

  const xsrfCookie = (await jar.getCookies(BASE_URL))
    .find(c => c.key === 'XSRF-TOKEN')
  const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : ''

  const response = await client.post('/auth/login/checkpoint', {
    confirmation_token: token,
    authentication_code: code,
    recovery_token: recoveryToken && recoveryToken.length > 0 ? recoveryToken : undefined,
  }, {
    headers: { 'X-XSRF-TOKEN': xsrfToken }
  })

  const data = response.data?.data
  console.log('[auth.js] 2FA response data:', data)

  if (!data || !data.complete) throw new Error('2FA verification failed')

  return { complete: true, user: data.user, cookies: jar.toJSON() }
}

module.exports = { login, submit2FA }
