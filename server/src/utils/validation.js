const Joi = require('joi');

// User validation schemas
const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER').required(),
    baseId: Joi.string().when('role', {
      is: Joi.string().valid('BASE_COMMANDER', 'LOGISTICS_OFFICER'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  create: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER').required(),
    baseId: Joi.string().when('role', {
      is: Joi.string().valid('BASE_COMMANDER', 'LOGISTICS_OFFICER'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  update: Joi.object({
    email: Joi.string().email(),
    username: Joi.string().alphanum().min(3).max(30),
    password: Joi.string().min(8),
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    role: Joi.string().valid('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'),
    baseId: Joi.string().allow(null),
    isActive: Joi.boolean()
  })
};

// Base validation schemas
const baseSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().alphanum().min(2).max(10).required(),
    location: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(500).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    code: Joi.string().alphanum().min(2).max(10),
    location: Joi.string().min(2).max(200),
    description: Joi.string().max(500),
    isActive: Joi.boolean()
  })
};

// Asset validation schemas
const assetSchemas = {
  create: Joi.object({
    serialNumber: Joi.string().required(),
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    equipmentType: Joi.string().valid('VEHICLE', 'WEAPON', 'AMMUNITION', 'COMMUNICATION', 'MEDICAL', 'SUPPLY', 'OTHER').required(),
    baseId: Joi.string().required(),
    value: Joi.number().positive().optional(),
    acquisitionDate: Joi.date().optional(),
    warrantyExpiry: Joi.date().optional()
  }),

  update: Joi.object({
    serialNumber: Joi.string(),
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(500),
    equipmentType: Joi.string().valid('VEHICLE', 'WEAPON', 'AMMUNITION', 'COMMUNICATION', 'MEDICAL', 'SUPPLY', 'OTHER'),
    status: Joi.string().valid('AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE', 'EXPENDED', 'DECOMMISSIONED'),
    baseId: Joi.string(),
    value: Joi.number().positive(),
    acquisitionDate: Joi.date(),
    warrantyExpiry: Joi.date()
  })
};

// Purchase validation schemas
const purchaseSchemas = {
  create: Joi.object({
    purchaseOrder: Joi.string().required(),
    vendor: Joi.string().min(2).max(100).required(),
    totalAmount: Joi.number().positive().required(),
    purchaseDate: Joi.date().required(),
    description: Joi.string().max(500).optional(),
    baseId: Joi.string().required(),
    assets: Joi.array().items(
      Joi.object({
        serialNumber: Joi.string().required(),
        name: Joi.string().min(2).max(100).required(),
        description: Joi.string().max(500).optional(),
        equipmentType: Joi.string().valid('VEHICLE', 'WEAPON', 'AMMUNITION', 'COMMUNICATION', 'MEDICAL', 'SUPPLY', 'OTHER').required(),
        value: Joi.number().positive().optional(),
        acquisitionDate: Joi.date().optional(),
        warrantyExpiry: Joi.date().optional()
      })
    ).min(1).required()
  })
};

// Transfer validation schemas
const transferSchemas = {
  create: Joi.object({
    fromBaseId: Joi.string().required(),
    toBaseId: Joi.string().required(),
    reason: Joi.string().min(5).max(500).required(),
    notes: Joi.string().max(1000).optional(),
    assets: Joi.array().items(
      Joi.object({
        assetId: Joi.string().required(),
        quantity: Joi.number().integer().positive().default(1),
        notes: Joi.string().max(500).optional()
      })
    ).min(1).required()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED').required(),
    notes: Joi.string().max(1000).optional()
  })
};

// Assignment validation schemas
const assignmentSchemas = {
  create: Joi.object({
    assetId: Joi.string().required(),
    assignedToId: Joi.string().required(),
    baseId: Joi.string().required(),
    purpose: Joi.string().min(5).max(500).required(),
    notes: Joi.string().max(1000).optional()
  }),

  return: Joi.object({
    notes: Joi.string().max(1000).optional(),
    condition: Joi.string().valid('GOOD', 'DAMAGED', 'NEEDS_MAINTENANCE', 'DECOMMISSIONED').optional()
  })
};

// Expenditure validation schemas
const expenditureSchemas = {
  create: Joi.object({
    assetId: Joi.string().required(),
    baseId: Joi.string().required(),
    quantity: Joi.number().integer().positive().default(1),
    reason: Joi.string().min(5).max(500).required(),
    description: Joi.string().max(1000).optional(),
    expendedAt: Joi.date().default(new Date())
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        }
      });
    }
    next();
  };
};

module.exports = {
  userSchemas,
  baseSchemas,
  assetSchemas,
  purchaseSchemas,
  transferSchemas,
  assignmentSchemas,
  expenditureSchemas,
  validate
};
