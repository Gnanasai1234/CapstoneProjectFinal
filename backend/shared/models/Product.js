const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  environment: {
    type: String,
    default: process.env.APP_ENVIRONMENT || 'blue'
  },
  inStock: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes
productSchema.index({ name: 1 });
productSchema.index({ environment: 1, inStock: 1 });

module.exports = mongoose.model('Product', productSchema);