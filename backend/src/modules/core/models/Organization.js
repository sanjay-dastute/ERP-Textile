const mongoose = require('mongoose');
const tenantSecurityPlugin = require('../plugins/tenantSecurity.plugin');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Organization name is required'],
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    contactEmail: {
        type: String,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'trial'],
        default: 'active'
    },
    settings: {
        branding: {
            logoUrl: String,
            primaryColor: { type: String, default: '#3B82F6' },
            secondaryColor: { type: String, default: '#10B981' }
        },
        localization: {
            currency: { type: String, default: 'USD' },
            timezone: { type: String, default: 'UTC' },
            dateFormat: { type: String, default: 'YYYY-MM-DD' }
        },
        modules: {
            sales: { type: Boolean, default: true },
            inventory: { type: Boolean, default: true },
            production: { type: Boolean, default: true },
            accounting: { type: Boolean, default: true }
        }
    }
}, {
}, {
    timestamps: true
});

organizationSchema.plugin(tenantSecurityPlugin);

module.exports = mongoose.model('Organization', organizationSchema);
