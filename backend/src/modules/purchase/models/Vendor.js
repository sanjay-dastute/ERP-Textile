/**
 * Copyright - Dastute Switcher Technologies 
 * Author - SANJAY KR, DHILISH
 */
const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a vendor name'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Please add a vendor code'],
        unique: true,
        trim: true,
        uppercase: true
    },
    contactPerson: {
        name: String,
        email: String,
        phone: String
    },
    address: {
        type: String
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        moq: {
            type: Number,
            default: 1,
            min: 1
        },
        pricingTiers: {
            type: [{
                minQuantity: { type: Number, required: true },
                price: { type: Number, required: true }
            }],
            default: []
        }
    }],
    ratings: {
        quality: { type: Number, min: 0, max: 10, default: 0 },
        delivery: { type: Number, min: 0, max: 10, default: 0 },
        cost: { type: Number, min: 0, max: 10, default: 0 },
        overall: { type: Number, min: 0, max: 10, default: 0 }
    },
    paymentTerms: {
        discountPercent: { type: Number, default: 0 }, // e.g., 2 for 2%
        discountDays: { type: Number, default: 0 },    // e.g., 10 days
        netDays: { type: Number, default: 30 }         // e.g., 30 days
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Blacklisted'],
        default: 'Active'
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

// Calculate overall rating before saving
vendorSchema.pre('save', async function () {
    if (this.isModified('ratings')) {
        const { quality, delivery, cost } = this.ratings;
        // Simple average or weighted? Let's do simple average for now.
        // Avoid division by zero if all are 0
        if (quality || delivery || cost) {
            this.ratings.overall = Math.round(((quality + delivery + cost) / 3) * 10) / 10;
        }
    }
});

vendorSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Vendor', vendorSchema);
