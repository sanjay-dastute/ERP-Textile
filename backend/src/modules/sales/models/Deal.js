const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const dealSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a deal name'],
        trim: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Please add an estimated amount'],
        min: 0
    },
    stage: {
        type: String,
        enum: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
        default: 'Prospecting'
    },
    probability: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    expectedCloseDate: {
        type: Date
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

// Auto-set probability based on stage if not provided? 
// For now, let's keep it manual or set defaults in controller, 
// but typically stage change implies probability change. 
// Let's handle defaults in the schema pre-save if needed, but the requirements said auto-set based on stage OR manual.
// Simple map for default probabilities
const stageProbabilities = {
    'Prospecting': 10,
    'Qualification': 30,
    'Proposal': 50,
    'Negotiation': 80,
    'Closed Won': 100,
    'Closed Lost': 0
};

dealSchema.pre('save', async function () {
    if (this.isModified('stage') && !this.isModified('probability')) {
        this.probability = stageProbabilities[this.stage] || 0;
    }
});

dealSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Deal', dealSchema);
