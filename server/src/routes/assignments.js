const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authorize } = require('../middleware/auth');
const { assignmentSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/assignments
// @desc    Get all assignments with filters
// @access  Private (Admin, Base Commander)
router.get('/', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  assignmentController.getAssignments
);

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private (Admin, Base Commander)
router.get('/:id', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  assignmentController.getAssignmentById
);

// @route   POST /api/assignments
// @desc    Create new assignment
// @access  Private (Admin, Base Commander)
router.post('/', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  validate(assignmentSchemas.create),
  auditLog('CREATE', 'Assignment'),
  assignmentController.createAssignment
);

// @route   PUT /api/assignments/:id/return
// @desc    Return assigned asset
// @access  Private (Admin, Base Commander)
router.put('/:id/return', 
  authorize('ADMIN', 'BASE_COMMANDER'),
  validate(assignmentSchemas.return),
  captureOriginalData('assignment'),
  auditLog('RETURN', 'Assignment'),
  assignmentController.returnAssignment
);

module.exports = router;
