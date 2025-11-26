const { spawnSync } = require('child_process')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
// Load test env
require('./testEnv')

async function main() {
  // Ensure env loaded by testEnv.js before calling
  console.log('Running prisma migrate deploy against', process.env.DATABASE_URL)
  // run migrations using spawnSync (avoid shell)
  // Use npm exec to invoke local prisma binary (avoid requiring npx binary)
  const res = spawnSync('npm', ['exec', '--', 'prisma', 'migrate', 'deploy'], { stdio: 'inherit', cwd: path.resolve(process.cwd(), 'backend') })
  if (res.error) throw res.error
  if (res.status && res.status !== 0) throw new Error('prisma migrate deploy failed')

  const prisma = new PrismaClient()
  try {
    // minimal seed for tests: roles, risks, ppe, employees, admin user
    await prisma.role.createMany({ data: [{ name: 'Admin' }, { name: 'Supervisor' }, { name: 'Employee' }], skipDuplicates: true })
    await prisma.risk.createMany({ data: [{ name: 'Welding' }, { name: 'Noise' }, { name: 'Metal Cutting' }], skipDuplicates: true })

    const ppeItems = [
      { name: 'Welding Helmet', sku: 'WH-100' },
      { name: 'Safety Glasses', sku: 'SG-200' },
      { name: 'Ear Muffs', sku: 'EM-300' }
    ]
    for (const p of ppeItems) {
      await prisma.ppeItem.upsert({ where: { sku: p.sku }, update: {}, create: p })
    }

    // employees
    const roles = await prisma.role.findMany()
    const supervisor = roles.find(r=>r.name==='Supervisor')
    const employeeRole = roles.find(r=>r.name==='Employee')
    await prisma.employee.upsert({ where: { email: 'alice@example.com' }, update: {}, create: { firstName: 'Alice', lastName: 'Test', email: 'alice@example.com', roleId: supervisor.id } })
    await prisma.employee.upsert({ where: { email: 'bob@example.com' }, update: {}, create: { firstName: 'Bob', lastName: 'Test', email: 'bob@example.com', roleId: employeeRole.id } })

    // admin user
    const adminRole = roles.find(r=>r.name==='Admin')
    const pwd = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { email: 'admin@example.com', name: 'Admin User', password: pwd, roleId: adminRole.id } })

    console.log('Test DB seeded')
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1) })
}

module.exports = main
