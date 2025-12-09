const prisma = require('../prismaClient')
const cron = require('node-cron')

module.exports = function startCleanup() {
  // run daily at 03:00
  cron.schedule('0 3 * * *', async () => {
    try {
      const now = new Date()
      // delete tokens expired more than 30 days ago or revoked long ago
      const res = await prisma.refreshToken.deleteMany({ where: { OR: [ { expiresAt: { lt: new Date(Date.now() - 1000*60*60*24*30) } }, { revokedAt: { lt: new Date(Date.now() - 1000*60*60*24*30) } } ] } })
      if (res.count) console.log('Cleanup: removed', res.count, 'old refresh tokens')
    } catch (err) {
      console.error('cleanupExpiredTokens error', err)
    }
  })
}
