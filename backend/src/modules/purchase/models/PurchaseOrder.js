/**
 * Copyright - Dastute Switcher Technologies 
 * Author - SANJAY KR, DHILISH
 */
const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
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
    blanketOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlanketOrder'
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        description: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        total: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    paymentTerms: {
        discountPercent: Number,
        discountDays: Number,
        netDays: Number
    },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Partial', 'Completed', 'Cancelled'],
        default: 'Draft'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

purchaseOrderSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
