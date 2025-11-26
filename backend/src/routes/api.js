const express = require('express')
const router = express.Router()
const prisma = require('../prismaClient')
const { verifyToken, requireRole } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

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
router.post('/assign',
  verifyToken,
  requireRole('Admin','Supervisor'),
  body('ppeId').isInt(),
  body('employeeId').isInt(),
  body('expiresAt').optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const { ppeId, employeeId, expiresAt } = req.body
    const assignment = await prisma.ppeAssignment.create({
      data: { ppeId: Number(ppeId), employeeId: Number(employeeId), expiresAt: expiresAt ? new Date(expiresAt) : null }
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
