const crypto = require('crypto')

// DEV-only simplistic store; swap with a robust library/service in prod
const TOKENS = new Map() // key by client ip (simplified)

function issueCsrf(ip) {
  const t = crypto.randomBytes(16).toString('hex')
  TOKENS.set(ip, t)
  return t
}

function validateCsrf(ip, token) {
  if (!token) return false
  return TOKENS.get(ip) === token
}

module.exports = { issueCsrf, validateCsrf }
