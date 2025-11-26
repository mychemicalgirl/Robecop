require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const csurf = require('csurf')
const authRoutes = require('./routes/auth')
const apiRoutes = require('./routes/api')
const path = require('path')
const fs = require('fs')

const app = express()

// CORS: restrict to intranet / trusted frontend origins
const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowed.indexOf(origin) !== -1) return callback(null, true)
    return callback(new Error('CORS policy: origin not allowed'))
  },
  credentials: true
}))
app.use(bodyParser.json())
app.use(cookieParser())

if ((process.env.USE_COOKIES || 'false') === 'true') {
  app.use(csurf({ cookie: true }))
  app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() })
  })
}

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
