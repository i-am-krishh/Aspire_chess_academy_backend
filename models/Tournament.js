const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: [150, 'Tournament name cannot exceed 150 characters']
  },
  date: {
    type: Date,
    required: [true, 'Tournament date is required']
  },
  time: {
    type: String,
    required: [true, 'Tournament time is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  entryFee: {
    type: String,
    required: [true, 'Entry fee is required'],
    trim: true
  },
  prizePool: {
    type: String,
    required: [true, 'Prize pool is required'],
    trim: true
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Maximum participants is required'],
    min: [1, 'Maximum participants must be at least 1']
  },
  currentParticipants: {
    type: Number,
    default: 0,
    min: [0, 'Current participants cannot be negative']
  },
  format: {
    type: String,
    required: [true, 'Tournament format is required'],
    trim: true,
    maxlength: [100, 'Format cannot exceed 100 characters']
  },
  timeControl: {
    type: String,
    required: [true, 'Time control is required'],
    trim: true,
    maxlength: [100, 'Time control cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Open Tournament', 'Youth (Under 18)', 'Online Blitz', 'Rapid', 'Classical', 'Blitz'],
    trim: true
  },
  registrationLink: {
    type: String,
    required: [true, 'Registration link is required'],
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL']
  },
  poster: {
    type: String,
    default: '🏆'
  },
  posterImage: {
    type: String, // URL to uploaded poster image
    default: null
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  listUntil: {
    type: Date,
    required: [true, 'List until date is required']
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For completed tournaments
  winner: {
    type: String,
    trim: true,
    default: null
  },
  finalParticipants: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
tournamentSchema.index({ date: 1, status: 1 });
tournamentSchema.index({ listUntil: 1, isActive: 1 });

// Virtual to check if tournament is expired
tournamentSchema.virtual('isExpired').get(function() {
  return new Date() > this.listUntil;
});

// Method to update status based on dates
tournamentSchema.methods.updateStatus = function() {
  const now = new Date();
  const tournamentDate = new Date(this.date);
  
  if (now > tournamentDate) {
    this.status = 'completed';
  } else if (now.toDateString() === tournamentDate.toDateString()) {
    this.status = 'ongoing';
  } else {
    this.status = 'upcoming';
  }
  
  return this.save();
};

module.exports = mongoose.model('Tournament', tournamentSchema);