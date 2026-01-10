const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', 
        required: true
    },
    name: { type: String, required: true },
    
    // We store ONE image string here (e.g., product.images[0])
    image: { type: String, required: true }, 

    // Snapshot of price at time of adding to cart
    price: { type: Number, required: true },

    quantity: { type: Number, required: true, min: 1 },
    size: { type: Number, required: true }, 
    color: { type: String, required: true } 
});

// --- MAIN CART SCHEMA ---
const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
        unique: true 
    },
    
    items: [CartItemSchema],

    // Structure matches the Product schema's "pricing" object style
    pricing: {
        subtotal: { type: Number, default: 0 },
        tax:      { type: Number, default: 0 },
        total:    { type: Number, default: 0 }
    }
}, { 
    timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('Cart', CartSchema);