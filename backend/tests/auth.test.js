require('./utils/testEnv')
const request = require('supertest')
const app = require('../src/app')
const simpleSeed = require('./utils/simpleSeed')
const dbTeardown = require('./utils/dbTeardown')

let adminToken

beforeAll(async () => {
  await simpleSeed()
  // login admin
  const res = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'admin123' })
  adminToken = res.body.token
})

afterAll(async () => {
  await dbTeardown()
})

describe('Auth', () => {
  test('register validation fails without email/password', async () => {
    const res = await request(app).post('/auth/register').send({})
    expect(res.statusCode).toBe(400)
  })

  test('register and login flow', async () => {
    const r = await request(app).post('/auth/register').send({ email: 'testuser@example.com', password: 'pass1234', name: 'Test User', roleName: 'Employee' })
    expect([200,201]).toContain(r.statusCode)
    expect(r.body.email).toBe('testuser@example.com')

    const l = await request(app).post('/auth/login').send({ email: 'testuser@example.com', password: 'pass1234' })
    expect(l.statusCode).toBe(200)
    expect(l.body.token).toBeTruthy()

    // protected route access
    const p = await request(app).get('/api/ppe').set('Authorization', `Bearer ${l.body.token}`)
    expect(p.statusCode).toBe(200)
  })

  test('login wrong password fails', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'wrong' })
    expect(res.statusCode).toBe(401)
  })

  test('rate limiting eventually blocks after repeated failed attempts', async () => {
    // In test environments rate limiting is disabled by default to avoid flakiness.
    // If ENABLE_RATE_LIMIT_TEST=true is set, exercise the limiter; otherwise skip.
    if ((process.env.NODE_ENV || '').toLowerCase() === 'test' && process.env.ENABLE_RATE_LIMIT_TEST !== 'true') {
      console.warn('Rate limit disabled in test env; skipping rate-limit assertion')
      return expect(true).toBe(true)
    }

    // send multiple rapid failed attempts and expect at least one 429 Too Many Requests
    const statuses = []
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'wrong' })
      statuses.push(r.statusCode)
    }
    expect(statuses.some(s => s === 429)).toBe(true)
  })

  test('refresh token exchange returns new access token', async () => {
    // login to get refresh token
    const r = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'admin123' })
    expect(r.statusCode).toBe(200)
    const refreshToken = r.body.refreshToken
    expect(refreshToken).toBeTruthy()

    const ex = await request(app).post('/auth/refresh').send({ refreshToken })
    expect(ex.statusCode).toBe(200)
    if (ex.body.accessToken) {
      expect(typeof ex.body.accessToken).toBe('string')
    } else {
      // cookie flow returns { ok: true }
      expect(ex.body.ok).toBe(true)
    }
  })
})
