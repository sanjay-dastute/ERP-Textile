const Organization = require('./models/Organization');

// @desc    Get Organization Settings
// @route   GET /api/organization/settings
// @access  Private (Manager/Admin)
exports.getSettings = async (req, res) => {
    try {
        const org = await Organization.findById(req.user.organization).setOptions({ ignoreRLS: true });

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        res.status(200).json({ success: true, data: org.settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Organization Settings
// @route   PUT /api/organization/settings
// @access  Private (Admin only)
exports.updateSettings = async (req, res) => {
    try {
        // Simple ABAC/RBAC check - only admin or manager (logic can vary)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update settings' });
        }

        const { branding, localization, modules } = req.body;
        const org = await Organization.findById(req.user.organization).setOptions({ ignoreRLS: true });

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        // Deep merge or specific update
        if (branding) org.settings.branding = { ...org.settings.branding, ...branding };
        if (localization) org.settings.localization = { ...org.settings.localization, ...localization };
        if (modules) org.settings.modules = { ...org.settings.modules, ...modules };

        await org.save();

        res.status(200).json({ success: true, data: org.settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
