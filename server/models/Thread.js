const mongoose = require('mongoose');

// Comment sub-schema (embedded in threads)
const commentSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true // Adds createdAt for comments
});

// Main Thread schema
const threadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 10
  },
  author: {
    type: String,
    required: true
  },
  meta: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  excerpt: {
    type: String
  },
  body: {
    type: String,
    required: true,
    minlength: 20
  },
  image: {
    type: String,
    default: 'img/placeholder.png'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  comments: [commentSchema]
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Thread', threadSchema);
