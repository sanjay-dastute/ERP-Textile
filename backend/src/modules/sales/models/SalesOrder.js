const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const salesOrderSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    quotation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation',
        required: true
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
    commissionAmount: {
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
        quantityAllocated: { type: Number, default: 0 },
        quantityBackordered: { type: Number, default: 0 },
        allocationStatus: {
            type: String,
            enum: ['Fully Allocated', 'Partially Allocated', 'Backordered', 'Pending'],
            default: 'Pending'
        },
        shrinkagePercent: { type: Number, default: 0 },
        grossQuantity: { type: Number },
        deliverySchedule: [{
            deliveryDate: { type: Date, required: true },
            quantity: { type: Number, required: true },
            status: {
                type: String,
                enum: ['Pending', 'Shipped', 'Delivered'],
                default: 'Pending'
            }
        }]
    }],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Confirmed', 'Approved', 'Released', 'Shipped', 'Invoiced', 'Closed', 'Cancelled'],
        default: 'Confirmed'
    },
    statusHistory: [{
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        comment: String
    }],
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

salesOrderSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
