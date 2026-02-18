const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: false, // Optional for backward compatibility
    minlength: 6
  },
  environment: {
    type: String,
    default: process.env.APP_ENVIRONMENT || 'blue'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ environment: 1 });

module.exports = mongoose.model('User', userSchema);