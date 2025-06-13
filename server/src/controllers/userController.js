const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// @desc    Get all users with filters
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      baseId,
      role,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    // Build filters
    let whereClause = {};

    if (baseId) {
      whereClause.baseId = baseId;
    }

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          username: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          base: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          _count: {
            select: {
              createdPurchases: true,
              createdTransfers: true,
              assignments: true,
              createdAssignments: true
            }
          }
        },
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.user.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving users' }
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        base: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true
          }
        },
        assignments: {
          where: { returnedAt: null },
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                serialNumber: true,
                equipmentType: true
              }
            }
          }
        },
        _count: {
          select: {
            createdPurchases: true,
            createdTransfers: true,
            assignments: true,
            createdAssignments: true,
            createdExpenditures: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving user' }
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res) => {
  try {
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      role,
      baseId
    } = req.body;

    const currentUser = req.user;

    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { 
          message: existingUser.email === email 
            ? 'User with this email already exists' 
            : 'User with this username already exists' 
        }
      });
    }

    // Validate base if provided
    if (baseId) {
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      });

      if (!base) {
        return res.status(404).json({
          success: false,
          error: { message: 'Base not found' }
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        baseId
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        base: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    logger.info(`User created: ${username} (${role}) by user ${currentUser.username}`);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Create user error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'User with this email or username already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error creating user' }
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      role,
      baseId,
      isActive
    } = req.body;

    const currentUser = req.user;

    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Check if email or username is being changed and if it already exists
    if ((email && email !== existingUser.email) || (username && username !== existingUser.username)) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(email ? [{ email }] : []),
                ...(username ? [{ username }] : [])
              ]
            }
          ]
        }
      });

      if (duplicateUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: duplicateUser.email === email
              ? 'User with this email already exists'
              : 'User with this username already exists'
          }
        });
      }
    }

    // Validate base if provided
    if (baseId) {
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      });

      if (!base) {
        return res.status(404).json({
          success: false,
          error: { message: 'Base not found' }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    if (baseId !== undefined) updateData.baseId = baseId;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Hash password if provided
    if (password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        base: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    logger.info(`User updated: ${updatedUser.username} by user ${currentUser.username}`);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Update user error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: { message: 'User with this email or username already exists' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error updating user' }
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete your own account' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdPurchases: true,
            createdTransfers: true,
            assignments: true,
            createdAssignments: true,
            createdExpenditures: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Check if user has any associated data
    const hasData = user._count.createdPurchases > 0 ||
                   user._count.createdTransfers > 0 ||
                   user._count.assignments > 0 ||
                   user._count.createdAssignments > 0 ||
                   user._count.createdExpenditures > 0;

    if (hasData) {
      // Soft delete - just deactivate the user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          base: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      logger.info(`User deactivated: ${user.username} by user ${currentUser.username}`);

      res.json({
        success: true,
        data: updatedUser,
        message: 'User deactivated successfully (has associated data)'
      });
    } else {
      // Hard delete if no associated data
      await prisma.user.delete({
        where: { id }
      });

      logger.info(`User deleted: ${user.username} by user ${currentUser.username}`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error deleting user' }
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
