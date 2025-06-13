const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authorize } = require('../middleware/auth');
const { userSchemas, validate } = require('../utils/validation');
const { auditLog, captureOriginalData } = require('../middleware/audit');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', 
  authorize('ADMIN'),
  userController.getUsers
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/:id',
  authorize('ADMIN'),
  userController.getUserById
);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/',
  authorize('ADMIN'),
  validate(userSchemas.create),
  auditLog('CREATE', 'User'),
  userController.createUser
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', 
  authorize('ADMIN'),
  validate(userSchemas.update),
  captureOriginalData('user'),
  auditLog('UPDATE', 'User'),
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('ADMIN'),
  captureOriginalData('user'),
  auditLog('DELETE', 'User'),
  userController.deleteUser
);

module.exports = router;
