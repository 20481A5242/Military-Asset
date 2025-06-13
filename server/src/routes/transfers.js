const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authorize } = require('../middleware/auth');
const { transferSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/transfers
// @desc    Get all transfers with filters
// @access  Private (All roles)
router.get('/', transferController.getTransfers);

// @route   GET /api/transfers/:id
// @desc    Get transfer by ID
// @access  Private (All roles)
router.get('/:id', transferController.getTransferById);

// @route   POST /api/transfers
// @desc    Create new transfer
// @access  Private (Admin, Base Commander, Logistics Officer)
router.post('/', 
  authorize('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'),
  validate(transferSchemas.create),
  auditLog('CREATE', 'Transfer'),
  transferController.createTransfer
);

// @route   PUT /api/transfers/:id/approve
// @desc    Approve transfer
// @access  Private (Admin, Base Commander)
router.put('/:id/approve', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  captureOriginalData('transfer'),
  auditLog('APPROVE', 'Transfer'),
  transferController.approveTransfer
);

// @route   PUT /api/transfers/:id/complete
// @desc    Complete transfer
// @access  Private (Admin, Base Commander)
router.put('/:id/complete', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  captureOriginalData('transfer'),
  auditLog('COMPLETE', 'Transfer'),
  transferController.completeTransfer
);

// @route   PUT /api/transfers/:id/cancel
// @desc    Cancel transfer
// @access  Private (Admin, Base Commander)
router.put('/:id/cancel', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  captureOriginalData('transfer'),
  auditLog('CANCEL', 'Transfer'),
  transferController.cancelTransfer
);

module.exports = router;
