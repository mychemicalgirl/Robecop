const express = require('express')
const router = express.Router()
const prisma = require('../prismaClient')
const { verifyToken, requireRole } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { param, query } = require('express-validator')

// Multer configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ppeId = req.params.id
    const dir = path.join(__dirname, '..', 'uploads', 'ppe', String(ppeId))
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`
    cb(null, name)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'))
    }
    cb(null, true)
  }
})

// --- Employees ---
router.get('/employees', verifyToken, async (req, res) => {
  const list = await prisma.employee.findMany({ include: { role: true, assignments: true } })
  res.json(list)
})

router.post('/employees',
  verifyToken,
  requireRole('Admin','Supervisor'),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
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

router.post('/ppe',
  verifyToken,
  requireRole('Admin'),
  body('name').notEmpty(),
  body('description').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const data = req.body
    const created = await prisma.ppeItem.create({ data })
    res.json(created)
  })

// Upload endpoint: POST /api/ppe/:id/upload
router.post('/ppe/:id/upload', verifyToken, requireRole('Admin','Supervisor'), upload.single('file'), async (req, res) => {
  try {
    const ppeId = req.params.id
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const fileUrl = `/uploads/ppe/${ppeId}/${req.file.filename}`
    // Optionally: update ppeItem fields (photo/manual) based on mimetype
    const mimetype = req.file.mimetype
    if (mimetype.startsWith('image/')) {
      await prisma.ppeItem.update({ where: { id: Number(ppeId) }, data: { photoUrl: fileUrl } }).catch(()=>{})
    } else if (mimetype === 'application/pdf') {
      await prisma.ppeItem.update({ where: { id: Number(ppeId) }, data: { manualUrl: fileUrl } }).catch(()=>{})
    }
    res.json({
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl
    })
  } catch (err) {
    console.error('upload error', err)
    res.status(500).json({ error: err.message || 'Upload failed' })
  }
})

// List uploaded files for a PPE item
router.get('/ppe/:id/files', verifyToken, async (req, res) => {
  const ppeId = req.params.id
  const dir = path.join(__dirname, '..', 'uploads', 'ppe', String(ppeId))
  try {
    if (!fs.existsSync(dir)) return res.json([])
    const files = fs.readdirSync(dir).map(name => {
      const stat = fs.statSync(path.join(dir, name))
      const mime = name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image'
      return { name, size: stat.size, url: `/uploads/ppe/${ppeId}/${name}`, mimetype: mime }
    })
    res.json(files)
  } catch (err) {
    console.error('list files error', err)
    res.status(500).json({ error: 'Could not list files' })
  }
})

// --- Stock ---
router.get('/stock', verifyToken, async (req, res) => {
  const items = await prisma.stockItem.findMany({ include: { ppe: true } })
  res.json(items)
})

// --- Assign PPE to employee ---
// Accept either single ppeId or array of ppeIds for bulk assignment
router.post('/assign',
  verifyToken,
  requireRole('Admin','Supervisor'),
  body('employeeId').isInt(),
  body('ppeIds').optional().isArray(),
  body('ppeId').optional().isInt(),
  body('expiresAt').optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const { ppeIds, ppeId, employeeId, expiresAt } = req.body
    const ids = ppeIds && ppeIds.length ? ppeIds.map(Number) : (ppeId ? [Number(ppeId)] : [])
    if (!ids.length) return res.status(400).json({ error: 'No PPE ids provided' })
    const created = []
    for (const id of ids) {
      const a = await prisma.ppeAssignment.create({ data: { ppeId: id, employeeId: Number(employeeId), expiresAt: expiresAt ? new Date(expiresAt) : null } })
      created.push(a)
    }
    res.json(created)
  })

// Remove an assignment by id or by employeeId + ppeId
router.delete('/assign',
  verifyToken,
  requireRole('Admin','Supervisor'),
  query('id').optional().isInt(),
  async (req, res) => {
    try {
      const id = req.query.id ? Number(req.query.id) : null
      if (id) {
        await prisma.ppeAssignment.delete({ where: { id } })
        return res.json({ deleted: id })
      }
      const { employeeId, ppeId } = req.body
      if (employeeId && ppeId) {
        const ass = await prisma.ppeAssignment.findFirst({ where: { employeeId: Number(employeeId), ppeId: Number(ppeId) } })
        if (!ass) return res.status(404).json({ error: 'Assignment not found' })
        await prisma.ppeAssignment.delete({ where: { id: ass.id } })
        return res.json({ deleted: ass.id })
      }
      return res.status(400).json({ error: 'Provide id or (employeeId and ppeId)' })
    } catch (err) {
      console.error('delete assign error', err)
      res.status(500).json({ error: 'Could not delete assignment' })
    }
  })

// --- Suggestions: recommended PPE for a role ---
router.get('/suggestions/for-role/:roleId',
  verifyToken,
  requireRole('Admin','Supervisor'),
  param('roleId').isInt(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const roleId = Number(req.params.roleId)
    const recs = await prisma.recommendedPpe.findMany({ where: { roleId }, include: { ppe: true, risk: true } })
    const unique = {}
    for (const r of recs) {
      if (!unique[r.ppe.id]) unique[r.ppe.id] = { id: r.ppe.id, name: r.ppe.name, sku: r.ppe.sku, risk: r.risk.name }
    }
    res.json(Object.values(unique))
  })

// --- Dashboard statuses: traffic-light per employee ---
router.get('/dashboard/status',
  verifyToken,
  requireRole('Admin','Supervisor'),
  query('thresholdDays').optional().isInt(),
  query('roleId').optional().isInt(),
  query('riskId').optional().isInt(),
  async (req, res) => {
    try {
      const thresholdDays = req.query.thresholdDays ? Number(req.query.thresholdDays) : Number(process.env.EXPIRY_THRESHOLD_DAYS || 30)
      const roleId = req.query.roleId ? Number(req.query.roleId) : null
      const riskId = req.query.riskId ? Number(req.query.riskId) : null
      const now = new Date()
      const soon = new Date(Date.now() + thresholdDays * 24 * 60 * 60 * 1000)

      const employeeWhere = roleId ? { where: { roleId } } : {}
      const employees = await prisma.employee.findMany({ include: { role: true }, ...(employeeWhere) })

      const results = []
      for (const emp of employees) {
        const assignments = await prisma.ppeAssignment.findMany({ where: { employeeId: emp.id } , include: { ppe: true}})
        const assignedIds = assignments.map(a => a.ppeId)
        let status = 'green'
        let nearestExpires = null
        let hasExpired = false
        let hasExpiringSoon = false
        for (const a of assignments) {
          if (a.expiresAt) {
            const e = new Date(a.expiresAt)
            if (e < now) hasExpired = true
            else if (e <= soon) hasExpiringSoon = true
            if (!nearestExpires || e < nearestExpires) nearestExpires = e
          }
        }
        // recommended PPE for role
        const recs = await prisma.recommendedPpe.findMany({ where: { roleId: emp.roleId }, include: { ppe: true } })
        const recIds = recs.map(r => r.ppeId)
        const missing = recIds.filter(id => !assignedIds.includes(id))

        if (hasExpired || missing.length > 0) status = 'red'
        else if (hasExpiringSoon) status = 'yellow'

        // Optionally filter by riskId: only include employees with recommendedPpe including that risk
        if (riskId) {
          const rr = await prisma.recommendedPpe.findFirst({ where: { roleId: emp.roleId, riskId } })
          if (!rr) continue
        }

        results.push({ employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, role: emp.role.name }, status, assigned: assignments.map(a=>({ id: a.id, ppeId: a.ppeId, name: a.ppe.name, expiresAt: a.expiresAt })), recommended: recs.map(r=>({ ppeId: r.ppeId, name: r.ppe.name })) , nearestExpires })
      }

      const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
      res.json({ counts, results })
    } catch (err) {
      console.error('dashboard status error', err)
      res.status(500).json({ error: 'Could not compute dashboard status' })
    }
  })

// --- Reports (simple summary) ---
router.get('/reports/summary', verifyToken, requireRole('Admin','Supervisor'), async (req, res) => {
  const totalEmployees = await prisma.employee.count()
  const totalPpe = await prisma.ppeItem.count()
  const expiringSoon = await prisma.ppeAssignment.count({ where: { expiresAt: { lte: new Date(Date.now() + 1000*60*60*24*30) } } })
  res.json({ totalEmployees, totalPpe, expiringSoon })
})

module.exports = router
