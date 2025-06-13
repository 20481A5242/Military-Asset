const express = require('express');
const router = express.Router();
const baseController = require('../controllers/baseController');
const { authorize } = require('../middleware/auth');
const { baseSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/bases
// @desc    Get all bases
// @access  Private (All roles)
router.get('/', baseController.getBases);

// @route   GET /api/bases/:id
// @desc    Get base by ID
// @access  Private (All roles)
router.get('/:id', baseController.getBaseById);

// @route   POST /api/bases
// @desc    Create new base
// @access  Private (Admin only)
router.post('/', 
  authorize('ADMIN'),
  validate(baseSchemas.create),
  auditLog('CREATE', 'Base'),
  baseController.createBase
);

// @route   PUT /api/bases/:id
// @desc    Update base
// @access  Private (Admin only)
router.put('/:id', 
  authorize('ADMIN'),
  validate(baseSchemas.update),
  captureOriginalData('base'),
  auditLog('UPDATE', 'Base'),
  baseController.updateBase
);

// @route   DELETE /api/bases/:id
// @desc    Delete base (soft delete)
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('ADMIN'),
  captureOriginalData('base'),
  auditLog('DELETE', 'Base'),
  baseController.deleteBase
);

module.exports = router;
