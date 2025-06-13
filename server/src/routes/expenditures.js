const express = require('express');
const router = express.Router();
const expenditureController = require('../controllers/expenditureController');
const { authorize } = require('../middleware/auth');
const { expenditureSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/expenditures
// @desc    Get all expenditures with filters
// @access  Private (Admin, Base Commander)
router.get('/', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  expenditureController.getExpenditures
);

// @route   GET /api/expenditures/:id
// @desc    Get expenditure by ID
// @access  Private (Admin, Base Commander)
router.get('/:id', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  expenditureController.getExpenditureById
);

// @route   POST /api/expenditures
// @desc    Create new expenditure
// @access  Private (Admin, Base Commander)
router.post('/', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  validate(expenditureSchemas.create),
  auditLog('CREATE', 'Expenditure'),
  expenditureController.createExpenditure
);

module.exports = router;
