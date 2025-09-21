const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Configure multer for student image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/students';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Validation rules for student
const studentValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('rating')
    .trim()
    .notEmpty()
    .withMessage('Rating is required'),
  body('peakRating')
    .trim()
    .notEmpty()
    .withMessage('Peak rating is required'),
  body('program')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Program must be between 2 and 100 characters'),
  body('achievements')
    .isArray({ min: 1 })
    .withMessage('At least one achievement is required'),
  body('joinDate')
    .trim()
    .notEmpty()
    .withMessage('Join date is required'),
  body('testimonial')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Testimonial is required and must not exceed 1000 characters'),
  body('bio')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Bio is required and must not exceed 500 characters'),
  body('image')
    .optional()
    .trim(),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
];

// @route   GET /api/students
// @desc    Get all active students (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/students - Fetching active students...')
    const students = await Student.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select('-__v');
    
    console.log('GET /api/students - Found students:', students.length)
    console.log('GET /api/students - Students data:', students)

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
});

// @route   GET /api/students/admin
// @desc    Get all students for admin (including inactive)
// @access  Private (Admin only)
router.get('/admin', [auth, adminOnly], async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { program: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    // Execute query with pagination
    const students = await Student.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      count: students.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: students
    });
  } catch (error) {
    console.error('Get admin students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-__v');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get student error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student'
    });
  }
});




// @route   POST /api/students
// @desc    Create new student
// @access  Private (Admin only)
// Middleware to handle FormData arrays
const handleFormDataArrays = (req, res, next) => {
  // Convert achievements[0], achievements[1], etc. back to array
  const achievements = [];
  Object.keys(req.body).forEach(key => {
    const match = key.match(/^achievements\[(\d+)\]$/);
    if (match) {
      const index = parseInt(match[1]);
      achievements[index] = req.body[key];
      delete req.body[key]; // Remove the indexed version
    }
  });
  
  if (achievements.length > 0) {
    req.body.achievements = achievements.filter(item => item !== undefined);
  }
  
  next();
};

router.post('/', [auth, adminOnly, upload.single('image'), handleFormDataArrays, ...studentValidation], async (req, res) => {
  console.log('POST /api/students route hit');
  try {
    console.log('Received student data:', req.body);
    console.log('User creating student:', req.user.email, 'Role:', req.user.role);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        receivedData: req.body
      });
    }

    const studentData = req.body;
    
    // Add image URL if uploaded
    if (req.file) {
      studentData.image = `/uploads/students/${req.file.filename}`;
    }
    
    const student = new Student(studentData);
    console.log('About to save student:', student);
    await student.save();
    console.log('Student saved successfully:', student._id);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    console.error('Create student error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Database validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating student',
      error: error.message
    });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student
// @access  Private (Admin only)
router.put('/:id', [auth, adminOnly, upload.single('image'), handleFormDataArrays, ...studentValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = req.body;
    
    // Add image URL if uploaded
    if (req.file) {
      updateData.image = `/uploads/students/${req.file.filename}`;
      
      // Delete old image if it exists
      const existingStudent = await Student.findById(req.params.id);
      if (existingStudent && existingStudent.image && existingStudent.image.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, '..', existingStudent.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Update student error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Database validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating student',
      error: error.message
    });
  }
});

// @route   PATCH /api/students/:id/toggle-status
// @desc    Toggle student active status
// @access  Private (Admin only)
router.patch('/:id/toggle-status', [auth, adminOnly], async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.isActive = !student.isActive;
    await student.save();

    res.json({
      success: true,
      message: `Student ${student.isActive ? 'activated' : 'deactivated'} successfully`,
      data: student
    });
  } catch (error) {
    console.error('Toggle student status error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating student status'
    });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student
// @access  Private (Admin only)
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting student'
    });
  }
});

// @route   PATCH /api/students/reorder
// @desc    Reorder students
// @access  Private (Admin only)
router.patch('/reorder', [auth, adminOnly], async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs must be an array'
      });
    }

    // Update display order for each student
    const updatePromises = studentIds.map((id, index) =>
      Student.findByIdAndUpdate(id, { displayOrder: index })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Students reordered successfully'
    });
  } catch (error) {
    console.error('Reorder students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reordering students'
    });
  }
});

module.exports = router;