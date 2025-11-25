const jwt = require('jsonwebtoken')
const prisma = require('../prismaClient')

// Middleware to verify JWT and attach user to request
async function verifyToken(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'No authorization header' })
  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret')
    // Attach minimal user info
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { role: true } })
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = { id: user.id, email: user.email, role: user.role.name }
    next()
  } catch (err) {
    console.error('verifyToken error', err)
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Role-based access control
function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role
    if (!role || !allowed.includes(role)) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

module.exports = { verifyToken, requireRole }
