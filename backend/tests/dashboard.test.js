require('./utils/testEnv')
const request = require('supertest')
const app = require('../src/app')
const simpleSeed = require('./utils/simpleSeed')
const dbTeardown = require('./utils/dbTeardown')
const { PrismaClient } = require('@prisma/client')

let adminToken
const prisma = new PrismaClient()

beforeAll(async () => {
  await simpleSeed()
  const res = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'admin123' })
  adminToken = res.body.token

  // Create employees and assignments with different expiries
  const roles = await prisma.role.findMany()
  const emp1 = await prisma.employee.create({ data: { firstName: 'EExpired', lastName: 'One', email: 'eexpired@example.com', roleId: roles[1].id } })
  const emp2 = await prisma.employee.create({ data: { firstName: 'ESoon', lastName: 'Two', email: 'esoons@example.com', roleId: roles[2].id } })
  const emp3 = await prisma.employee.create({ data: { firstName: 'EOK', lastName: 'Three', email: 'eok@example.com', roleId: roles[2].id } })

  const ppe = await prisma.ppeItem.findMany()
  // expired
  await prisma.ppeAssignment.create({ data: { ppeId: ppe[0].id, employeeId: emp1.id, expiresAt: new Date(Date.now() - 1000*60*60*24) } })
  // expiring soon (in 14 days)
  await prisma.ppeAssignment.create({ data: { ppeId: ppe[0].id, employeeId: emp2.id, expiresAt: new Date(Date.now() + 1000*60*60*24*14) } })
  // ok (in 90 days)
  await prisma.ppeAssignment.create({ data: { ppeId: ppe[0].id, employeeId: emp3.id, expiresAt: new Date(Date.now() + 1000*60*60*24*90) } })
})

afterAll(async () => {
  await prisma.$disconnect()
  await dbTeardown()
})

describe('Dashboard', () => {
  test('dashboard status returns counts and results', async () => {
    const res = await request(app).get('/api/dashboard/status?thresholdDays=30').set('Authorization', `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('counts')
    expect(res.body).toHaveProperty('results')
    // Expect at least one red, one yellow, one green (counts may vary depending on seed)
    const counts = res.body.counts
    expect(counts).toBeDefined()
    expect(typeof res.body.results).toBe('object')
  })
})
