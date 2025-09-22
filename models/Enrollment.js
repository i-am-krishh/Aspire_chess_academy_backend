const mongoose = require('mongoose')

const enrollmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  branch: {
    type: String,
    required: [true, 'Branch selection is required'],
    enum: ['Kalamboli', 'Kamothe', 'Roadpali'],
    default: 'Kalamboli'
  },
  age: {
    type: Number,
    min: [4, 'Age must be at least 4 years'],
    max: [100, 'Age cannot be more than 100 years']
  },
  experience: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  contacted: {
    type: Boolean,
    default: false
  },
  contactedAt: {
    type: Date
  },
  contactedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'enrolled', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Index for faster queries
enrollmentSchema.index({ email: 1 })
enrollmentSchema.index({ createdAt: -1 })
enrollmentSchema.index({ contacted: 1 })
enrollmentSchema.index({ status: 1 })

// Virtual for getting enrollment age in days
enrollmentSchema.virtual('enrollmentAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

// Pre-save middleware to set contactedAt when contacted status changes
enrollmentSchema.pre('save', function(next) {
  if (this.isModified('contacted') && this.contacted && !this.contactedAt) {
    this.contactedAt = new Date()
  }
  next()
})

// Static method to get uncontacted count
enrollmentSchema.statics.getUncontactedCount = function() {
  return this.countDocuments({ contacted: false, isActive: true })
}

// Static method to get enrollment statistics
enrollmentSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        contacted: {
          $sum: {
            $cond: [{ $eq: ['$contacted', true] }, 1, 0]
          }
        },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$contacted', false] }, 1, 0]
          }
        },
        byBranch: {
          $push: {
            branch: '$branch',
            contacted: '$contacted'
          }
        }
      }
    }
  ])
}

module.exports = mongoose.model('Enrollment', enrollmentSchema)