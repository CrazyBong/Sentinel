import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Dashboard overview
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    // Quick dashboard data - we'll expand this later
    const dashboardData = {
      stats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalTweets: 0,
        alertsToday: 0
      },
      recentActivity: [],
      topThreats: [],
      systemStatus: 'operational'
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard overview'
    });
  }
});

// Quick stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        campaigns: { total: 0, active: 0 },
        tweets: { total: 0, today: 0 },
        alerts: { total: 0, today: 0 },
        evidence: { total: 0, size: 0 }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
});

export default router;