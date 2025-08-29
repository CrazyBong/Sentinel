import express from 'express';
import {
  getDashboardOverview,
  getRealtimeData,
  getSystemMetrics,
  getPerformanceAnalytics,
  getActivityFeed,
  getQuickStats,
  exportAnalyticsData,
  getCampaignAnalytics,
  getAlertAnalytics,
  getThreatIntelligence
} from '../controllers/dashboard.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Dashboard overview
router.get('/overview', authMiddleware, getDashboardOverview);

// Quick stats
router.get('/stats', authMiddleware, getQuickStats);

// Real-time data streams
router.get('/realtime', authMiddleware, getRealtimeData);

// System metrics and monitoring
router.get('/system/metrics', authMiddleware, getSystemMetrics);
router.get('/system/performance', authMiddleware, getPerformanceAnalytics);

// Activity feed
router.get('/activity', authMiddleware, getActivityFeed);

// Analytics exports
router.post('/export', authMiddleware, exportAnalyticsData);

// Specific analytics
router.get('/campaigns/:campaignId/analytics', authMiddleware, getCampaignAnalytics);
router.get('/alerts/analytics', authMiddleware, getAlertAnalytics);
router.get('/threats/intelligence', authMiddleware, getThreatIntelligence);

export default router;