const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authorize } = require('../middleware/auth');

// @route   GET /api/dashboard/metrics
// @desc    Get dashboard metrics
// @access  Private (All roles)
router.get('/metrics', dashboardController.getMetrics);

// @route   GET /api/dashboard/net-movement-details
// @desc    Get detailed net movement breakdown
// @access  Private (All roles)
router.get('/net-movement-details', dashboardController.getNetMovementDetails);

// @route   GET /api/dashboard/recent-activities
// @desc    Get recent activities
// @access  Private (All roles)
router.get('/recent-activities', dashboardController.getRecentActivities);

// @route   GET /api/dashboard/asset-distribution
// @desc    Get asset distribution by type and base
// @access  Private (All roles)
router.get('/asset-distribution', dashboardController.getAssetDistribution);

module.exports = router;
