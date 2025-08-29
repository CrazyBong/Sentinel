import express from 'express';
import {
  getTimeSeriesAnalytics,
  getSentimentAnalytics,
  getNetworkAnalytics,
  getGeographicAnalytics,
  getInfluenceAnalytics,
  getPlatformComparison,
  getAnalyticsDashboard
} from '../controllers/analytics.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Campaign-specific analytics
router.get('/timeseries/:campaignId', authMiddleware, getTimeSeriesAnalytics);
router.get('/sentiment/:campaignId', authMiddleware, getSentimentAnalytics);
router.get('/network/:campaignId', authMiddleware, getNetworkAnalytics);
router.get('/geographic/:campaignId', authMiddleware, getGeographicAnalytics);
router.get('/influence/:campaignId', authMiddleware, getInfluenceAnalytics);

// Comprehensive dashboard
router.get('/dashboard/:campaignId', authMiddleware, getAnalyticsDashboard);

// Cross-campaign comparison
router.post('/compare', authMiddleware, getPlatformComparison);

export default router;