const express = require('express')
const router = express.Router()
const Enrollment = require('../models/Enrollment')
const { auth, adminOnly } = require('../middleware/auth')

// @desc    Create new enrollment inquiry
// @route   POST /api/enrollments
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, branch, age, experience, message } = req.body

    // Check if enrollment with same email already exists within last 30 days
    const existingEnrollment = await Enrollment.findOne({
      email: email.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      isActive: true
    })

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'An enrollment inquiry with this email already exists within the last 30 days'
      })
    }

    const enrollment = await Enrollment.create({
      name,
      email,
      phone,
      branch,
      age,
      experience,
      message
    })

    res.status(201).json({
      success: true,
      message: 'Enrollment inquiry submitted successfully! We will contact you soon.',
      data: {
        id: enrollment._id,
        name: enrollment.name,
        email: enrollment.email,
        branch: enrollment.branch
      }
    })
  } catch (error) {
    console.error('Error creating enrollment:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      })
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    })
  }
})

// @desc    Get enrollment statistics
// @route   GET /api/enrollments/admin/stats
// @access  Private/Admin
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const stats = await Enrollment.getStats()
    const uncontactedCount = await Enrollment.getUncontactedCount()

    res.json({
      success: true,
      data: {
        ...stats[0],
        uncontactedCount
      }
    })
  } catch (error) {
    console.error('Error fetching enrollment stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    })
  }
})

// @desc    Get all enrollment inquiries for admin
// @route   GET /api/enrollments/admin
// @access  Private/Admin
router.get('/admin', auth, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      contacted = 'all',
      status = 'all',
      branch = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build query
    const query = { isActive: true }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    // Contacted filter
    if (contacted !== 'all') {
      query.contacted = contacted === 'true'
    }

    // Status filter
    if (status !== 'all') {
      query.status = status
    }

    // Branch filter
    if (branch !== 'all') {
      query.branch = branch
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [enrollments, total, stats] = await Promise.all([
      Enrollment.find(query)
        .populate('contactedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Enrollment.countDocuments(query),
      Enrollment.getStats()
    ])

    // Get uncontacted count for badge
    const uncontactedCount = await Enrollment.getUncontactedCount()

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: skip + enrollments.length < total,
        hasPrev: parseInt(page) > 1
      },
      stats: stats[0] || { total: 0, contacted: 0, pending: 0 },
      uncontactedCount
    })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollment inquiries'
    })
  }
})

// @desc    Get single enrollment inquiry
// @route   GET /api/enrollments/:id
// @access  Private/Admin
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('contactedBy', 'name email')

    if (!enrollment || !enrollment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment inquiry not found'
      })
    }

    res.json({
      success: true,
      data: enrollment
    })
  } catch (error) {
    console.error('Error fetching enrollment:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollment inquiry'
    })
  }
})

// @desc    Update enrollment status
// @route   PATCH /api/enrollments/:id/status
// @access  Private/Admin
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status, notes } = req.body
    const validStatuses = ['pending', 'contacted', 'enrolled', 'rejected']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      })
    }

    const updateData = { status }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('contactedBy', 'name email')

    if (!enrollment || !enrollment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment inquiry not found'
      })
    }

    res.json({
      success: true,
      message: 'Enrollment status updated successfully',
      data: enrollment
    })
  } catch (error) {
    console.error('Error updating enrollment status:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating enrollment status'
    })
  }
})

// @desc    Mark enrollment as contacted
// @route   PATCH /api/enrollments/:id/contact
// @access  Private/Admin
router.patch('/:id/contact', auth, adminOnly, async (req, res) => {
  try {
    const { notes } = req.body

    const updateData = {
      contacted: true,
      contactedAt: new Date(),
      contactedBy: req.user._id,
      status: 'contacted'
    }

    if (notes) {
      updateData.notes = notes
    }

    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('contactedBy', 'name email')

    if (!enrollment || !enrollment.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment inquiry not found'
      })
    }

    res.json({
      success: true,
      message: 'Enrollment marked as contacted',
      data: enrollment
    })
  } catch (error) {
    console.error('Error marking enrollment as contacted:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating enrollment'
    })
  }
})

// @desc    Delete enrollment inquiry
// @route   DELETE /api/enrollments/:id
// @access  Private/Admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment inquiry not found'
      })
    }

    res.json({
      success: true,
      message: 'Enrollment inquiry deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting enrollment inquiry'
    })
  }
})

module.exports = router