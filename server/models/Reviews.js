const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', trim: true },
    body: { type: String, required: true, trim: true },

    // Denormalized reviewer name for easy display
    name: { type: String, default: '', trim: true },

    size: { type: String, required: true, trim: true },

    images: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

// Optional: Add index for faster queries by product
// ReviewSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
