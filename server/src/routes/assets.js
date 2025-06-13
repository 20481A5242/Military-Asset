const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { authorize, baseAccess } = require('../middleware/auth');
const { assetSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/assets
// @desc    Get all assets with filters
// @access  Private (All roles)
router.get('/', assetController.getAssets);

// @route   GET /api/assets/:id
// @desc    Get asset by ID
// @access  Private (All roles)
router.get('/:id', assetController.getAssetById);

// @route   POST /api/assets
// @desc    Create new asset
// @access  Private (Admin, Base Commander)
router.post('/', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  validate(assetSchemas.create),
  auditLog('CREATE', 'Asset'),
  assetController.createAsset
);

// @route   PUT /api/assets/:id
// @desc    Update asset
// @access  Private (Admin, Base Commander)
router.put('/:id', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  validate(assetSchemas.update),
  captureOriginalData('asset'),
  auditLog('UPDATE', 'Asset'),
  assetController.updateAsset
);

// @route   DELETE /api/assets/:id
// @desc    Delete asset
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('ADMIN'),
  captureOriginalData('asset'),
  auditLog('DELETE', 'Asset'),
  assetController.deleteAsset
);

module.exports = router;
