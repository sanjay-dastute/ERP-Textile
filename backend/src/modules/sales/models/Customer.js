const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    address: {
        type: String
    },
    creditLimit: {
        type: Number,
        default: 0
    },
    usedCredit: {
        type: Number,
        default: 0
    },
    portalUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    parentCustomer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    type: {
        type: String,
        enum: ['Corporate', 'Individual', 'Branch'],
        default: 'Individual'
    },
    segment: {
        type: String, // e.g., 'VIP', 'Wholesale', 'Retail'
    },
    tags: [{
        type: String
    }],
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    creditTerms: {
        type: String,
        default: 'Net 30'
    },
    creditStatus: {
        type: String,
        enum: ['Active', 'Hold', 'Closed'],
        default: 'Active'
    },
    leadSource: {
        type: String,
        enum: ['Referral', 'Web', 'Social Media', 'Advertisement', 'Cold Call', 'Event', 'Other'],
        default: 'Other'
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

customerSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Customer', customerSchema);
