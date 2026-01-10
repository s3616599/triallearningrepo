const mongoose = require('mongoose');

// --- HELPER: Reuse the Item Schema structure ---
const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    size: { type: Number, required: true },
    color: { type: String, required: true }
});

// --- MAIN ORDER SCHEMA ---
const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // <--- Links to your teammate's User model
        required: true
    },

    items: [OrderItemSchema],

    // Matches the nested structure of your Product schema
    pricing: {
        subtotal: { type: Number, required: true },
        tax:      { type: Number, required: true },
        total:    { type: Number, required: true }
    },

    // Organized Shipping Info
    shipping: {
        firstName: { type: String, required: true },
        lastName:  { type: String, required: true },
        email:     { type: String, required: true },
        phone:     { type: String, required: true },
        address:   { type: String, required: true },
        city:      { type: String, required: true },
        state:     { type: String, required: true },
        zipCode:   { type: String, required: true }
    },

    // Organized Payment Info
    payment: {
        status: { 
            type: String, 
            enum: ['Pending', 'Paid', 'Failed'], 
            default: 'Pending' 
        },
        method: { type: String, default: 'Credit Card' },
        transactionId: { type: String }
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Order', OrderSchema);