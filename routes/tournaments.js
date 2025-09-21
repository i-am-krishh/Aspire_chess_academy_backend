const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const Tournament = require('../models/Tournament');
const { auth, adminOnly } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Validation rules for tournament
const tournamentValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('Tournament name is required and must not exceed 150 characters'),
  body('date')
    .notEmpty()
    .withMessage('Date is required'),
  body('time')
    .trim()
    .notEmpty()
    .withMessage('Time is required'),
  body('location')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location is required and must not exceed 200 characters'),
  body('address')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Address is required and must not exceed 300 characters'),
  body('entryFee')
    .trim()
    .notEmpty()
    .withMessage('Entry fee is required'),
  body('prizePool')
    .trim()
    .notEmpty()
    .withMessage('Prize pool is required'),
  body('maxParticipants')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maximum participants must be between 1 and 1000'),
  body('format')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Format is required and must not exceed 100 characters'),
  body('timeControl')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Time control is required and must not exceed 100 characters'),
  body('category')
    .isIn(['Open Tournament', 'Youth (Under 18)', 'Online Blitz', 'Rapid', 'Classical', 'Blitz'])
    .withMessage('Please select a valid category'),
  body('registrationLink')
    .trim()
    .notEmpty()
    .withMessage('Registration link is required'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description is required and must not exceed 1000 characters'),
  body('listUntil')
    .notEmpty()
    .withMessage('List until date is required'),
  body('currentParticipants')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current participants must be a non-negative integer')
];

// @route   GET /api/tournaments
// @desc    Get active tournaments (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/tournaments - Fetching upcoming tournaments...')
    const now = new Date();
    
    // Get upcoming tournaments that are still listed
    const tournaments = await Tournament.find({
      isActive: true,
      listUntil: { $gte: now },
      status: { $in: ['upcoming', 'ongoing'] }
    })
    .sort({ date: 1 })
    .select('-__v');
    
    console.log('GET /api/tournaments - Found tournaments:', tournaments.length)
    console.log('GET /api/tournaments - Tournaments data:', tournaments)

    // Update tournament statuses
    for (let tournament of tournaments) {
      await tournament.updateStatus();
    }

    res.json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching tournaments' 
    });
  }
});

// @route   GET /api/tournaments/past
// @desc    Get past tournaments (public)
// @access  Public
router.get('/past', async (req, res) => {
  try {
    console.log('GET /api/tournaments/past - Fetching past tournaments...')
    const { limit = 6 } = req.query;
    
    const tournaments = await Tournament.find({
      isActive: true,
      status: 'completed',
      winner: { $ne: null }
    })
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .select('name date winner finalParticipants prizePool -_id');
    
    console.log('GET /api/tournaments/past - Found tournaments:', tournaments.length)
    console.log('GET /api/tournaments/past - Tournaments data:', tournaments)

    res.json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    console.error('Get past tournaments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching past tournaments' 
    });
  }
});

// @route   GET /api/tournaments/admin
// @desc    Get all tournaments for admin
// @access  Private (Admin only)
router.get('/admin', [auth, adminOnly], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      category = 'all'
    } = req.query;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else {
        query.status = status;
      }
    }
    
    if (category !== 'all') {
      query.category = category;
    }

    // Execute query with pagination
    const tournaments = await Tournament.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Tournament.countDocuments(query);

    res.json({
      success: true,
      count: tournaments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: tournaments
    });
  } catch (error) {
    console.error('Get admin tournaments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching tournaments' 
    });
  }
});

// @route   GET /api/tournaments/:id
// @desc    Get single tournament
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).select('-__v');
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    // Update status
    await tournament.updateStatus();

    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tournament ID' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching tournament' 
    });
  }
});



// @route   POST /api/tournaments
// @desc    Create new tournament
// @access  Private (Admin only)
router.post('/', [auth, adminOnly, upload.single('posterImage'), ...tournamentValidation], async (req, res) => {
  console.log('POST /api/tournaments route hit');
  console.log('Received tournament data:', req.body);
  console.log('User creating tournament:', req.user.email, 'Role:', req.user.role);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tournamentData = req.body;
    let cloudinaryResult = null;
    
    // Upload poster image to Cloudinary if uploaded
    if (req.file) {
      console.log('Uploading poster to Cloudinary...');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const publicId = `poster-${uniqueSuffix}`;
      
      try {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'posters', publicId);
        tournamentData.posterImage = cloudinaryResult.secure_url;
        console.log('Poster uploaded to Cloudinary:', cloudinaryResult.secure_url);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload poster to cloud storage'
        });
      }
    }

    console.log('About to save tournament:', tournamentData);
    const tournament = new Tournament(tournamentData);
    await tournament.save();
    console.log('Tournament saved successfully:', tournament._id);

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: tournament
    });
  } catch (error) {
    // Clean up Cloudinary image if there was an error
    if (cloudinaryResult) {
      try {
        await deleteFromCloudinary(cloudinaryResult.public_id);
        console.log('Cleaned up Cloudinary poster after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup Cloudinary poster:', cleanupError);
      }
    }
    console.error('Create tournament error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating tournament' 
    });
  }
});

// @route   PUT /api/tournaments/:id
// @desc    Update tournament
// @access  Private (Admin only)
router.put('/:id', [auth, adminOnly, upload.single('posterImage'), ...tournamentValidation], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    const updateData = req.body;
    let cloudinaryResult = null;
    let oldImagePublicId = null;
    
    // Handle poster image update
    if (req.file) {
      console.log('Uploading new poster to Cloudinary...');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const publicId = `poster-${uniqueSuffix}`;
      
      try {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'posters', publicId);
        updateData.posterImage = cloudinaryResult.secure_url;
        console.log('New poster uploaded to Cloudinary:', cloudinaryResult.secure_url);
        
        // Extract old image public ID for cleanup
        if (tournament.posterImage) {
          oldImagePublicId = extractPublicId(tournament.posterImage);
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload poster to cloud storage'
        });
      }
    }

    Object.assign(tournament, updateData);
    await tournament.save();

    // Clean up old image from Cloudinary after successful update
    if (oldImagePublicId && cloudinaryResult) {
      try {
        await deleteFromCloudinary(oldImagePublicId);
        console.log('Old poster deleted from Cloudinary');
      } catch (deleteError) {
        console.error('Failed to delete old poster from Cloudinary:', deleteError);
        // Don't fail the request for cleanup errors
      }
    }

    res.json({
      success: true,
      message: 'Tournament updated successfully',
      data: tournament
    });
  } catch (error) {
    // Clean up new Cloudinary image if there was an error
    if (cloudinaryResult) {
      try {
        await deleteFromCloudinary(cloudinaryResult.public_id);
        console.log('Cleaned up new Cloudinary poster after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup new Cloudinary poster:', cleanupError);
      }
    }
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Update tournament error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tournament ID' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating tournament' 
    });
  }
});

// @route   PATCH /api/tournaments/:id/participants
// @desc    Update participant count
// @access  Private (Admin only)
router.patch('/:id/participants', [auth, adminOnly], async (req, res) => {
  try {
    const { currentParticipants } = req.body;
    
    if (typeof currentParticipants !== 'number' || currentParticipants < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current participants must be a non-negative number'
      });
    }

    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    if (currentParticipants > tournament.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Current participants cannot exceed maximum participants'
      });
    }

    tournament.currentParticipants = currentParticipants;
    await tournament.save();

    res.json({
      success: true,
      message: 'Participant count updated successfully',
      data: tournament
    });
  } catch (error) {
    console.error('Update participants error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tournament ID' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating participants' 
    });
  }
});

// @route   PATCH /api/tournaments/:id/complete
// @desc    Mark tournament as completed with winner
// @access  Private (Admin only)
router.patch('/:id/complete', [auth, adminOnly], async (req, res) => {
  try {
    const { winner, finalParticipants } = req.body;
    
    if (!winner || !winner.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Winner name is required'
      });
    }

    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    tournament.status = 'completed';
    tournament.winner = winner.trim();
    tournament.finalParticipants = finalParticipants || tournament.currentParticipants;
    
    await tournament.save();

    res.json({
      success: true,
      message: 'Tournament marked as completed',
      data: tournament
    });
  } catch (error) {
    console.error('Complete tournament error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tournament ID' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while completing tournament' 
    });
  }
});

// @route   PATCH /api/tournaments/:id/toggle-status
// @desc    Toggle tournament active status
// @access  Private (Admin only)
router.patch('/:id/toggle-status', [auth, adminOnly], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    tournament.isActive = !tournament.isActive;
    await tournament.save();

    res.json({
      success: true,
      message: `Tournament ${tournament.isActive ? 'activated' : 'deactivated'} successfully`,
      data: tournament
    });
  } catch (error) {
    console.error('Toggle tournament status error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tournament ID' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating tournament status' 
    });
  }
});

// @route   DELETE /api/tournaments/:id
// @desc    Delete tournament
// @access  Private (Admin only)
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tournament not found' 
      });
    }

    // Delete poster image from Cloudinary if exists
    if (tournament.posterImage) {
      const publicId = extractPublicId(tournament.posterImage);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
          console.log('Tournament poster deleted from Cloudinary');
        } catch (deleteError) {
          console.error('Failed to delete poster from Cloudinary:', deleteError);
          // Don't fail the request for cleanup errors
        }
      }
    }

    await Tournament.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    console.error('Delete tournament error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tournament ID' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting tournament' 
    });
  }
});

module.exports = router;