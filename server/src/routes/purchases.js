const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authorize } = require('../middleware/auth');
const { purchaseSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/purchases
// @desc    Get all purchases with filters
// @access  Private (All roles)
router.get('/', purchaseController.getPurchases);

// @route   GET /api/purchases/:id
// @desc    Get purchase by ID
// @access  Private (All roles)
router.get('/:id', purchaseController.getPurchaseById);

// @route   POST /api/purchases
// @desc    Create new purchase
// @access  Private (Admin, Base Commander, Logistics Officer)
router.post('/', 
  authorize('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'),
  validate(purchaseSchemas.create),
  auditLog('CREATE', 'Purchase'),
  purchaseController.createPurchase
);

module.exports = router;
