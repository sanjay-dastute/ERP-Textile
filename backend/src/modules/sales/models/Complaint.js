const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const complaintSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    salesOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject'],
        trim: true,
        maxlength: [100, 'Subject cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    type: {
        type: String,
        enum: ['Product Quality', 'Delivery', 'Service', 'Billing', 'Other'],
        default: 'Other'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['New', 'In Progress', 'Resolved', 'Closed'],
        default: 'New'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolution: {
        type: String
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

complaintSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Complaint', complaintSchema);
