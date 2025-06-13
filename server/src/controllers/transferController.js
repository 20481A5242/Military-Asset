const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Generate unique transfer code
const generateTransferCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TRF-${timestamp}-${random}`.toUpperCase();
};

// @desc    Get all transfers with filters
// @route   GET /api/transfers
// @access  Private (All roles)
const getTransfers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      fromBaseId,
      toBaseId,
      dateFrom,
      dateTo,
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
      whereClause.OR = [
        { fromBaseId: user.baseId },
        { toBaseId: user.baseId }
      ];
    } else {
      if (fromBaseId) whereClause.fromBaseId = fromBaseId;
      if (toBaseId) whereClause.toBaseId = toBaseId;
    }

    // Additional filters
    if (status) {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where: whereClause,
        include: {
          fromBase: {
            select: { id: true, name: true, code: true }
          },
          toBase: {
            select: { id: true, name: true, code: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, username: true }
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true, username: true }
          },
          transferItems: {
            include: {
              asset: {
                select: { id: true, name: true, serialNumber: true, equipmentType: true }
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
      prisma.transfer.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        transfers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get transfers error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving transfers' }
    });
  }
};

// @desc    Get transfer by ID
// @route   GET /api/transfers/:id
// @access  Private (All roles)
const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // Role-based filtering
    if (user.role === 'BASE_COMMANDER' && user.baseId) {
      whereClause.OR = [
        { fromBaseId: user.baseId },
        { toBaseId: user.baseId }
      ];
    }

    const transfer = await prisma.transfer.findFirst({
      where: whereClause,
      include: {
        fromBase: {
          select: { id: true, name: true, code: true, location: true }
        },
        toBase: {
          select: { id: true, name: true, code: true, location: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, role: true }
        },
        transferItems: {
          include: {
            asset: {
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
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transfer not found' }
      });
    }

    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    logger.error('Get transfer by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving transfer' }
    });
  }
};

// @desc    Create new transfer
// @route   POST /api/transfers
// @access  Private (Admin, Base Commander, Logistics Officer)
const createTransfer = async (req, res) => {
  try {
    const {
      fromBaseId,
      toBaseId,
      reason,
      notes,
      assets
    } = req.body;

    const user = req.user;

    // Validate that from and to bases are different
    if (fromBaseId === toBaseId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Source and destination bases must be different' }
      });
    }

    // Validate base access for base commanders
    if (user.role === 'BASE_COMMANDER' && user.baseId !== fromBaseId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Base commanders can only transfer from their assigned base' }
      });
    }

    // Check if bases exist
    const [fromBase, toBase] = await Promise.all([
      prisma.base.findUnique({ where: { id: fromBaseId } }),
      prisma.base.findUnique({ where: { id: toBaseId } })
    ]);

    if (!fromBase || !toBase) {
      return res.status(404).json({
        success: false,
        error: { message: 'One or both bases not found' }
      });
    }

    // Validate assets exist and are available
    const assetIds = assets.map(a => a.assetId);
    const availableAssets = await prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        baseId: fromBaseId,
        status: 'AVAILABLE'
      }
    });

    if (availableAssets.length !== assetIds.length) {
      return res.status(400).json({
        success: false,
        error: { message: 'Some assets are not available for transfer' }
      });
    }

    // Create transfer with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique transfer code
      let transferCode;
      let isUnique = false;
      while (!isUnique) {
        transferCode = generateTransferCode();
        const existing = await tx.transfer.findUnique({
          where: { transferCode }
        });
        if (!existing) isUnique = true;
      }

      // Create transfer
      const transfer = await tx.transfer.create({
        data: {
          transferCode,
          fromBaseId,
          toBaseId,
          reason,
          notes,
          createdById: user.id
        }
      });

      // Create transfer items and update asset status
      for (const asset of assets) {
        await tx.transferItem.create({
          data: {
            transferId: transfer.id,
            assetId: asset.assetId,
            quantity: asset.quantity || 1,
            notes: asset.notes
          }
        });

        // Update asset status to IN_TRANSIT
        await tx.asset.update({
          where: { id: asset.assetId },
          data: { status: 'IN_TRANSIT' }
        });
      }

      return transfer;
    });

    // Fetch complete transfer data
    const completeTransfer = await prisma.transfer.findUnique({
      where: { id: result.id },
      include: {
        fromBase: {
          select: { id: true, name: true, code: true }
        },
        toBase: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        transferItems: {
          include: {
            asset: {
              select: { id: true, name: true, serialNumber: true, equipmentType: true }
            }
          }
        }
      }
    });

    logger.info(`Transfer created: ${result.transferCode} by user ${user.username}`);

    res.status(201).json({
      success: true,
      data: completeTransfer,
      message: 'Transfer created successfully'
    });
  } catch (error) {
    logger.error('Create transfer error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error creating transfer' }
    });
  }
};

// @desc    Approve transfer
// @route   PUT /api/transfers/:id/approve
// @access  Private (Admin, Base Commander)
const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromBase: true,
        toBase: true,
        transferItems: {
          include: { asset: true }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transfer not found' }
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { message: 'Transfer is not in pending status' }
      });
    }

    // Base commanders can only approve transfers to their base
    if (user.role === 'BASE_COMMANDER' && user.baseId !== transfer.toBaseId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Base commanders can only approve transfers to their base' }
      });
    }

    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date(),
        notes: notes || transfer.notes
      },
      include: {
        fromBase: {
          select: { id: true, name: true, code: true }
        },
        toBase: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        transferItems: {
          include: {
            asset: {
              select: { id: true, name: true, serialNumber: true, equipmentType: true }
            }
          }
        }
      }
    });

    logger.info(`Transfer approved: ${transfer.transferCode} by user ${user.username}`);

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer approved successfully'
    });
  } catch (error) {
    logger.error('Approve transfer error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error approving transfer' }
    });
  }
};

// @desc    Complete transfer
// @route   PUT /api/transfers/:id/complete
// @access  Private (Admin, Base Commander)
const completeTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        transferItems: {
          include: { asset: true }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transfer not found' }
      });
    }

    if (transfer.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: { message: 'Transfer must be approved before completion' }
      });
    }

    // Base commanders can only complete transfers to their base
    if (user.role === 'BASE_COMMANDER' && user.baseId !== transfer.toBaseId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Base commanders can only complete transfers to their base' }
      });
    }

    // Complete transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update transfer status
      const updatedTransfer = await tx.transfer.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Update assets: move to destination base and set status to AVAILABLE
      for (const item of transfer.transferItems) {
        await tx.asset.update({
          where: { id: item.assetId },
          data: {
            baseId: transfer.toBaseId,
            status: 'AVAILABLE'
          }
        });
      }

      return updatedTransfer;
    });

    // Fetch complete transfer data
    const completeTransfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromBase: {
          select: { id: true, name: true, code: true }
        },
        toBase: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        transferItems: {
          include: {
            asset: {
              select: { id: true, name: true, serialNumber: true, equipmentType: true }
            }
          }
        }
      }
    });

    logger.info(`Transfer completed: ${transfer.transferCode} by user ${user.username}`);

    res.json({
      success: true,
      data: completeTransfer,
      message: 'Transfer completed successfully'
    });
  } catch (error) {
    logger.error('Complete transfer error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error completing transfer' }
    });
  }
};

// @desc    Cancel transfer
// @route   PUT /api/transfers/:id/cancel
// @access  Private (Admin, Base Commander)
const cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        transferItems: {
          include: { asset: true }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Transfer not found' }
      });
    }

    if (!['PENDING', 'APPROVED'].includes(transfer.status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transfer cannot be cancelled in current status' }
      });
    }

    // Base commanders can only cancel transfers from their base
    if (user.role === 'BASE_COMMANDER' && user.baseId !== transfer.fromBaseId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Base commanders can only cancel transfers from their base' }
      });
    }

    // Cancel transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update transfer status
      const updatedTransfer = await tx.transfer.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${transfer.notes || ''}\nCancellation reason: ${reason}`.trim() : transfer.notes
        }
      });

      // Restore assets to AVAILABLE status at original base
      for (const item of transfer.transferItems) {
        await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: 'AVAILABLE'
          }
        });
      }

      return updatedTransfer;
    });

    // Fetch complete transfer data
    const cancelledTransfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromBase: {
          select: { id: true, name: true, code: true }
        },
        toBase: {
          select: { id: true, name: true, code: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        transferItems: {
          include: {
            asset: {
              select: { id: true, name: true, serialNumber: true, equipmentType: true }
            }
          }
        }
      }
    });

    logger.info(`Transfer cancelled: ${transfer.transferCode} by user ${user.username}`);

    res.json({
      success: true,
      data: cancelledTransfer,
      message: 'Transfer cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel transfer error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error cancelling transfer' }
    });
  }
};

module.exports = {
  getTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  completeTransfer,
  cancelTransfer
};
