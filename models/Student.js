const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  rating: {
    type: String,
    required: [true, 'Rating is required'],
    trim: true
  },
  peakRating: {
    type: String,
    required: [true, 'Peak rating is required'],
    trim: true
  },
  program: {
    type: String,
    required: [true, 'Program is required'],
    trim: true,
    maxlength: [100, 'Program name cannot exceed 100 characters']
  },
  achievements: [{
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Achievement cannot exceed 200 characters']
  }],
  joinDate: {
    type: String,
    required: [true, 'Join date is required'],
    trim: true
  },
  testimonial: {
    type: String,
    required: [true, 'Testimonial is required'],
    trim: true,
    maxlength: [1000, 'Testimonial cannot exceed 1000 characters']
  },
  image: {
    type: String,
    default: '👨‍🎓'
  },
  bio: {
    type: String,
    required: [true, 'Bio is required'],
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for sorting
studentSchema.index({ displayOrder: 1, createdAt: -1 });

module.exports = mongoose.model('Student', studentSchema);