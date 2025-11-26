
const rateLimit = require('express-rate-limit')

// During tests, disable rate limiting to avoid flakiness from shared in-memory stores
if ((process.env.NODE_ENV || '').toLowerCase() === 'test') {
  module.exports = function (req, res, next) { return next() }
} else {
  let store = undefined

  // Use Redis-backed store when REDIS_URL is provided (production-ready)
  if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis')
    const RedisStore = require('rate-limit-redis')
    const redisClient = new Redis(process.env.REDIS_URL)
    store = new RedisStore({ client: redisClient, prefix: 'rl:' })
  } catch (err) {
    // If Redis packages aren't installed or connection fails, fall back to in-memory store
    console.warn('Redis rate-limit store could not be initialized, falling back to memory store:', err && err.message)
    store = undefined
  }
}

const loginLimiter = rateLimit({
  windowMs: (process.env.LOGIN_RATE_LIMIT_WINDOW_MS && parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10)) || 60 * 1000,
  max: (process.env.LOGIN_RATE_LIMIT_MAX && parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10)) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  store
})

module.exports = loginLimiter
}
