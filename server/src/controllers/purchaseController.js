const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// @desc    Get all purchases with filters
// @route   GET /api/purchases
// @access  Private (All roles)
const getPurchases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      baseId,
      vendor,
      dateFrom,
      dateTo,
      equipmentType,
      sortBy = 'purchaseDate',
      sortOrder = 'desc'
    } = req.query;

    const user = req.user;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    // Build filters based on user role
    let whereClause = {};

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    } else if (baseId) {
      whereClause.baseId = baseId;
    }

    // Additional filters
    if (vendor) {
      whereClause.vendor = {
        contains: vendor,
        mode: 'insensitive'
      };
    }

    if (dateFrom || dateTo) {
      whereClause.purchaseDate = {};
      if (dateFrom) whereClause.purchaseDate.gte = new Date(dateFrom);
      if (dateTo) whereClause.purchaseDate.lte = new Date(dateTo);
    }

    // Equipment type filter (through assets)
    if (equipmentType) {
      whereClause.assets = {
        some: {
          equipmentType: equipmentType
        }
      };
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: whereClause,
        include: {
          base: {
            select: { id: true, name: true, code: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, username: true }
          },
          assets: {
            select: { id: true, name: true, equipmentType: true, serialNumber: true }
          }
        },
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.purchase.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving purchases' }
    });
  }
};

// @desc    Get purchase by ID
// @route   GET /api/purchases/:id
// @access  Private (All roles)
const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    }

    const purchase = await prisma.purchase.findFirst({
      where: whereClause,
      include: {
        base: {
          select: { id: true, name: true, code: true, location: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true }
        },
        assets: {
          include: {
            assignments: {
              where: { returnedAt: null },
              include: {
                assignedTo: {
                  select: { id: true, firstName: true, lastName: true, username: true }
                }
              }
            }
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { message: 'Purchase not found' }
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    logger.error('Get purchase by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving purchase' }
    });
  }
};

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private (Admin, Base Commander, Logistics Officer)
const createPurchase = async (req, res) => {
  try {
    const {
      purchaseOrder,
      vendor,
      totalAmount,
      purchaseDate,
      description,
      baseId,
      assets
    } = req.body;

    const user = req.user;

    // Validate base access
    let targetBaseId = baseId;
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      targetBaseId = user.baseId;
    }

    // Check if base exists
    const base = await prisma.base.findUnique({
      where: { id: targetBaseId }
    });

    if (!base) {
      return res.status(404).json({
        success: false,
        error: { message: 'Base not found' }
      });
    }

    // Check if purchase order already exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { purchaseOrder }
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        error: { message: 'Purchase order already exists' }
      });
    }

    // Create purchase with assets in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create purchase
      const purchase = await tx.purchase.create({
        data: {
          purchaseOrder,
          vendor,
          totalAmount: parseFloat(totalAmount),
          purchaseDate: new Date(purchaseDate),
          description,
          baseId: targetBaseId,
          createdById: user.id
        }
      });

      // Create assets
      const createdAssets = [];
      for (const asset of assets) {
        const createdAsset = await tx.asset.create({
          data: {
            serialNumber: asset.serialNumber,
            name: asset.name,
            description: asset.description,
            equipmentType: asset.equipmentType,
            value: asset.value ? parseFloat(asset.value) : null,
            acquisitionDate: new Date(purchaseDate),
            warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null,
            baseId: targetBaseId,
            purchaseId: purchase.id
          }
        });
        createdAssets.push(createdAsset);
      }

      return { purchase, assets: createdAssets };
    });

    // Fetch complete purchase data
    const completePurchase = await prisma.purchase.findUnique({
      where: { id: result.purchase.id },
      include: {
        base: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        assets: true
      }
    });

    logger.info(`Purchase created: ${purchaseOrder} by user ${user.username}`);

    res.status(201).json({
      success: true,
      data: completePurchase,
      message: 'Purchase created successfully'
    });
  } catch (error) {
    logger.error('Create purchase error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'Purchase order or asset serial number already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error creating purchase' }
    });
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase
};
