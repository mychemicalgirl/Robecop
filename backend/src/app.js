require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const authRoutes = require('./routes/auth')
const apiRoutes = require('./routes/api')
const path = require('path')
const fs = require('fs')

const { issueCsrf, validateCsrf } = require('./csrf')
const { cookieToAuthHeader } = require('./middleware/cookieAuth')

const app = express()

// Fail-fast on weak JWT secret
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_secret') {
  throw new Error('JWT_SECRET must be set to a strong value')
}

// CORS: allow only the frontend origin when using cookies
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000'
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-csrf-token']
}))

app.use(bodyParser.json())
app.use(cookieParser())

// promote cookies to Authorization header when cookie flow is enabled
if ((process.env.USE_COOKIES || 'false') === 'true') {
  app.use(cookieToAuthHeader)
}

// CSRF issuance endpoint and global check for mutating requests when cookies enabled
app.get('/csrf-token', (req, res) => {
  const csrfToken = issueCsrf(req.ip)
  return res.json({ csrfToken })
})

app.use((req, res, next) => {
  const isMutation = ['POST','PUT','PATCH','DELETE'].includes(req.method)
  if ((process.env.USE_COOKIES || 'false') === 'true' && isMutation) {
    const ok = validateCsrf(req.ip, req.headers['x-csrf-token'])
    if (!ok) return res.status(403).json({ error: 'CSRF token missing/invalid' })
  }
  next()
})

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// Serve uploaded files statically at /uploads
app.use('/uploads', express.static(uploadsDir))

app.use('/auth', authRoutes)
app.use('/api', apiRoutes)

// Simple health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }))

module.exports = app
