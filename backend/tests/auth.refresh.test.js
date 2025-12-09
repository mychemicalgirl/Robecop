require('./utils/testEnv')
const request = require('supertest')
const app = require('../src/app')
const simpleSeed = require('./utils/simpleSeed')
const dbTeardown = require('./utils/dbTeardown')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

let adminToken
let adminRefresh

beforeAll(async () => {
  await simpleSeed()
  const res = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'admin123' })
  adminToken = res.body.token || res.body.accessToken
  adminRefresh = res.body.refreshToken
})

afterAll(async () => {
  await prisma.$disconnect()
  await dbTeardown()
})

describe('Refresh token rotation', () => {
  test('login creates DB refresh token', async () => {
    expect(adminRefresh).toBeTruthy()
    const parts = adminRefresh.split('.')
    expect(parts.length).toBe(2)
    const jti = parts[0]
    const rec = await prisma.refreshToken.findUnique({ where: { jti } })
    expect(rec).toBeTruthy()
    expect(rec.revokedAt).toBeNull()
  })

  test('refresh rotates token and new record created', async () => {
    const first = adminRefresh
    const r = await request(app).post('/auth/refresh').send({ refreshToken: first })
    expect(r.statusCode).toBe(200)
    const newRefresh = r.body.refreshToken || (r.headers['set-cookie'] ? null : null)
    // When cookies disabled, body should contain refreshToken
    expect(newRefresh).toBeTruthy()

    const oldJti = first.split('.')[0]
    const newJti = newRefresh.split('.')[0]

    const oldRec = await prisma.refreshToken.findUnique({ where: { jti: oldJti } })
    expect(oldRec.revokedAt).not.toBeNull()
    expect(oldRec.rotatedAt).not.toBeNull()
    expect(oldRec.replacedByJti).toBe(newJti)

    const newRec = await prisma.refreshToken.findUnique({ where: { jti: newJti } })
    expect(newRec).toBeTruthy()

    // reuse old token should fail
    const reuse = await request(app).post('/auth/refresh').send({ refreshToken: first })
    expect(reuse.statusCode).toBe(401)

    // logout new token
    const out = await request(app).post('/auth/logout').send({ refreshToken: newRefresh })
    expect([200,204]).toContain(out.statusCode)
    const after = await prisma.refreshToken.findUnique({ where: { jti: newJti } })
    expect(after.revokedAt).not.toBeNull()
  })
})
