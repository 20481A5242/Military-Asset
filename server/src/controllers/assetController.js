const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// @desc    Get all assets with filters
// @route   GET /api/assets
// @access  Private (All roles)
const getAssets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      baseId,
      equipmentType,
      status,
      search,
      sortBy = 'createdAt',
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
    if (equipmentType) {
      whereClause.equipmentType = equipmentType;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          serialNumber: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: whereClause,
        include: {
          base: {
            select: { id: true, name: true, code: true }
          },
          purchase: {
            select: { 
              id: true, 
              purchaseOrder: true, 
              vendor: true, 
              purchaseDate: true 
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
        },
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.asset.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get assets error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving assets' }
    });
  }
};

// @desc    Get asset by ID
// @route   GET /api/assets/:id
// @access  Private (All roles)
const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    }

    const asset = await prisma.asset.findFirst({
      where: whereClause,
      include: {
        base: {
          select: { id: true, name: true, code: true, location: true }
        },
        purchase: {
          include: {
            createdBy: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                username: true 
              }
            }
          }
        },
        assignments: {
          include: {
            assignedTo: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                username: true,
                role: true
              }
            },
            createdBy: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                username: true 
              }
            }
          },
          orderBy: { assignedAt: 'desc' }
        },
        transferItems: {
          include: {
            transfer: {
              include: {
                fromBase: {
                  select: { id: true, name: true, code: true }
                },
                toBase: {
                  select: { id: true, name: true, code: true }
                }
              }
            }
          },
          orderBy: { transfer: { createdAt: 'desc' } }
        },
        expenditures: {
          include: {
            createdBy: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                username: true 
              }
            }
          },
          orderBy: { expendedAt: 'desc' }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: { message: 'Asset not found' }
      });
    }

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    logger.error('Get asset by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving asset' }
    });
  }
};

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private (Admin, Base Commander)
const createAsset = async (req, res) => {
  try {
    const {
      serialNumber,
      name,
      description,
      equipmentType,
      baseId,
      value,
      acquisitionDate,
      warrantyExpiry
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

    // Check if serial number already exists
    const existingAsset = await prisma.asset.findUnique({
      where: { serialNumber }
    });

    if (existingAsset) {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset with this serial number already exists' }
      });
    }

    const asset = await prisma.asset.create({
      data: {
        serialNumber,
        name,
        description,
        equipmentType,
        baseId: targetBaseId,
        value: value ? parseFloat(value) : null,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null
      },
      include: {
        base: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    logger.info(`Asset created: ${serialNumber} by user ${user.username}`);

    res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset created successfully'
    });
  } catch (error) {
    logger.error('Create asset error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset with this serial number already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error creating asset' }
    });
  }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private (Admin, Base Commander)
const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serialNumber,
      name,
      description,
      equipmentType,
      value,
      acquisitionDate,
      warrantyExpiry,
      status
    } = req.body;

    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    }

    const existingAsset = await prisma.asset.findFirst({
      where: whereClause
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        error: { message: 'Asset not found' }
      });
    }

    // Check if serial number is being changed and if it already exists
    if (serialNumber && serialNumber !== existingAsset.serialNumber) {
      const duplicateAsset = await prisma.asset.findUnique({
        where: { serialNumber }
      });

      if (duplicateAsset) {
        return res.status(400).json({
          success: false,
          error: { message: 'Asset with this serial number already exists' }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (equipmentType !== undefined) updateData.equipmentType = equipmentType;
    if (value !== undefined) updateData.value = value ? parseFloat(value) : null;
    if (acquisitionDate !== undefined) updateData.acquisitionDate = acquisitionDate ? new Date(acquisitionDate) : null;
    if (warrantyExpiry !== undefined) updateData.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
    if (status !== undefined) updateData.status = status;

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        base: {
          select: { id: true, name: true, code: true }
        },
        purchase: {
          select: {
            id: true,
            purchaseOrder: true,
            vendor: true,
            purchaseDate: true
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
    });

    logger.info(`Asset updated: ${updatedAsset.serialNumber} by user ${user.username}`);

    res.json({
      success: true,
      data: updatedAsset,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    logger.error('Update asset error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset with this serial number already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error updating asset' }
    });
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin only)
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { returnedAt: null }
        },
        transferItems: true,
        expenditures: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: { message: 'Asset not found' }
      });
    }

    // Check if asset has active assignments
    if (asset.assignments.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete asset with active assignments' }
      });
    }

    // Check if asset has transfer history
    if (asset.transferItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete asset with transfer history' }
      });
    }

    // Check if asset has expenditure records
    if (asset.expenditures.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete asset with expenditure records' }
      });
    }

    await prisma.asset.delete({
      where: { id }
    });

    logger.info(`Asset deleted: ${asset.serialNumber} by user ${user.username}`);

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    logger.error('Delete asset error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error deleting asset' }
    });
  }
};

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset
};
