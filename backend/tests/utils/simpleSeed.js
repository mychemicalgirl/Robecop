require('./testEnv')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

module.exports = async function simpleSeed() {
  const prisma = new PrismaClient()
  try {
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

    const roles = await prisma.role.findMany()
    const supervisor = roles.find(r=>r.name==='Supervisor')
    const employeeRole = roles.find(r=>r.name==='Employee')
    await prisma.employee.upsert({ where: { email: 'alice@example.com' }, update: {}, create: { firstName: 'Alice', lastName: 'Test', email: 'alice@example.com', roleId: supervisor.id } })
    await prisma.employee.upsert({ where: { email: 'bob@example.com' }, update: {}, create: { firstName: 'Bob', lastName: 'Test', email: 'bob@example.com', roleId: employeeRole.id } })

    const adminRole = roles.find(r=>r.name==='Admin')
    const pwd = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { email: 'admin@example.com', name: 'Admin User', password: pwd, roleId: adminRole.id } })
    console.log('Simple seed complete')
  } finally {
    await prisma.$disconnect()
  }
}
