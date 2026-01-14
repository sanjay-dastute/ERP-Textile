const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
const {
    createQuotation,
    getQuotations,
    getQuotation,
    updateQuotation,
    deleteQuotation,
    convertQuoteToSO,
    createCustomer,
    createProduct,
    updateOrderStatus,
    updateSalesOrder,
    getSalesPerformance,
    getCommissions,
    createReturnOrder,
    updateReturnStatus,
    getPortalOrders,
    getPortalQuotations,
    getCustomerHierarchy,
    addContact,
    getContacts,
    addInteraction,
    getInteractions,
    updateCustomer,
    createActivity,
    getActivities,
    updateActivity,
    deleteActivity,
    uploadDocument,
    getDocuments,
    deleteDocument,
    createComplaint,
    getComplaints,
    updateComplaint,
    deleteComplaint,
    createInvoice,
    getInvoices,
    getARAging,
    submitNPS,
    getNPSStats,
    createDeal,
    getDeals,
    updateDeal,
    deleteDeal,
    getPipelineSummary,
    getLeadSourceStats,
    getCustomerCLV
} = require('./sales.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/reports/performance', protect, getSalesPerformance);
router.get('/reports/commissions', protect, getCommissions);
router.get('/portal/orders', protect, getPortalOrders);
router.get('/portal/quotations', protect, getPortalQuotations);
router.post('/returns', protect, createReturnOrder);
router.put('/returns/:id/status', protect, updateReturnStatus);
router.put('/orders/:id/status', protect, updateOrderStatus);
router.put('/orders/:id', protect, updateSalesOrder);
router.post('/customers', protect, createCustomer);
router.put('/customers/:id', protect, updateCustomer);
router.get('/customers/:id/hierarchy', protect, getCustomerHierarchy);
router.post('/customers/:id/contacts', protect, addContact);
router.get('/customers/:id/contacts', protect, getContacts);
router.post('/customers/:id/interactions', protect, addInteraction);
router.get('/customers/:id/interactions', protect, getInteractions);
router.post('/customers/:id/activities', protect, createActivity);
router.get('/customers/:id/activities', protect, getActivities);
router.put('/activities/:id', protect, updateActivity);
router.delete('/activities/:id', protect, deleteActivity);

router.post('/customers/:id/documents', protect, upload.single('file'), uploadDocument);
router.get('/customers/:id/documents', protect, getDocuments);
router.delete('/documents/:id', protect, deleteDocument);

router.post('/customers/:id/complaints', protect, createComplaint);
router.get('/customers/:id/complaints', protect, getComplaints);
router.get('/complaints', protect, getComplaints); // Global list
router.put('/complaints/:id', protect, updateComplaint);
router.delete('/complaints/:id', protect, deleteComplaint);

router.post('/invoices', protect, createInvoice);
router.get('/invoices', protect, getInvoices);
router.get('/reports/ar-aging', protect, getARAging);

router.post('/customers/:id/nps', protect, submitNPS);
router.get('/reports/nps', protect, getNPSStats);

router.post('/deals', protect, createDeal);
router.get('/deals', protect, getDeals);
router.put('/deals/:id', protect, updateDeal);
router.delete('/deals/:id', protect, deleteDeal);
router.get('/reports/pipeline', protect, getPipelineSummary);
router.get('/reports/lead-sources', protect, getLeadSourceStats);
router.get('/reports/clv', protect, getCustomerCLV);

router.post('/products', protect, createProduct);

router.use(protect); // Protect all routes

router.route('/quotations')
    .post(createQuotation)
    .get(getQuotations);

router.post('/quotations/:id/convert', convertQuoteToSO);
router.route('/quotations/:id')
    .get(getQuotation)
    .put(updateQuotation)
    .delete(deleteQuotation);

module.exports = router;
