const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    salesOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder'
    },
    issueDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
        default: 'Unpaid'
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

// Calculate status before saving
invoiceSchema.pre('save', async function () {
    if (this.paidAmount >= this.totalAmount) {
        this.status = 'Paid';
    } else if (this.paidAmount > 0) {
        this.status = 'Partially Paid';
    } else if (new Date() > this.dueDate && this.paidAmount < this.totalAmount) {
        this.status = 'Overdue';
    }
});

invoiceSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Invoice', invoiceSchema);
