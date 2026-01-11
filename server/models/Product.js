const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Category is useful for filters too
    category: { type: String, default: 'General' }, 

    // --- ADDED THESE 3 FIELDS FOR YOUR FILTERS TO WORK ---
    color: { type: String, default: 'black' },
    sizes: { type: [Number], default: [39, 40, 41, 42] },

    pricing: {
      price: { type: Number, required: true, min: 0 },
      oldPrice: { type: Number, min: 0 }
    },

    images: { type: [String], default: [] },

    // Pre-computed aggregates for fast rendering on product pages.
    // Keep these in sync whenever reviews are created/updated/deleted.
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
      breakdown: {
        five: { type: Number, default: 0, min: 0 },
        four: { type: Number, default: 0, min: 0 },
        three: { type: Number, default: 0, min: 0 },
        two: { type: Number, default: 0, min: 0 },
        one: { type: Number, default: 0, min: 0 }
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', ProductSchema);