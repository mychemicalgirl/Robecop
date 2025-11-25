const express = require('express')
const router = express.Router()
const prisma = require('../prismaClient')
const { verifyToken, requireRole } = require('../middleware/auth')

// --- Employees ---
router.get('/employees', verifyToken, async (req, res) => {
  const list = await prisma.employee.findMany({ include: { role: true, assignments: true } })
  res.json(list)
})

router.post('/employees', verifyToken, requireRole('Admin','Supervisor'), async (req, res) => {
  const { firstName, lastName, email, phone, roleId } = req.body
  const employee = await prisma.employee.create({ data: { firstName, lastName, email, phone, roleId } })
  res.json(employee)
})

// --- Roles & Risks ---
router.get('/roles', verifyToken, async (req, res) => {
  res.json(await prisma.role.findMany())
})

router.get('/risks', verifyToken, async (req, res) => {
  res.json(await prisma.risk.findMany())
})

// --- PPE ---
router.get('/ppe', verifyToken, async (req, res) => {
  const items = await prisma.ppeItem.findMany({ include: { stock: true, assignments: true } })
  res.json(items)
})

router.post('/ppe', verifyToken, requireRole('Admin'), async (req, res) => {
  const data = req.body
  const created = await prisma.ppeItem.create({ data })
  res.json(created)
})

// --- Stock ---
router.get('/stock', verifyToken, async (req, res) => {
  const items = await prisma.stockItem.findMany({ include: { ppe: true } })
  res.json(items)
})

// --- Assign PPE to employee ---
router.post('/assign', verifyToken, requireRole('Admin','Supervisor'), async (req, res) => {
  const { ppeId, employeeId, expiresAt } = req.body
  const assignment = await prisma.ppeAssignment.create({
    data: { ppeId, employeeId, expiresAt: expiresAt ? new Date(expiresAt) : null }
  })
  res.json(assignment)
})

// --- Reports (simple summary) ---
router.get('/reports/summary', verifyToken, requireRole('Admin','Supervisor'), async (req, res) => {
  const totalEmployees = await prisma.employee.count()
  const totalPpe = await prisma.ppeItem.count()
  const expiringSoon = await prisma.ppeAssignment.count({ where: { expiresAt: { lte: new Date(Date.now() + 1000*60*60*24*30) } } })
  res.json({ totalEmployees, totalPpe, expiringSoon })
})

module.exports = router
