import AnalyticsService from '../services/analyticsService.js';
import Campaign from '../models/campaign.model.js';
import Joi from 'joi';

const analyticsService = new AnalyticsService();

// Validation schemas
const timeSeriesSchema = Joi.object({
  campaignId: Joi.string().required(),
  timeRange: Joi.string().valid('1h', '6h', '24h', '7d', '30d', '90d').default('7d'),
  granularity: Joi.string().valid('hour', 'day', 'week', 'month').default('day')
});

const platformComparisonSchema = Joi.object({
  campaignIds: Joi.array().items(Joi.string()).min(1).max(10).required(),
  timeRange: Joi.string().valid('1h', '6h', '24h', '7d', '30d', '90d').default('7d')
});

// Get time-series analytics for a campaign
export const getTimeSeriesAnalytics = async (req, res) => {
  try {
    const { error, value } = timeSeriesSchema.validate({
      campaignId: req.params.campaignId,
      ...req.query
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { campaignId, timeRange, granularity } = value;

    // Check campaign access
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const hasAccess = campaign.createdBy.toString() === req.user._id.toString() ||
                     campaign.team.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const analytics = await analyticsService.generateTimeSeriesData(campaignId, timeRange, granularity);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate time series analytics',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      message: 'Time series analytics generated successfully',
      data: analytics.data,
      metadata: analytics.metadata
    });
  } catch (error) {
    console.error('Get time series analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get time series analytics'
    });
  }
};

// Get sentiment analytics for a campaign
export const getSentimentAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange = '7d' } = req.query;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const analytics = await analyticsService.generateSentimentAnalytics(campaignId, timeRange);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate sentiment analytics',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      message: 'Sentiment analytics generated successfully',
      data: analytics.data
    });
  } catch (error) {
    console.error('Get sentiment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sentiment analytics'
    });
  }
};

// Get network analytics for a campaign
export const getNetworkAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { minInteractions = 2 } = req.query;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const analytics = await analyticsService.generateNetworkAnalytics(campaignId, parseInt(minInteractions));

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate network analytics',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      message: 'Network analytics generated successfully',
      data: analytics.data
    });
  } catch (error) {
    console.error('Get network analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get network analytics'
    });
  }
};

// Get geographic analytics for a campaign
export const getGeographicAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const analytics = await analyticsService.generateGeographicAnalytics(campaignId);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate geographic analytics',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      message: 'Geographic analytics generated successfully',
      data: analytics.data
    });
  } catch (error) {
    console.error('Get geographic analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get geographic analytics'
    });
  }
};

// Get influence propagation analytics
export const getInfluenceAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange = '7d' } = req.query;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const analytics = await analyticsService.generateInfluenceAnalytics(campaignId, timeRange);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate influence analytics',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      message: 'Influence analytics generated successfully',
      data: analytics.data
    });
  } catch (error) {
    console.error('Get influence analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get influence analytics'
    });
  }
};

// Compare multiple campaigns/platforms
export const getPlatformComparison = async (req, res) => {
  try {
    const { error, value } = platformComparisonSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { campaignIds, timeRange } = value;

    const analytics = await analyticsService.generatePlatformComparison(campaignIds, timeRange);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate platform comparison',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      message: 'Platform comparison generated successfully',
      data: analytics.data
    });
  } catch (error) {
    console.error('Get platform comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform comparison'
    });
  }
};

// Get comprehensive analytics dashboard
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange = '7d' } = req.query;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Generate all analytics in parallel
    const [
      timeSeriesResult,
      sentimentResult,
      networkResult,
      influenceResult
    ] = await Promise.all([
      analyticsService.generateTimeSeriesData(campaignId, timeRange, 'day'),
      analyticsService.generateSentimentAnalytics(campaignId, timeRange),
      analyticsService.generateNetworkAnalytics(campaignId, 2),
      analyticsService.generateInfluenceAnalytics(campaignId, timeRange)
    ]);

    const dashboard = {
      campaign: {
        id: campaign._id,
        name: campaign.name,
        topic: campaign.topic,
        status: campaign.status,
        priority: campaign.priority
      },
      timeRange,
      analytics: {
        timeSeries: timeSeriesResult.success ? timeSeriesResult.data : null,
        sentiment: sentimentResult.success ? sentimentResult.data : null,
        network: networkResult.success ? networkResult.data : null,
        influence: influenceResult.success ? influenceResult.data : null
      },
      summary: this.generateDashboardSummary({
        timeSeries: timeSeriesResult.data,
        sentiment: sentimentResult.data,
        network: networkResult.data,
        influence: influenceResult.data
      }),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Analytics dashboard generated successfully',
      data: dashboard
    });
  } catch (error) {
    console.error('Get analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics dashboard'
    });
  }
};

// Helper function to generate dashboard summary
function generateDashboardSummary(analytics) {
  const summary = {
    totalActivity: 0,
    riskLevel: 'low',
    keyInsights: [],
    recommendations: []
  };

  // Time series insights
  if (analytics.timeSeries && analytics.timeSeries.length > 0) {
    const totalTweets = analytics.timeSeries.reduce((sum, point) => sum + point.total, 0);
    const totalFake = analytics.timeSeries.reduce((sum, point) => sum + point.fake, 0);
    
    summary.totalActivity = totalTweets;
    
    if (totalTweets > 0) {
      const fakeRatio = totalFake / totalTweets;
      if (fakeRatio > 0.3) {
        summary.riskLevel = 'high';
        summary.keyInsights.push(`High misinformation rate detected: ${Math.round(fakeRatio * 100)}%`);
        summary.recommendations.push('Immediate investigation recommended for misinformation sources');
      } else if (fakeRatio > 0.1) {
        summary.riskLevel = 'medium';
        summary.keyInsights.push(`Moderate misinformation detected: ${Math.round(fakeRatio * 100)}%`);
      }
    }
  }

  // Sentiment insights
  if (analytics.sentiment && analytics.sentiment.timeline) {
    const recentSentiment = analytics.sentiment.timeline[analytics.sentiment.timeline.length - 1];
    if (recentSentiment && recentSentiment.avgSentiment < -0.3) {
      summary.keyInsights.push('Negative sentiment trending in recent content');
      summary.recommendations.push('Monitor for emotional manipulation tactics');
    }
  }

  // Network insights
  if (analytics.network && analytics.network.influentialAccounts) {
    const topInfluencer = analytics.network.influentialAccounts[0];
    if (topInfluencer) {
      summary.keyInsights.push(`Top influencer: @${topInfluencer.id} (${topInfluencer.tweets} tweets)`);
    }
  }

  // Influence insights
  if (analytics.influence && analytics.influence.metrics) {
    if (analytics.influence.metrics.influenceGrowthRate > 50) {
      summary.keyInsights.push('Rapid influence growth detected');
      summary.recommendations.push('Monitor for coordinated amplification');
    }
  }

  return summary;
}