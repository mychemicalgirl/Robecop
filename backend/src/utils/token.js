const crypto = require('crypto')

function generateRefreshSecret() {
  return crypto.randomBytes(32).toString('hex')
}

function generateJti() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return crypto.randomBytes(16).toString('hex')
}

function hashToken(raw, pepper) {
  const h = crypto.createHash('sha256')
  h.update(raw + '|' + (pepper || ''))
  return h.digest('hex')
}

function expiresAtDays(days) {
  return new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000)
}

module.exports = { generateRefreshSecret, generateJti, hashToken, expiresAtDays }
