const express = require('express');
const { register, login, getMe, enableMFA, verifyMFA, refreshToken, logout } = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/mfa/enable', protect, enableMFA);
router.post('/mfa/verify', protect, verifyMFA);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

module.exports = router;
