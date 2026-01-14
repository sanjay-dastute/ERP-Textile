const express = require('express');
const { getSettings, updateSettings } = require('./organization.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
