const prisma = require('../utils/database');
const logger = require('../utils/logger');

// Helper function to build base filter based on user role
const buildBaseFilter = (user, baseId = null) => {
  if (user.role === 'ADMIN') {
    return baseId ? { baseId } : {};
  }
  
  // Base commanders and logistics officers can only see their base
  return { baseId: baseId || user.baseId };
};

// Helper function to parse date filters
const parseDateFilter = (dateFrom, dateTo) => {
  const filter = {};
  
  if (dateFrom) {
    filter.gte = new Date(dateFrom);
  }
  
  if (dateTo) {
    filter.lte = new Date(dateTo);
  }
  
  return Object.keys(filter).length > 0 ? filter : undefined;
};

// @desc    Get dashboard metrics
// @route   GET /api/dashboard/metrics
// @access  Private
const getMetrics = async (req, res) => {
  try {
    const { baseId, equipmentType, dateFrom, dateTo } = req.query;
    const user = req.user;

    // Build filters
    const baseFilter = buildBaseFilter(user, baseId);
    const equipmentFilter = equipmentType ? { equipmentType } : {};
    const dateFilter = parseDateFilter(dateFrom, dateTo);

    // Get opening balance (assets at start of period)
    const openingBalanceFilter = {
      ...baseFilter,
      ...equipmentFilter,
      createdAt: dateFilter ? { lt: dateFilter.gte || new Date() } : undefined
    };

    const openingBalance = await prisma.asset.count({
      where: {
        ...openingBalanceFilter,
        status: { not: 'EXPENDED' }
      }
    });

    // Get current balance (all available assets)
    const currentBalance = await prisma.asset.count({
      where: {
        ...baseFilter,
        ...equipmentFilter,
        status: { not: 'EXPENDED' }
      }
    });

    // Get purchases in period
    const purchaseFilter = {
      ...baseFilter,
      purchaseDate: dateFilter
    };

    const purchases = await prisma.purchase.count({
      where: purchaseFilter
    });

    // Get transfers in period
    const transferInFilter = {
      toBase: baseFilter.baseId ? { id: baseFilter.baseId } : undefined,
      status: 'COMPLETED',
      completedAt: dateFilter
    };

    const transfersIn = await prisma.transfer.count({
      where: transferInFilter
    });

    const transferOutFilter = {
      fromBase: baseFilter.baseId ? { id: baseFilter.baseId } : undefined,
      status: 'COMPLETED',
      completedAt: dateFilter
    };

    const transfersOut = await prisma.transfer.count({
      where: transferOutFilter
    });

    // Get assignments in period
    const assignmentFilter = {
      ...baseFilter,
      assignedAt: dateFilter,
      returnedAt: null // Currently assigned
    };

    const assigned = await prisma.assignment.count({
      where: assignmentFilter
    });

    // Get expenditures in period
    const expenditureFilter = {
      ...baseFilter,
      expendedAt: dateFilter
    };

    const expended = await prisma.expenditure.count({
      where: expenditureFilter
    });

    // Calculate net movement
    const netMovement = purchases + transfersIn - transfersOut;

    res.json({
      success: true,
      data: {
        openingBalance,
        closingBalance: currentBalance,
        netMovement,
        purchases,
        transfersIn,
        transfersOut,
        assigned,
        expended,
        filters: {
          baseId: baseFilter.baseId,
          equipmentType,
          dateFrom,
          dateTo
        }
      }
    });
  } catch (error) {
    logger.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving dashboard metrics' }
    });
  }
};

// @desc    Get detailed net movement breakdown
// @route   GET /api/dashboard/net-movement-details
// @access  Private
const getNetMovementDetails = async (req, res) => {
  try {
    const { baseId, equipmentType, dateFrom, dateTo } = req.query;
    const user = req.user;

    const baseFilter = buildBaseFilter(user, baseId);
    const dateFilter = parseDateFilter(dateFrom, dateTo);

    // Get detailed purchases
    const purchases = await prisma.purchase.findMany({
      where: {
        ...baseFilter,
        purchaseDate: dateFilter
      },
      include: {
        base: true,
        assets: {
          where: equipmentType ? { equipmentType } : {}
        }
      },
      orderBy: { purchaseDate: 'desc' }
    });

    // Get detailed transfers in
    const transfersIn = await prisma.transfer.findMany({
      where: {
        toBase: baseFilter.baseId ? { id: baseFilter.baseId } : undefined,
        status: 'COMPLETED',
        completedAt: dateFilter
      },
      include: {
        fromBase: true,
        toBase: true,
        transferItems: {
          include: {
            asset: true
          },
          where: equipmentType ? { asset: { equipmentType } } : {}
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Get detailed transfers out
    const transfersOut = await prisma.transfer.findMany({
      where: {
        fromBase: baseFilter.baseId ? { id: baseFilter.baseId } : undefined,
        status: 'COMPLETED',
        completedAt: dateFilter
      },
      include: {
        fromBase: true,
        toBase: true,
        transferItems: {
          include: {
            asset: true
          },
          where: equipmentType ? { asset: { equipmentType } } : {}
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        purchases,
        transfersIn,
        transfersOut
      }
    });
  } catch (error) {
    logger.error('Net movement details error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving net movement details' }
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/dashboard/recent-activities
// @access  Private
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const user = req.user;

    const baseFilter = user.role === 'ADMIN' ? {} : { userId: user.id };

    const recentActivities = await prisma.auditLog.findMany({
      where: baseFilter,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: recentActivities
    });
  } catch (error) {
    logger.error('Recent activities error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving recent activities' }
    });
  }
};

// @desc    Get asset distribution
// @route   GET /api/dashboard/asset-distribution
// @access  Private
const getAssetDistribution = async (req, res) => {
  try {
    const user = req.user;
    const baseFilter = buildBaseFilter(user);

    // Asset distribution by equipment type
    const assetsByType = await prisma.asset.groupBy({
      by: ['equipmentType'],
      where: {
        ...baseFilter,
        status: { not: 'EXPENDED' }
      },
      _count: {
        id: true
      }
    });

    // Asset distribution by status
    const assetsByStatus = await prisma.asset.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: {
        id: true
      }
    });

    // Asset distribution by base (only for admins)
    let assetsByBase = [];
    if (user.role === 'ADMIN') {
      assetsByBase = await prisma.asset.groupBy({
        by: ['baseId'],
        where: {
          status: { not: 'EXPENDED' }
        },
        _count: {
          id: true
        }
      });

      // Get base names
      const baseIds = assetsByBase.map(item => item.baseId);
      const bases = await prisma.base.findMany({
        where: { id: { in: baseIds } },
        select: { id: true, name: true }
      });

      assetsByBase = assetsByBase.map(item => ({
        ...item,
        baseName: bases.find(base => base.id === item.baseId)?.name || 'Unknown'
      }));
    }

    res.json({
      success: true,
      data: {
        byType: assetsByType,
        byStatus: assetsByStatus,
        byBase: assetsByBase
      }
    });
  } catch (error) {
    logger.error('Asset distribution error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error retrieving asset distribution' }
    });
  }
};

module.exports = {
  getMetrics,
  getNetMovementDetails,
  getRecentActivities,
  getAssetDistribution
};
