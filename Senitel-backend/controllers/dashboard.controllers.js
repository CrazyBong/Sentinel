import analyticsDataService from '../services/analyticsDataService.js';
import socketService from '../services/socketService.js';
import Joi from 'joi';

// Validation schemas
const overviewSchema = Joi.object({
  timeRange: Joi.number().min(1).max(168).default(24), // 1 hour to 1 week
  campaignId: Joi.string().optional(),
  refresh: Joi.boolean().default(false)
});

const realtimeSchema = Joi.object({
  type: Joi.string().valid('live_tweets', 'live_alerts', 'system_status', 'activity_feed').required(),
  limit: Joi.number().min(1).max(100).default(20),
  campaignId: Joi.string().optional(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
});

const exportSchema = Joi.object({
  type: Joi.string().valid('dashboard', 'campaigns', 'alerts', 'threats').required(),
  format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
  timeRange: Joi.number().min(1).max(168).default(24)
});

// Dashboard overview
export const getDashboardOverview = async (req, res) => {
  try {
    const { error, value } = overviewSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { timeRange, campaignId, refresh } = value;

    // Force refresh if requested
    if (refresh) {
      analyticsDataService.cache.clear();
    }

    // Add better error handling for MongoDB aggregation issues
    let overview;
    try {
      overview = await analyticsDataService.getDashboardOverview(
        req.user._id,
        timeRange
      );
    } catch (dbError) {
      // Check for specific MongoDB aggregation errors
      if (dbError.code === 168 && dbError.codeName === 'InvalidPipelineOperator') {
        console.error('MongoDB aggregation pipeline error - $exists used incorrectly:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Database query error - please check aggregation pipeline',
          error: 'Invalid aggregation operator usage'
        });
      }
      throw dbError; // Re-throw other errors
    }

    res.json({
      success: true,
      data: overview,
      meta: {
        timeRange,
        campaignId,
        userId: req.user._id,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard overview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Real-time data streams
export const getRealtimeData = async (req, res) => {
  try {
    const { error, value } = realtimeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const data = await analyticsDataService.getRealtimeData(value.type, value);

    res.json({
      success: true,
      data,
      meta: {
        type: value.type,
        timestamp: new Date(),
        refreshRate: '30s' // Recommended refresh rate
      }
    });

  } catch (error) {
    console.error('Realtime data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get realtime data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// System metrics and health
export const getSystemMetrics = async (req, res) => {
  try {
    const systemMetrics = analyticsDataService.realTimeMetrics.get('system');
    const performanceMetrics = analyticsDataService.realTimeMetrics.get('performance');

    if (!systemMetrics) {
      return res.status(503).json({
        success: false,
        message: 'System metrics not available'
      });
    }

    res.json({
      success: true,
      data: {
        system: systemMetrics,
        performance: performanceMetrics,
        socketStats: socketService.getSystemStats(),
        health: await analyticsDataService.getSystemHealth()
      }
    });

  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Performance analytics
export const getPerformanceAnalytics = async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    const hoursAgo = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const performance = {
      timestamp: new Date(),
      database: await analyticsDataService.getDatabasePerformance(),
      application: await analyticsDataService.getApplicationPerformance(),
      alerts: await analyticsDataService.getAlertPerformance(),
      trends: await analyticsDataService.getTrendData(req.user._id, hoursAgo)
    };

    res.json({
      success: true,
      data: performance,
      meta: {
        timeRange,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Activity feed
export const getActivityFeed = async (req, res) => {
  try {
    const { limit = 50, type, since } = req.query;
    
    const options = {
      limit: parseInt(limit),
      userId: req.user._id
    };

    if (type) options.type = type;
    if (since) options.since = new Date(since);

    const activities = await analyticsDataService.getActivityFeed(options);

    res.json({
      success: true,
      data: {
        activities,
        count: activities.length,
        hasMore: activities.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity feed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Quick stats
export const getQuickStats = async (req, res) => {
  try {
    const stats = await analyticsDataService.getSummaryStats(
      req.user._id,
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quick stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export analytics data
export const exportAnalyticsData = async (req, res) => {
  try {
    const { error, value } = exportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { type, format, timeRange } = value;

    const data = await analyticsDataService.exportAnalyticsData(type, {
      userId: req.user._id,
      timeRange
    });

    if (format === 'json') {
      res.json({
        success: true,
        data,
        meta: {
          type,
          format,
          timeRange,
          exportedAt: new Date(),
          exportedBy: req.user._id
        }
      });
    } else {
      // For CSV and PDF exports, we would implement file generation
      res.status(501).json({
        success: false,
        message: `${format.toUpperCase()} export not yet implemented`
      });
    }

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Campaign analytics
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange = 24 } = req.query;
    
    const hoursAgo = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const analytics = {
      campaign: campaignId,
      timeRange,
      content: await analyticsDataService.getContentStats(req.user._id, hoursAgo),
      threats: await analyticsDataService.getThreatStats(req.user._id, hoursAgo),
      alerts: await analyticsDataService.getAlertStats(req.user._id, hoursAgo),
      trends: await analyticsDataService.getTrendData(req.user._id, hoursAgo),
      realtime: await analyticsDataService.getRealtimeData('live_tweets', { campaignId })
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Alert analytics
export const getAlertAnalytics = async (req, res) => {
  try {
    const { timeRange = 24, severity, status, type } = req.query;
    const hoursAgo = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const analytics = await analyticsDataService.getAlertStats(req.user._id, hoursAgo);

    // Apply additional filters if specified
    if (severity) {
      analytics.bySeverity = analytics.bySeverity.filter(item => 
        severity.split(',').includes(item._id)
      );
    }

    res.json({
      success: true,
      data: analytics,
      meta: {
        timeRange,
        filters: { severity, status, type },
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Alert analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alert analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Threat intelligence
export const getThreatIntelligence = async (req, res) => {
  try {
    const { timeRange = 24, threatType, location } = req.query;
    const hoursAgo = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const threats = await analyticsDataService.getThreatStats(req.user._id, hoursAgo);

    // Apply filters
    if (threatType) {
      threats.byType = threats.byType.filter(item => 
        threatType.split(',').includes(item._id)
      );
    }

    if (location) {
      threats.byLocation = threats.byLocation.filter(item => 
        location.split(',').includes(item._id)
      );
    }

    res.json({
      success: true,
      data: threats,
      meta: {
        timeRange,
        filters: { threatType, location },
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Threat intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get threat intelligence',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};