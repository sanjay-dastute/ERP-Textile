/**
 * Copyright - Dastute Switcher Technologies 
 * Author - SANJAY KR, DHILISH
 */
const express = require('express');
const {
    createVendor,
    getVendors,
    updateVendor,
    recommendVendors,
    createPO,
    getPOs,
    updatePO,
    createBlanketOrder,
    getBlanketOrders
} = require('./purchase.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/vendors', createVendor);
router.get('/vendors', getVendors);
router.put('/vendors/:id', updateVendor);
router.get('/vendors/recommend/:productId', recommendVendors);

router.post('/purchase-orders', createPO);
router.get('/purchase-orders', getPOs);
router.put('/purchase-orders/:id', updatePO);

router.post('/blanket-orders', createBlanketOrder);
router.get('/blanket-orders', getBlanketOrders);

module.exports = router;
