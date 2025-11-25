const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const prisma = require('../prismaClient')
const { cca } = require('../msalClient')

// Read AUTH_MODE from env: 'JWT' (local) or 'ENTRA' (MS Entra ID)
const AUTH_MODE = (process.env.AUTH_MODE || 'JWT').toUpperCase()

function getAuthCodeUrlParams() {
  const redirectUri = process.env.AZURE_REDIRECT_URI || 'http://localhost:4000/auth/entra/callback'
  return {
    scopes: ['openid', 'profile', 'email'],
    redirectUri
  }
}


// Local JWT login for scaffold/testing
// In production you may integrate Microsoft Entra ID (OAuth2) and exchange tokens
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (AUTH_MODE === 'ENTRA') return res.status(400).json({ error: 'Local login disabled when AUTH_MODE=ENTRA' })
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password || '')
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '8h' })
  res.json({ token, user: { id: user.id, email: user.email, role: user.role.name } })
})

// Simple registration route for bootstrap/testing
router.post('/register', async (req, res) => {
  const { email, password, name, roleName } = req.body
  const role = await prisma.role.findUnique({ where: { name: roleName || 'Employee' } })
  const hashed = await bcrypt.hash(password || 'password', 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name, roleId: role.id } })
  res.json({ id: user.id, email: user.email })
})

// Placeholder for Microsoft Entra ID OAuth integration
// MS Entra login start: redirect to Microsoft login page
router.get('/entra/login', async (req, res) => {
  if (AUTH_MODE !== 'ENTRA') return res.status(400).json({ error: 'Entra SSO not enabled (AUTH_MODE != ENTRA)' })
  try {
    const authCodeUrlParams = getAuthCodeUrlParams()
    if (!cca) throw new Error('MSAL client not configured')
    const response = await cca.getAuthCodeUrl(authCodeUrlParams)
    // Redirect user to Microsoft login (auth URL)
    return res.redirect(response)
  } catch (err) {
    console.error('entra login error', err)
    res.status(500).json({ error: 'Failed to start Entra login' })
  }
})

// MS Entra callback: exchange code for tokens and sign-in user
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

    // Map Azure email to internal user, create if missing
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

    // Issue local JWT for session handling and return to frontend
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '8h' })
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000'
    // For demo: return token in query so frontend can store it. In production prefer secure cookie.
    return res.redirect(`${frontend}/auth/callback?token=${token}`)
  } catch (err) {
    console.error('entra callback error', err)
    return res.status(500).send('Authentication failed')
  }
})

module.exports = router
