const prisma = require('../utils/database');
const logger = require('../utils/logger');

// Audit logging middleware
const auditLog = (action, entity) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Async audit logging (don't wait for it)
        setImmediate(async () => {
          try {
            await createAuditLog({
              userId: req.user?.id,
              action,
              entity,
              entityId: req.params.id || data?.data?.id,
              oldValues: req.originalData || null,
              newValues: req.method !== 'GET' ? req.body : null,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          } catch (error) {
            logger.error('Audit logging failed:', error);
          }
        });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Create audit log entry
const createAuditLog = async (logData) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: logData.userId,
        action: logData.action,
        entity: logData.entity,
        entityId: logData.entityId,
        oldValues: logData.oldValues,
        newValues: logData.newValues,
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    throw error;
  }
};

// Middleware to capture original data for updates/deletes
const captureOriginalData = (model) => {
  return async (req, res, next) => {
    if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      try {
        const { id } = req.params;
        if (id) {
          const originalData = await prisma[model].findUnique({
            where: { id }
          });
          req.originalData = originalData;
        }
      } catch (error) {
        logger.error('Failed to capture original data:', error);
      }
    }
    next();
  };
};

module.exports = {
  auditLog,
  createAuditLog,
  captureOriginalData
};
