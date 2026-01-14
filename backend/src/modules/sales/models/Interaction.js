const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const interactionSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    type: {
        type: String,
        enum: ['Call', 'Email', 'Meeting', 'Note'],
        required: true
    },
    summary: {
        type: String,
        required: true,
        trim: true
    },
    details: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    performedBy: {
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

interactionSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Interaction', interactionSchema);
