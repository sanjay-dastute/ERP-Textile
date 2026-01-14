const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const quotationSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true, // Unique per tenant? or Global? Usually Global or Tenant-Scoped. 
        // For simplicity, let's make it unique but we handle generation in controller or pre-save.
        trim: true
    },
    customer: {
        name: { type: String, required: true },
        email: { type: String },
        address: { type: String }
    },
    customerRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    salesRep: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    commissionRate: {
        type: Number,
        default: 0
    },
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true },
        color: { type: String },
        size: { type: String },
        pricingMethod: {
            type: String,
            enum: ['Fixed', 'CostPlus', 'Tiered'],
            default: 'Fixed'
        },
        costPrice: { type: Number },
        markupPercent: { type: Number },
        costPrice: { type: Number },
        markupPercent: { type: Number },
        tierId: { type: String },
        productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        shrinkagePercent: { type: Number, default: 0 },
        grossQuantity: { type: Number }
    }],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'],
        default: 'Draft'
    },
    validUntil: {
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

quotationSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Quotation', quotationSchema);
