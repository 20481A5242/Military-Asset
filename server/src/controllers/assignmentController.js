const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// @desc    Get all assignments with filters
// @route   GET /api/assignments
// @access  Private (Admin, Base Commander)
const getAssignments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      baseId,
      assignedToId,
      assetId,
      status = 'all', // 'active', 'returned', 'all'
      dateFrom,
      dateTo,
      sortBy = 'assignedAt',
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
    if (assignedToId) {
      whereClause.assignedToId = assignedToId;
    }

    if (assetId) {
      whereClause.assetId = assetId;
    }

    // Status filter
    if (status === 'active') {
      whereClause.returnedAt = null;
    } else if (status === 'returned') {
      whereClause.returnedAt = { not: null };
    }

    if (dateFrom || dateTo) {
      whereClause.assignedAt = {};
      if (dateFrom) whereClause.assignedAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.assignedAt.lte = new Date(dateTo);
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: whereClause,
        include: {
          asset: {
            select: { 
              id: true, 
              name: true, 
              serialNumber: true, 
              equipmentType: true,
              status: true
            }
          },
          assignedTo: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              username: true,
              role: true
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
      prisma.assignment.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving assignments' }
    });
  }
};

// @desc    Get assignment by ID
// @route   GET /api/assignments/:id
// @access  Private (Admin, Base Commander)
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    }

    const assignment = await prisma.assignment.findFirst({
      where: whereClause,
      include: {
        asset: {
          include: {
            purchase: {
              select: { 
                id: true, 
                purchaseOrder: true, 
                vendor: true, 
                purchaseDate: true 
              }
            }
          }
        },
        assignedTo: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            username: true,
            email: true,
            role: true
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

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Assignment not found' }
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    logger.error('Get assignment by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving assignment' }
    });
  }
};

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private (Admin, Base Commander)
const createAssignment = async (req, res) => {
  try {
    const {
      assetId,
      assignedToId,
      baseId,
      purpose,
      notes
    } = req.body;

    const user = req.user;

    // Validate base access
    let targetBaseId = baseId;
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      targetBaseId = user.baseId;
    }

    // Check if asset exists and is available
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

    if (asset.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset is not available for assignment' }
      });
    }

    if (asset.assignments.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset is already assigned to someone else' }
      });
    }

    // Check if user exists and is at the same base
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'User to assign asset to not found' }
      });
    }

    if (assignedUser.baseId !== targetBaseId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User is not at the same base as the asset' }
      });
    }

    // Create assignment and update asset status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create assignment
      const assignment = await tx.assignment.create({
        data: {
          assetId,
          assignedToId,
          baseId: targetBaseId,
          purpose,
          notes,
          createdById: user.id
        }
      });

      // Update asset status to ASSIGNED
      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'ASSIGNED' }
      });

      return assignment;
    });

    // Fetch complete assignment data
    const completeAssignment = await prisma.assignment.findUnique({
      where: { id: result.id },
      include: {
        asset: {
          select: { 
            id: true, 
            name: true, 
            serialNumber: true, 
            equipmentType: true,
            status: true
          }
        },
        assignedTo: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            username: true,
            role: true
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

    logger.info(`Asset assigned: ${asset.serialNumber} to ${assignedUser.username} by user ${user.username}`);

    res.status(201).json({
      success: true,
      data: completeAssignment,
      message: 'Asset assigned successfully'
    });
  } catch (error) {
    logger.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error creating assignment' }
    });
  }
};

// @desc    Return assigned asset
// @route   PUT /api/assignments/:id/return
// @access  Private (Admin, Base Commander)
const returnAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, condition } = req.body;
    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.baseId = user.baseId;
    }

    const assignment = await prisma.assignment.findFirst({
      where: whereClause,
      include: {
        asset: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Assignment not found' }
      });
    }

    if (assignment.returnedAt) {
      return res.status(400).json({
        success: false,
        error: { message: 'Asset has already been returned' }
      });
    }

    // Return assignment and update asset status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update assignment with return information
      const updatedAssignment = await tx.assignment.update({
        where: { id },
        data: {
          returnedAt: new Date(),
          notes: notes ? `${assignment.notes || ''}\nReturn notes: ${notes}`.trim() : assignment.notes
        }
      });

      // Determine asset status based on condition
      let newStatus = 'AVAILABLE';
      if (condition === 'DAMAGED' || condition === 'NEEDS_MAINTENANCE') {
        newStatus = 'MAINTENANCE';
      } else if (condition === 'DECOMMISSIONED') {
        newStatus = 'DECOMMISSIONED';
      }

      // Update asset status
      await tx.asset.update({
        where: { id: assignment.assetId },
        data: { status: newStatus }
      });

      return updatedAssignment;
    });

    // Fetch complete assignment data
    const completeAssignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            equipmentType: true,
            status: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true
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

    logger.info(`Asset returned: ${assignment.asset.serialNumber} from ${assignment.assignedTo.username} by user ${user.username}`);

    res.json({
      success: true,
      data: completeAssignment,
      message: 'Asset returned successfully'
    });
  } catch (error) {
    logger.error('Return assignment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error returning asset' }
    });
  }
};

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  returnAssignment
};
