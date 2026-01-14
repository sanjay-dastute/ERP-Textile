const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../../core/plugins/tenantSecurity.plugin');

const contactSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
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
    phone: {
        type: String
    },
    role: {
        type: String,
        default: 'General'
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    }
}, {
    timestamps: true
});

contactSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Contact', contactSchema);
