import Tweet from '../models/tweet.model.js';
import Campaign from '../models/campaign.model.js';
import Alert from '../models/alert.model.js';
import Evidence from '../models/evidence.model.js';
import User from '../models/user.model.js';
import socketService from './socketService.js';

class AnalyticsDataService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.realTimeMetrics = new Map();
    this.startMetricsCollection();
  }

  // Real-time metrics collection
  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect performance metrics every 5 minutes
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 300000);

    console.log('📊 Real-time analytics collection started');
  }

  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          activeConnections: socketService.getActiveUsersCount(),
          nodeVersion: process.version
        },
        database: await this.getDatabaseMetrics(),
        application: await this.getApplicationMetrics()
      };

      this.realTimeMetrics.set('system', metrics);
      
      // Broadcast to connected clients
      socketService.broadcastMessage('system_metrics', metrics);

    } catch (error) {
      console.error('System metrics collection error:', error);
    }
  }

  async collectPerformanceMetrics() {
    try {
      const performance = {
        timestamp: new Date(),
        database: await this.getDatabasePerformance(),
        application: await this.getApplicationPerformance(),
        alerts: await this.getAlertPerformance()
      };

      this.realTimeMetrics.set('performance', performance);
      
      // Broadcast performance updates
      socketService.broadcastMessage('performance_metrics', performance);

    } catch (error) {
      console.error('Performance metrics collection error:', error);
    }
  }

  // Dashboard overview data
  async getDashboardOverview(userId, timeRange = 24) {
    try {
      const cacheKey = `dashboard_${userId}_${timeRange}`;
      
      // Check cache first
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const hoursAgo = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      const overview = {
        timestamp: new Date(),
        summary: await this.getSummaryStats(userId, hoursAgo),
        campaigns: await this.getCampaignStats(userId, hoursAgo),
        alerts: await this.getAlertStats(userId, hoursAgo),
        content: await this.getContentStats(userId, hoursAgo),
        threats: await this.getThreatStats(userId, hoursAgo),
        trends: await this.getTrendData(userId, hoursAgo),
        realTime: {
          activeUsers: socketService.getActiveUsersCount(),
          systemHealth: await this.getSystemHealth(),
          lastUpdate: new Date()
        }
      };

      // Cache for 5 minutes
      this.setCacheWithExpiry(cacheKey, overview, 5 * 60 * 1000);
      
      return overview;

    } catch (error) {
      console.error('Dashboard overview error:', error);
      throw error;
    }
  }

  async getSummaryStats(userId, since) {
    const [totalCampaigns, activeCampaigns, totalTweets, totalAlerts, openAlerts] = await Promise.all([
      Campaign.countDocuments({ createdBy: userId }),
      Campaign.countDocuments({ 
        createdBy: userId, 
        status: { $in: ['active', 'monitoring'] }
      }),
      Tweet.countDocuments({ 
        createdAt: { $gte: since }
      }),
      Alert.countDocuments({ 
        createdAt: { $gte: since },
        isArchived: false
      }),
      Alert.countDocuments({ 
        status: { $in: ['open', 'investigating'] },
        isArchived: false
      })
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalTweets,
      totalAlerts,
      openAlerts,
      alertsToday: totalAlerts,
      systemStatus: await this.getSystemStatus()
    };
  }

  async getCampaignStats(userId, since) {
    const pipeline = [
      {
        $match: {
          createdBy: userId,
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgTweets: { $avg: '$tweetCount' }
        }
      }
    ];

    const statusStats = await Campaign.aggregate(pipeline);
    
    // Recent campaigns
    const recentCampaigns = await Campaign.find({
      createdBy: userId
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name status priority createdAt tweetCount')
    .lean();

    // Campaign performance
    const performancePipeline = [
      {
        $match: {
          createdBy: userId,
          status: { $in: ['active', 'completed'] }
        }
      },
      {
        $project: {
          name: 1,
          tweetCount: 1,
          alertsGenerated: 1,
          efficiency: {
            $cond: [
              { $gt: ['$tweetCount', 0] },
              { $divide: ['$alertsGenerated', '$tweetCount'] },
              0
            ]
          }
        }
      },
      {
        $sort: { efficiency: -1 }
      },
      {
        $limit: 10
      }
    ];

    const topPerforming = await Campaign.aggregate(performancePipeline);

    return {
      byStatus: statusStats,
      recent: recentCampaigns,
      topPerforming
    };
  }

  async getAlertStats(userId, since) {
    // Alert distribution by severity
    const severityPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          isArchived: false
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      }
    ];

    const bySeverity = await Alert.aggregate(severityPipeline);

    // Alert trends over time
    const trendPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          isArchived: false
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.day': 1, '_id.hour': 1 }
      }
    ];

    const trends = await Alert.aggregate(trendPipeline);

    // Response time analysis
    const responseTimePipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          status: 'resolved',
          resolvedAt: { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          },
          severity: 1
        }
      },
      {
        $group: {
          _id: '$severity',
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          count: { $sum: 1 }
        }
      }
    ];

    const responseTimeStats = await Alert.aggregate(responseTimePipeline);

    return {
      bySeverity,
      trends,
      responseTimeStats,
      totalOpen: await Alert.countDocuments({ 
        status: { $in: ['open', 'investigating'] },
        isArchived: false
      })
    };
  }

  async getContentStats(userId, since) {
    // Tweet sentiment distribution
    const sentimentPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          sentiment: { $exists: true }
        }
      },
      {
        $bucket: {
          groupBy: '$sentiment',
          boundaries: [-1, -0.3, 0.3, 1],
          default: 'neutral',
          output: {
            count: { $sum: 1 },
            avgEngagement: { $avg: { $add: ['$likes', '$retweets'] } }
          }
        }
      }
    ];

    const sentimentData = await Tweet.aggregate(sentimentPipeline);

    // Classification distribution
    const classificationPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          classification: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$classification',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$classificationConfidence' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const classificationData = await Tweet.aggregate(classificationPipeline);

    // Top hashtags and mentions
    const hashtagPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          hashtags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$hashtags'
      },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          avgEngagement: { $avg: { $add: ['$likes', '$retweets'] } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ];

    const topHashtags = await Tweet.aggregate(hashtagPipeline);

    return {
      sentiment: sentimentData,
      classification: classificationData,
      topHashtags,
      totalProcessed: await Tweet.countDocuments({ createdAt: { $gte: since } })
    };
  }

  async getThreatStats(userId, since) {
    // Threat type distribution
    const threatPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          threats: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$threats'
      },
      {
        $group: {
          _id: '$threats.type',
          count: { $sum: 1 },
          avgSeverity: { $avg: '$threats.confidence' },
          platforms: { $addToSet: '$platform' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const threatTypes = await Tweet.aggregate(threatPipeline);

    // Geographic threat distribution
    const geoPipeline = [
      {
        $match: {
          createdAt: { $gte: since },
          'location.country': { $exists: true },
          threats: { $exists: true, $ne: [] }
        }
      },
      {
        $group: {
          _id: '$location.country',
          threatCount: { $sum: 1 },
          uniqueThreats: { $addToSet: '$threats.type' }
        }
      },
      {
        $sort: { threatCount: -1 }
      },
      {
        $limit: 10
      }
    ];

    const geoThreats = await Tweet.aggregate(geoPipeline);

    return {
      byType: threatTypes,
      byLocation: geoThreats,
      totalThreats: await Tweet.countDocuments({ 
        createdAt: { $gte: since },
        threats: { $exists: true, $ne: [] }
      })
    };
  }

  async getTrendData(userId, since) {
    // Activity trends over time
    const activityPipeline = [
      {
        $match: {
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          tweets: { $sum: 1 },
          avgSentiment: { $avg: '$sentiment' },
          threats: {
            $sum: {
              $cond: [
                { $and: [{ $exists: ['$threats'] }, { $gt: [{ $size: '$threats' }, 0] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.day': 1, '_id.hour': 1 }
      }
    ];

    const activityTrends = await Tweet.aggregate(activityPipeline);

    // Engagement trends
    const engagementPipeline = [
      {
        $match: {
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' }
          },
          avgLikes: { $avg: '$likes' },
          avgRetweets: { $avg: '$retweets' },
          avgReplies: { $avg: '$replies' },
          totalEngagement: {
            $avg: { $add: ['$likes', '$retweets', '$replies'] }
          }
        }
      },
      {
        $sort: { '_id.hour': 1 }
      }
    ];

    const engagementTrends = await Tweet.aggregate(engagementPipeline);

    return {
      activity: activityTrends,
      engagement: engagementTrends
    };
  }

  // Real-time data streams
  async getRealtimeData(type, options = {}) {
    try {
      switch (type) {
        case 'live_tweets':
          return await this.getLiveTweets(options);
        case 'live_alerts':
          return await this.getLiveAlerts(options);
        case 'system_status':
          return this.realTimeMetrics.get('system') || {};
        case 'activity_feed':
          return await this.getActivityFeed(options);
        default:
          throw new Error('Unknown realtime data type');
      }
    } catch (error) {
      console.error('Realtime data error:', error);
      return null;
    }
  }

  async getLiveTweets(options = {}) {
    const { limit = 20, campaignId } = options;
    
    const query = { createdAt: { $gte: new Date(Date.now() - 60000) } }; // Last minute
    if (campaignId) {
      query.campaign = campaignId;
    }

    const tweets = await Tweet.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('campaign', 'name')
      .lean();

    return {
      tweets,
      count: tweets.length,
      timestamp: new Date()
    };
  }

  async getLiveAlerts(options = {}) {
    const { limit = 10, severity } = options;
    
    const query = { 
      createdAt: { $gte: new Date(Date.now() - 300000) }, // Last 5 minutes
      isArchived: false
    };
    
    if (severity) {
      query.severity = severity;
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name')
      .lean();

    return {
      alerts,
      count: alerts.length,
      timestamp: new Date()
    };
  }

  async getActivityFeed(options = {}) {
    const { limit = 50, userId } = options;
    
    // This would typically come from an activity log collection
    // For now, we'll create a synthetic activity feed
    const activities = [];
    
    // Recent tweets
    const recentTweets = await Tweet.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('campaign', 'name')
      .lean();
    
    recentTweets.forEach(tweet => {
      activities.push({
        type: 'tweet_analyzed',
        timestamp: tweet.createdAt,
        data: {
          content: tweet.content.substring(0, 100),
          campaign: tweet.campaign?.name,
          sentiment: tweet.sentiment,
          threats: tweet.threats?.length || 0
        }
      });
    });

    // Recent alerts
    const recentAlerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    recentAlerts.forEach(alert => {
      activities.push({
        type: 'alert_created',
        timestamp: alert.createdAt,
        data: {
          title: alert.title,
          severity: alert.severity,
          type: alert.type
        }
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Performance monitoring
  async getDatabaseMetrics() {
    try {
      // MongoDB stats would go here
      // This is a simplified version
      return {
        collections: {
          tweets: await Tweet.estimatedDocumentCount(),
          campaigns: await Campaign.estimatedDocumentCount(),
          alerts: await Alert.estimatedDocumentCount(),
          evidence: await Evidence.estimatedDocumentCount(),
          users: await User.estimatedDocumentCount()
        },
        indexes: 'healthy', // Would check index performance
        connections: 'normal' // Would check connection pool
      };
    } catch (error) {
      console.error('Database metrics error:', error);
      return { status: 'error', error: error.message };
    }
  }

  async getApplicationMetrics() {
    return {
      routes: {
        totalRequests: 0, // Would track request counts
        averageResponseTime: 0, // Would track response times
        errorRate: 0 // Would track error rates
      },
      features: {
        activeSearches: 0,
        activeCrawlers: 0,
        queuedTasks: 0
      }
    };
  }

  async getDatabasePerformance() {
    // This would include real database performance metrics
    return {
      queryPerformance: {
        averageQueryTime: 0,
        slowQueries: 0,
        indexEfficiency: 100
      },
      storage: {
        totalSize: 0,
        availableSpace: 0,
        growthRate: 0
      }
    };
  }

  async getApplicationPerformance() {
    return {
      apiPerformance: {
        averageResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      },
      resourceUsage: {
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        eventLoopLag: 0
      }
    };
  }

  async getAlertPerformance() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      alertsGenerated: await Alert.countDocuments({
        createdAt: { $gte: oneHourAgo }
      }),
      averageResponseTime: 0, // Would calculate from alert lifecycle
      falsePositiveRate: 0, // Would calculate from alert feedback
      escalationRate: await Alert.countDocuments({
        createdAt: { $gte: oneHourAgo },
        escalated: true
      }) / Math.max(1, await Alert.countDocuments({
        createdAt: { $gte: oneHourAgo }
      }))
    };
  }

  async getSystemHealth() {
    const health = {
      status: 'healthy',
      services: {
        database: 'connected',
        redis: 'connected',
        socketio: 'active',
        crawler: 'running'
      },
      performance: {
        responseTime: 'normal',
        throughput: 'normal',
        errorRate: 'low'
      },
      timestamp: new Date()
    };

    return health;
  }

  async getSystemStatus() {
    const stats = this.realTimeMetrics.get('system');
    if (!stats) return 'unknown';

    const memoryUsage = stats.system.memory.heapUsed / stats.system.memory.heapTotal;
    const uptime = stats.system.uptime;

    if (memoryUsage > 0.9) return 'critical';
    if (memoryUsage > 0.8) return 'warning';
    if (uptime < 3600) return 'starting'; // Less than 1 hour
    
    return 'operational';
  }

  // Cache management
  setCacheWithExpiry(key, data, ttl) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
    
    // Clean up expired cache entries
    setTimeout(() => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    }, ttl);
  }

  isValidCache(key) {
    const expiry = this.cacheExpiry.get(key);
    return expiry && Date.now() < expiry;
  }

  // Export data for reports
  async exportAnalyticsData(type, options = {}) {
    try {
      switch (type) {
        case 'dashboard':
          return await this.getDashboardOverview(options.userId, options.timeRange);
        case 'campaigns':
          return await this.getCampaignStats(options.userId, new Date(Date.now() - 24 * 60 * 60 * 1000));
        case 'alerts':
          return await this.getAlertStats(options.userId, new Date(Date.now() - 24 * 60 * 60 * 1000));
        case 'threats':
          return await this.getThreatStats(options.userId, new Date(Date.now() - 24 * 60 * 60 * 1000));
        default:
          throw new Error('Unknown export type');
      }
    } catch (error) {
      console.error('Export analytics data error:', error);
      throw error;
    }
  }
}

export default new AnalyticsDataService();