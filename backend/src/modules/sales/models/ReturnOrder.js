const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const returnOrderSchema = new mongoose.Schema({
    returnNumber: {
        type: String,
        required: true,
        unique: true
    },
    salesOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    type: {
        type: String,
        enum: ['Return', 'Rework'],
        default: 'Return'
    },
    items: [{
        productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        description: String,
        quantity: { type: Number, required: true },
        reason: String,
        condition: String
    }],
    status: {
        type: String,
        enum: ['Requested', 'Approved', 'Received', 'Completed', 'Rejected'],
        default: 'Requested'
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

returnOrderSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('ReturnOrder', returnOrderSchema);
