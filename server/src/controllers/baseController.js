const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// @desc    Get all bases with filters
// @route   GET /api/bases
// @access  Private (All roles)
const getBases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const user = req.user;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    // Build filters
    let whereClause = {};

    // For base commanders, only show their own base
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.id = user.baseId;
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
          code: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          location: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [bases, total] = await Promise.all([
      prisma.base.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              users: true,
              assets: true,
              purchases: true,
              transfersFrom: true,
              transfersTo: true
            }
          }
        },
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.base.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        bases,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get bases error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving bases' }
    });
  }
};

// @desc    Get base by ID
// @route   GET /api/bases/:id
// @access  Private (All roles)
const getBaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // For base commanders, only allow access to their own base
    if (user.role === 'BASE_COMMANDER' && user.baseId !== id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied to this base' }
      });
    }

    const base = await prisma.base.findFirst({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        assets: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            equipmentType: true,
            status: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            users: true,
            assets: true,
            purchases: true,
            transfersFrom: true,
            transfersTo: true,
            assignments: true,
            expenditures: true
          }
        }
      }
    });

    if (!base) {
      return res.status(404).json({
        success: false,
        error: { message: 'Base not found' }
      });
    }

    res.json({
      success: true,
      data: base
    });
  } catch (error) {
    logger.error('Get base by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving base' }
    });
  }
};

// @desc    Create new base
// @route   POST /api/bases
// @access  Private (Admin only)
const createBase = async (req, res) => {
  try {
    const {
      name,
      code,
      location,
      description
    } = req.body;

    const user = req.user;

    // Check if base name or code already exists
    const existingBase = await prisma.base.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    });

    if (existingBase) {
      return res.status(400).json({
        success: false,
        error: { 
          message: existingBase.name === name 
            ? 'Base with this name already exists' 
            : 'Base with this code already exists' 
        }
      });
    }

    const base = await prisma.base.create({
      data: {
        name,
        code: code.toUpperCase(),
        location,
        description
      },
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            purchases: true,
            transfersFrom: true,
            transfersTo: true
          }
        }
      }
    });

    logger.info(`Base created: ${name} (${code}) by user ${user.username}`);

    res.status(201).json({
      success: true,
      data: base,
      message: 'Base created successfully'
    });
  } catch (error) {
    logger.error('Create base error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'Base with this name or code already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error creating base' }
    });
  }
};

// @desc    Update base
// @route   PUT /api/bases/:id
// @access  Private (Admin only)
const updateBase = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      location,
      description,
      isActive
    } = req.body;

    const user = req.user;

    const existingBase = await prisma.base.findUnique({
      where: { id }
    });

    if (!existingBase) {
      return res.status(404).json({
        success: false,
        error: { message: 'Base not found' }
      });
    }

    // Check if name or code is being changed and if it already exists
    if ((name && name !== existingBase.name) || (code && code !== existingBase.code)) {
      const duplicateBase = await prisma.base.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(name ? [{ name }] : []),
                ...(code ? [{ code: code.toUpperCase() }] : [])
              ]
            }
          ]
        }
      });

      if (duplicateBase) {
        return res.status(400).json({
          success: false,
          error: { 
            message: duplicateBase.name === name 
              ? 'Base with this name already exists' 
              : 'Base with this code already exists' 
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedBase = await prisma.base.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            purchases: true,
            transfersFrom: true,
            transfersTo: true
          }
        }
      }
    });

    logger.info(`Base updated: ${updatedBase.name} by user ${user.username}`);

    res.json({
      success: true,
      data: updatedBase,
      message: 'Base updated successfully'
    });
  } catch (error) {
    logger.error('Update base error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'Base with this name or code already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error updating base' }
    });
  }
};

// @desc    Delete base (soft delete)
// @route   DELETE /api/bases/:id
// @access  Private (Admin only)
const deleteBase = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const base = await prisma.base.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            assets: true,
            purchases: true,
            transfersFrom: true,
            transfersTo: true
          }
        }
      }
    });

    if (!base) {
      return res.status(404).json({
        success: false,
        error: { message: 'Base not found' }
      });
    }

    // Check if base has any associated data
    const hasData = base._count.users > 0 ||
                   base._count.assets > 0 ||
                   base._count.purchases > 0 ||
                   base._count.transfersFrom > 0 ||
                   base._count.transfersTo > 0;

    if (hasData) {
      // Soft delete - just deactivate the base
      const updatedBase = await prisma.base.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: {
            select: {
              users: true,
              assets: true,
              purchases: true,
              transfersFrom: true,
              transfersTo: true
            }
          }
        }
      });

      logger.info(`Base deactivated: ${base.name} by user ${user.username}`);

      res.json({
        success: true,
        data: updatedBase,
        message: 'Base deactivated successfully (has associated data)'
      });
    } else {
      // Hard delete if no associated data
      await prisma.base.delete({
        where: { id }
      });

      logger.info(`Base deleted: ${base.name} by user ${user.username}`);

      res.json({
        success: true,
        message: 'Base deleted successfully'
      });
    }
  } catch (error) {
    logger.error('Delete base error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error deleting base' }
    });
  }
};

module.exports = {
  getBases,
  getBaseById,
  createBase,
  updateBase,
  deleteBase
};
