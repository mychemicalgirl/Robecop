require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const csurf = require('csurf')
const authRoutes = require('./routes/auth')
const apiRoutes = require('./routes/api')
const prisma = require('./prismaClient')
const nodemailer = require('nodemailer')
const cron = require('node-cron')

// Optional token cleanup
if ((process.env.ENABLE_TOKEN_CLEANUP || 'false') === 'true') {
  try { require('./jobs/cleanupExpiredTokens')() } catch (e) { console.warn('token cleanup job failed to start', e) }
}

const app = express()

// CORS: restrict to intranet / trusted frontend origins
const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean)
// start server
const app = require('./app')
const prisma = require('./prismaClient')
const nodemailer = require('nodemailer')
const cron = require('node-cron')

// Email helper (configure SMTP via env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

// Cron job: daily check for expiring PPE and send notification (skeleton)
cron.schedule('0 8 * * *', async () => {
  try {
    const soon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) // next 14 days
    const items = await prisma.ppeAssignment.findMany({ where: { expiresAt: { lte: soon } }, include: { employee: true, ppe: true } })
    if (items.length) {
      const text = items.map(i => `${i.ppe.name} for ${i.employee.firstName} ${i.employee.lastName} expires ${i.expiresAt}`).join('\n')
      console.log('Sending expiry alerts:\n', text)
      if (process.env.FROM_EMAIL && process.env.SMTP_HOST) {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: process.env.FROM_EMAIL,
          subject: 'PPE Expiration Alerts',
          text
        })
      }
    }
  } catch (err) { console.error('Cron error', err) }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`))
      }
    }
  } catch (err) { console.error('Cron error', err) }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`))
