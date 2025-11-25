const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcrypt')

async function main() {
  await prisma.role.createMany({
    data: [
      { name: 'Admin' },
      { name: 'Supervisor' },
      { name: 'Employee' }
    ],
    skipDuplicates: true
  })

  const roles = await prisma.role.findMany()

  // Create sample risks
  const risks = await prisma.risk.createMany({
    data: [
      { name: 'Welding', note: 'High heat and sparks' },
      { name: 'Metal Cutting', note: 'Sharp edges' },
      { name: 'Noise', note: 'High decibel environment' }
    ],
    skipDuplicates: true
  })

  // Sample PPE items
  const ppeData = [
    { name: 'Welding Helmet', sku: 'WH-100', description: 'Auto-darkening helmet', photoUrl: '', manualUrl: '' },
    { name: 'Safety Glasses', sku: 'SG-200', description: 'Anti-scratch glasses', photoUrl: '', manualUrl: '' },
    { name: 'Ear Muffs', sku: 'EM-300', description: 'Noise protection', photoUrl: '', manualUrl: '' }
  ]

  for (const p of ppeData) {
    await prisma.ppeItem.upsert({
      where: { sku: p.sku },
      update: {},
      create: p
    })
  }

  const employees = [
    { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', roleId: roles.find(r=>r.name==='Supervisor').id },
    { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', roleId: roles.find(r=>r.name==='Employee').id }
  ]

  for (const e of employees) {
    await prisma.employee.upsert({
      where: { email: e.email },
      update: {},
      create: e
    })
  }

  // Create stock items for PPE
  const allPPE = await prisma.ppeItem.findMany()
  for (const p of allPPE) {
    await prisma.stockItem.upsert({
      where: { ppeId: p.id },
      update: {},
      create: { ppeId: p.id, quantity: 20, minLevel: 5 }
    })
  }

  console.log('Seeding complete')
}

async function ensureUsers() {
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } })
  const pwd = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { email: 'admin@example.com', name: 'Admin User', password: pwd, roleId: adminRole.id } })
  console.log('Created admin user: admin@example.com / admin123')
}

main()
  .then(() => ensureUsers())
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
