const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', trim: true },
    body: { type: String, required: true, trim: true },

    size: { type: String, required: true, trim: true },

    images: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate reviews by same user for the same product
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Fast pagination and sorting for a product's reviews
ReviewSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);