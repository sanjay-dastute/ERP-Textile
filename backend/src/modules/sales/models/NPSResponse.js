const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const npsResponseSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    salesOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder'
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 10
    },
    feedback: {
        type: String,
        trim: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

npsResponseSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('NPSResponse', npsResponseSchema);
