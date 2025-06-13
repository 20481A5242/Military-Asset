const jwt = require('jsonwebtoken');
const prisma = require('../utils/database');
const logger = require('../utils/logger');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided, authorization denied' }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { base: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token is not valid or user is inactive' }
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: { message: 'Token is not valid' }
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. Insufficient permissions.' }
      });
    }

    next();
  };
};

// Base access control middleware
const baseAccess = async (req, res, next) => {
  try {
    const { baseId } = req.params;
    const user = req.user;

    // Admin has access to all bases
    if (user.role === 'ADMIN') {
      return next();
    }

    // Base commanders can only access their own base
    if (user.role === 'BASE_COMMANDER') {
      if (user.baseId !== baseId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied. You can only access your assigned base.' }
        });
      }
    }

    // Logistics officers have limited access
    if (user.role === 'LOGISTICS_OFFICER') {
      if (user.baseId !== baseId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied. You can only access your assigned base.' }
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Base access control error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during authorization' }
    });
  }
};

module.exports = {
  authMiddleware,
  authorize,
  baseAccess
};
