require('./utils/testEnv')
const request = require('supertest')
const app = require('../src/app')
const simpleSeed = require('./utils/simpleSeed')
const dbTeardown = require('./utils/dbTeardown')

let adminToken
let employeeId
let ppeIds = []

beforeAll(async () => {
  await simpleSeed()
  const res = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'admin123' })
  adminToken = res.body.token
  const emp = await request(app).get('/api/employees').set('Authorization', `Bearer ${adminToken}`)
  employeeId = emp.body[0].id
  const ppe = await request(app).get('/api/ppe').set('Authorization', `Bearer ${adminToken}`)
  ppeIds = ppe.body.map(x=>x.id).slice(0,2)
})

afterAll(async () => {
  await dbTeardown()
})

describe('Assign', () => {
  test('bulk assign creates assignments', async () => {
    const res = await request(app).post('/api/assign').set('Authorization', `Bearer ${adminToken}`).send({ employeeId, ppeIds, expiresAt: '2026-12-31' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(ppeIds.length)
  })

  test('delete assignment by id', async () => {
    const all = await request(app).get('/api/ppe').set('Authorization', `Bearer ${adminToken}`)
    // find an assignment id
    const assignments = await request(app).get('/api/dashboard/status').set('Authorization', `Bearer ${adminToken}`)
    // pick first created assignment id via /api/assign results earlier
    const list = assignments.body.results.flatMap(r => r.assigned)
    if (!list.length) return
    const id = list[0].id
    const del = await request(app).delete(`/api/assign?id=${id}`).set('Authorization', `Bearer ${adminToken}`)
    expect([200,204]).toContain(del.statusCode)
  })
})
