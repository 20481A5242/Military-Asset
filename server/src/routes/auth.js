const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { userSchemas, validate } = require('../utils/validation');
const { auditLog } = require('../middleware/audit');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (should be restricted in production)
router.post('/register', 
  validate(userSchemas.register),
  auditLog('CREATE', 'User'),
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', 
  validate(userSchemas.login),
  auditLog('LOGIN', 'User'),
  authController.login
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', 
  auditLog('LOGOUT', 'User'),
  authController.logout
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authController.getMe);

module.exports = router;
