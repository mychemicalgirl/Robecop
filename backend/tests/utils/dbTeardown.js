const { PrismaClient } = require('@prisma/client')

module.exports = async function teardown() {
  const prisma = new PrismaClient()
  try {
    // Truncate key tables to keep test DB clean
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "PpeAssignment" RESTART IDENTITY CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "PpeItem" RESTART IDENTITY CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Employee" RESTART IDENTITY CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" RESTART IDENTITY CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Role" RESTART IDENTITY CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Risk" RESTART IDENTITY CASCADE')
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "RecommendedPpe" RESTART IDENTITY CASCADE')
    console.log('Test DB truncated')
  } finally {
    await prisma.$disconnect()
  }
}
