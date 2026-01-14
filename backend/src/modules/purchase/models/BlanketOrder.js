/**
 * Copyright - Dastute Switcher Technologies 
 * Author - SANJAY KR, DHILISH
 */
const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const blanketOrderSchema = new mongoose.Schema({
    agreementNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    validFrom: {
        type: Date,
        required: true
    },
    validTo: {
        type: Date,
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        agreedPrice: {
            type: Number,
            required: true,
            min: 0
        },
        maxQuantity: {
            type: Number,
            required: true,
            min: 1
        },
        orderedQuantity: {
            type: Number,
            default: 0
        }
    }],
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Closed'],
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

// Auto-expire check could be done via cron or middleware.
// For now, let's keep it simple.

blanketOrderSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('BlanketOrder', blanketOrderSchema);
