const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { body, validationResult } = require('express-validator')
const prisma = require('../prismaClient')
const { cca } = require('../msalClient')
const loginLimiter = require('../middleware/rateLimiter')
const { generateRefreshSecret, generateJti, hashToken, expiresAtDays } = require('../utils/token')

const AUTH_MODE = (process.env.AUTH_MODE || 'JWT').toUpperCase()
const REFRESH_PEPPER = process.env.REFRESH_TOKEN_PEPPER || 'change_me'

function getAuthCodeUrlParams() {
  const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:4000/auth/entra/callback'
  return {
    scopes: ['openid', 'profile', 'email'],
    redirectUri
  }
}

function signAccessToken(userId) {
  const accessExpiryMinutes = parseInt(process.env.ACCESS_TOKEN_EXPIRES_MINUTES || '15', 10)
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: `${accessExpiryMinutes}m` })
}

async function issueTokens(user, ctx = {}) {
  const jti = generateJti()
  const secret = generateRefreshSecret()
  const tokenHash = hashToken(secret, REFRESH_PEPPER)
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10)
  const expiresAt = expiresAtDays(days)

  await prisma.refreshToken.create({ data: {
    jti,
    userId: user.id,
    tokenHash,
    expiresAt,
    ip: ctx.ip || null,
    userAgent: ctx.userAgent || null,
    deviceId: ctx.deviceId || null
  }})

  const accessToken = signAccessToken(user.id)
  return { accessToken, refreshToken: `${jti}.${secret}`, expiresAt }
}

async function rotateRefresh(raw, ctx = {}) {
  if (!raw || typeof raw !== 'string') throw new Error('No refresh token provided')
  const parts = raw.split('.')
  if (parts.length !== 2) {
    throw new Error('Invalid refresh token format')
  }
  const [jti, secret] = parts
  const tokenHash = hashToken(secret, REFRESH_PEPPER)
  const record = await prisma.refreshToken.findUnique({ where: { jti } })
  if (!record) {
    console.warn('Refresh token not found for jti', jti)
    const e = new Error('Refresh token invalid')
    e.status = 401
    throw e
  }
  // verify hash
  if (record.tokenHash !== tokenHash) {
    console.warn('Refresh token hash mismatch for jti', jti)
    const e = new Error('Refresh token invalid')
    e.status = 401
    throw e
  }
  const now = new Date()
  if (record.expiresAt && record.expiresAt < now) {
    console.warn('Refresh token expired', jti)
    const e = new Error('Refresh token expired')
    e.status = 401
    throw e
  }
  if (record.revokedAt) {
    console.warn('Refresh token already revoked', jti)
    const e = new Error('Refresh token revoked')
    e.status = 401
    throw e
  }
  if (record.rotatedAt || record.replacedByJti) {
    console.warn('Refresh token already rotated', jti)
    const e = new Error('Refresh token rotated')
    e.status = 401
    throw e
  }

  // Issue new token
  const user = await prisma.user.findUnique({ where: { id: record.userId } })
  if (!user) {
    const e = new Error('User not found')
    e.status = 401
    throw e
  }
  const newJti = generateJti()
  const newSecret = generateRefreshSecret()
  const newHash = hashToken(newSecret, REFRESH_PEPPER)
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10)
  const newExpiresAt = expiresAtDays(days)

  // create new record
  await prisma.refreshToken.create({ data: {
    jti: newJti,
    userId: user.id,
    tokenHash: newHash,
    expiresAt: newExpiresAt,
    ip: ctx.ip || null,
    userAgent: ctx.userAgent || null,
    deviceId: ctx.deviceId || null
  }})

  // mark old as rotated/revoked
  await prisma.refreshToken.update({ where: { jti }, data: { rotatedAt: now, revokedAt: now, reason: 'rotation', replacedByJti: newJti } })

  const accessToken = signAccessToken(user.id)
  return { accessToken, refreshToken: `${newJti}.${newSecret}`, expiresAt: newExpiresAt }
}

async function revokeByJti(jti, reason = 'logout') {
  try {
    await prisma.refreshToken.update({ where: { jti }, data: { revokedAt: new Date(), reason } })
  } catch (err) {
    // ignore if not found
  }
}

// Local JWT login
router.post('/login',
  loginLimiter,
  body('email').isEmail(),
  body('password').isLength({ min: 4 }),
  async (req, res) => {
    if (AUTH_MODE === 'ENTRA') return res.status(400).json({ error: 'Local login disabled when AUTH_MODE=ENTRA' })
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password || '')
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const ctx = { ip: req.ip, userAgent: req.get('user-agent'), deviceId: req.body.deviceId }
    const tokens = await issueTokens(user, ctx)

    if ((process.env.USE_COOKIES || 'false') === 'true') {
      const isSecure = (process.env.NODE_ENV || 'development') === 'production'
      const cookieOpts = {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAMESITE || 'Lax',
        secure: (process.env.COOKIE_SECURE || 'false') === 'true',
        path: '/',
      }
      res.cookie('refresh_token', tokens.refreshToken, { ...cookieOpts, maxAge: tokens.expiresAt - Date.now() })
      res.cookie('access_token', tokens.accessToken, { ...cookieOpts, maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES_MINUTES || '15', 10) * 60 * 1000 })
      return res.json({ ok: true })
    }

    res.json({ token: tokens.accessToken, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: tokens.expiresAt, user: { id: user.id, email: user.email, role: user.role.name } })
  })

// Registration
router.post('/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const { email, password, name, roleName } = req.body
    const role = await prisma.role.findUnique({ where: { name: roleName || 'Employee' } })
    const hashed = await bcrypt.hash(password || 'password', 10)
    const user = await prisma.user.create({ data: { email, password: hashed, name, roleId: role.id } })
    res.json({ id: user.id, email: user.email })
  })

// Entra SSO start (unchanged behaviour)
router.get('/entra/login', async (req, res) => {
  if (AUTH_MODE !== 'ENTRA') return res.status(400).json({ error: 'Entra SSO not enabled (AUTH_MODE != ENTRA)' })
  try {
    const authCodeUrlParams = getAuthCodeUrlParams()
    if (!cca) throw new Error('MSAL client not configured')
    const response = await cca.getAuthCodeUrl(authCodeUrlParams)
    return res.redirect(response)
  } catch (err) {
    console.error('entra login error', err)
    res.status(500).json({ error: 'Failed to start Entra login' })
  }
})

router.get('/entra/callback', async (req, res) => {
  if (AUTH_MODE !== 'ENTRA') return res.status(400).json({ error: 'Entra SSO not enabled (AUTH_MODE != ENTRA)' })
  const code = req.query.code
  if (!code) return res.status(400).send('No code received')
  try {
    const tokenRequest = {
      code: code.toString(),
      scopes: ['openid', 'profile', 'email'],
      redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:4000/auth/entra/callback'
    }
    if (!cca) throw new Error('MSAL client not configured')
    const response = await cca.acquireTokenByCode(tokenRequest)
    const idToken = response && response.idTokenClaims
    const email = idToken && (idToken.email || idToken.preferred_username || idToken.upn)
    const name = idToken && (idToken.name || idToken.preferred_username)

    if (!email) return res.status(400).send('No email claim from Entra')

    const adminEmails = (process.env.AZURE_ADMIN_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean)
    const supervisorEmails = (process.env.AZURE_SUPERVISOR_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean)

    let roleName = 'Employee'
    if (adminEmails.includes(email)) roleName = 'Admin'
    else if (supervisorEmails.includes(email)) roleName = 'Supervisor'

    let role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) role = await prisma.role.create({ data: { name: roleName } })

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name, roleId: role.id }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '8h' })
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000'
    return res.redirect(`${frontend}/auth/callback?token=${token}`)
  } catch (err) {
    console.error('entra callback error', err)
    return res.status(500).send('Authentication failed')
  }
})

// Refresh endpoint: rotate stored refresh token
router.post('/refresh', loginLimiter, async (req, res) => {
  try {
    const raw = req.cookies && req.cookies.refresh_token ? req.cookies.refresh_token : (req.body && req.body.refreshToken)
    if (!raw) return res.status(400).json({ error: 'No refresh token provided' })
    const ctx = { ip: req.ip, userAgent: req.get('user-agent'), deviceId: req.body.deviceId }
    const tokens = await rotateRefresh(raw, ctx)

    if ((process.env.USE_COOKIES || 'false') === 'true') {
      const cookieOpts = {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAMESITE || 'Lax',
        secure: (process.env.COOKIE_SECURE || 'false') === 'true',
        path: '/',
      }
      res.cookie('refresh_token', tokens.refreshToken, { ...cookieOpts, maxAge: tokens.expiresAt - Date.now() })
      res.cookie('access_token', tokens.accessToken, { ...cookieOpts, maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES_MINUTES || '15', 10) * 60 * 1000 })
      return res.json({ ok: true })
    }

    res.json({ token: tokens.accessToken, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: tokens.expiresAt })
  } catch (err) {
    console.error('refresh error', err && err.message)
    return res.status(err && err.status ? err.status : 401).json({ error: err && err.message ? err.message : 'Refresh failed' })
  }
})

router.post('/logout', async (req, res) => {
  const raw = req.cookies && req.cookies.refresh_token ? req.cookies.refresh_token : (req.body && req.body.refreshToken)
  if (raw) {
    const parts = raw.split('.')
    if (parts.length === 2) {
      const jti = parts[0]
      await revokeByJti(jti, 'logout')
    }
  }
  if ((process.env.USE_COOKIES || 'false') === 'true') {
    res.clearCookie('refresh_token', { path: '/' })
    res.clearCookie('access_token', { path: '/' })
    return res.status(204).end()
  }
  return res.status(204).end()
})

module.exports = router


