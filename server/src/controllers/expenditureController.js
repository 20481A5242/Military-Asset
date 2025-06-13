const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// @desc    Get all expenditures with filters
// @route   GET /api/expenditures
// @access  Private (Admin, Base Commander)
const getExpenditures = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      baseId,
      assetId,
      reason,
      dateFrom,
      dateTo,
      equipmentType,
      sortBy = 'expendedAt',
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
    if (assetId) {
      whereClause.assetId = assetId;
    }

    if (reason) {
      whereClause.reason = {
        contains: reason,
        mode: 'insensitive'
      };
    }

    if (dateFrom || dateTo) {
      whereClause.expendedAt = {};
      if (dateFrom) whereClause.expendedAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.expendedAt.lte = new Date(dateTo);
    }

    // Equipment type filter (through asset)
    if (equipmentType) {
      whereClause.asset = {
        equipmentType: equipmentType
      };
    }

    const [expenditures, total] = await Promise.all([
      prisma.expenditure.findMany({
        where: whereClause,
        include: {
          asset: {
            select: { 
              id: true, 
              name: true, 
              serialNumber: true, 
              equipmentType: true,
              value: true
            }
          },
          base: {
            select: { id: true, name: true, code: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, username: true }
          }
        },
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.expenditure.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        expenditures,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get expenditures error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving expenditures' }
    });
  }
};

// @desc    Get expenditure by ID
// @route   GET /api/expenditures/:id
// @access  Private (Admin, Base Commander)
const getExpenditureById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    }

    const expenditure = await prisma.expenditure.findFirst({
      where: whereClause,
      include: {
        asset: {
          include: {
            purchase: {
              select: { 
                id: true, 
                purchaseOrder: true, 
                vendor: true, 
                purchaseDate: true,
                totalAmount: true
              }
            },
            assignments: {
              where: { returnedAt: null },
              include: {
                assignedTo: {
                  select: { 
                    id: true, 
                    firstName: true, 
                    lastName: true, 
                    username: true 
                  }
                }
              }
            }
          }
        },
        base: {
          select: { id: true, name: true, code: true, location: true }
        },
        createdBy: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            username: true,
            role: true
          }
        }
      }
    });

    if (!expenditure) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expenditure not found' }
      });
    }

    res.json({
      success: true,
      data: expenditure
    });
  } catch (error) {
    logger.error('Get expenditure by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving expenditure' }
    });
  }
};

// @desc    Create new expenditure
// @route   POST /api/expenditures
// @access  Private (Admin, Base Commander)
const createExpenditure = async (req, res) => {
  try {
    const {
      assetId,
      baseId,
      quantity = 1,
      reason,
      description,
      expendedAt
    } = req.body;

    const user = req.user;

    // Validate base access
    let targetBaseId = baseId;
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      targetBaseId = user.baseId;
    }

    // Check if asset exists and is at the correct base
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assignments: {
          where: { returnedAt: null }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: { message: 'Asset not found' }
      });
    }

    if (asset.baseId !== targetBaseId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset is not at the specified base' }
      });
    }

    if (asset.status === 'EXPENDED') {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset has already been expended' }
      });
    }

    // Create expenditure and update asset status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create expenditure record
      const expenditure = await tx.expenditure.create({
        data: {
          assetId,
          baseId: targetBaseId,
          quantity: parseInt(quantity),
          reason,
          description,
          expendedAt: expendedAt ? new Date(expendedAt) : new Date(),
          createdById: user.id
        }
      });

      // Update asset status to EXPENDED
      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'EXPENDED' }
      });

      // If asset was assigned, return it automatically
      if (asset.assignments.length > 0) {
        for (const assignment of asset.assignments) {
          await tx.assignment.update({
            where: { id: assignment.id },
            data: {
              returnedAt: new Date(),
              notes: `${assignment.notes || ''}\nAsset expended - automatic return`.trim()
            }
          });
        }
      }

      return expenditure;
    });

    // Fetch complete expenditure data
    const completeExpenditure = await prisma.expenditure.findUnique({
      where: { id: result.id },
      include: {
        asset: {
          select: { 
            id: true, 
            name: true, 
            serialNumber: true, 
            equipmentType: true,
            value: true,
            status: true
          }
        },
        base: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        }
      }
    });

    logger.info(`Asset expended: ${asset.serialNumber} - ${reason} by user ${user.username}`);

    res.status(201).json({
      success: true,
      data: completeExpenditure,
      message: 'Expenditure recorded successfully'
    });
  } catch (error) {
    logger.error('Create expenditure error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error creating expenditure' }
    });
  }
};

module.exports = {
  getExpenditures,
  getExpenditureById,
  createExpenditure
};
