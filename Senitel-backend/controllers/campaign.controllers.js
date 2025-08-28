import Campaign from '../models/campaign.model.js';
import CampaignNote from '../models/campaignNote.model.js';
import Tag from '../models/tag.model.js';
import Tweet from '../models/tweet.model.js';
import Alert from '../models/alert.model.js';
import socketService from '../services/socketService.js';
import Joi from 'joi';

// Validation schemas
const campaignSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().min(10).max(500).required(),
  topic: Joi.string().trim().min(2).max(100).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  category: Joi.string().valid('misinformation', 'propaganda', 'bot_activity', 'general', 'political', 'health', 'finance').default('general'),
  platforms: Joi.array().items(Joi.string().valid('x', 'reddit', 'facebook', 'tiktok', 'youtube')).default(['x']),
  keywords: Joi.array().items(Joi.string().trim()).default([]),
  hashtags: Joi.array().items(Joi.string().trim()).default([]),
  targetAccounts: Joi.array().items(
    Joi.object({
      platform: Joi.string().valid('x', 'reddit', 'facebook', 'tiktok', 'youtube').required(),
      username: Joi.string().required(),
      handle: Joi.string().optional(),
      notes: Joi.string().optional()
    })
  ).default([]),
  settings: Joi.object({
    maxTweets: Joi.number().integer().min(1).max(1000).default(100),
    crawlInterval: Joi.number().integer().min(60000).default(300000),
    alertThreshold: Joi.number().min(0).max(1).default(0.7),
    enableRealTimeAlerts: Joi.boolean().default(true),
    autoClassification: Joi.boolean().default(true)
  }).default({}),
  tags: Joi.array().items(Joi.string()).default([])
});

const noteSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  type: Joi.string().valid('general', 'analysis', 'action_item', 'important', 'update').default('general'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  mentions: Joi.array().items(Joi.string()).default([])
});

// Create new campaign
export const createCampaign = async (req, res) => {
  try {
    const { error, value } = campaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Process tags
    const tagIds = [];
    if (value.tags && value.tags.length > 0) {
      for (const tagName of value.tags) {
        let tag = await Tag.findOne({ name: tagName.toLowerCase() });
        if (!tag) {
          tag = new Tag({
            name: tagName.toLowerCase(),
            createdBy: req.user._id
          });
          await tag.save();
        }
        tag.usageCount += 1;
        await tag.save();
        tagIds.push(tag._id);
      }
    }

    const campaign = new Campaign({
      ...value,
      tags: tagIds,
      createdBy: req.user._id,
      team: [{
        user: req.user._id,
        role: 'lead'
      }]
    });

    await campaign.save();
    await campaign.populate(['createdBy', 'tags', 'team.user']);

    // Send real-time update
    socketService.sendCampaignUpdate({
      id: campaign._id,
      title: campaign.name,
      description: campaign.description,
      severity: campaign.severity,
      activity: campaign.activityScore,
      reposts: campaign.stats.totalTweets,
      lead: { name: req.user.name }
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign }
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign'
    });
  }
};

// Get all campaigns with advanced filtering
export const getCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      tags,
      archived = 'false'
    } = req.query;

    // Build query
    const query = {
      isArchived: archived === 'true'
    };

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (tags) {
      const tagList = tags.split(',');
      const tagObjects = await Tag.find({ name: { $in: tagList } });
      const tagIds = tagObjects.map(tag => tag._id);
      query.tags = { $in: tagIds };
    }

    // Add search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } }
      ];
    }

    // Add user access filter (only campaigns user has access to)
    query.$or = [
      { createdBy: req.user._id },
      { 'team.user': req.user._id }
    ];

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const campaigns = await Campaign.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .populate('tags', 'name color')
      .populate('team.user', 'name email')
      .lean();

    const total = await Campaign.countDocuments(query);

    // Add calculated fields
    const enrichedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      severity: calculateSeverity(campaign.stats),
      activityScore: calculateActivity(campaign.stats),
      sparkData: generateSparkData() // Generate activity sparkline data
    }));

    res.json({
      success: true,
      data: {
        campaigns: enrichedCampaigns,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
        filters: {
          statuses: await Campaign.distinct('status'),
          priorities: await Campaign.distinct('priority'),
          categories: await Campaign.distinct('category')
        }
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve campaigns'
    });
  }
};

// Get single campaign details
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate('createdBy', 'name email avatar')
      .populate('tags', 'name color description')
      .populate('team.user', 'name email avatar role')
      .lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check access permissions
    const hasAccess = campaign.createdBy._id.toString() === req.user._id.toString() ||
                     campaign.team.some(member => member.user._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get recent notes
    const recentNotes = await CampaignNote.find({ campaign: id })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(10)
      .populate('author', 'name email avatar')
      .lean();

    // Get recent tweets
    const recentTweets = await Tweet.find({ searchTopic: campaign.topic })
      .sort({ crawledAt: -1 })
      .limit(20)
      .lean();

    // Get related alerts
    const relatedAlerts = await Alert.find({ campaign: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate additional stats
    const tweetStats = await Tweet.aggregate([
      { $match: { searchTopic: campaign.topic } },
      {
        $group: {
          _id: '$classification',
          count: { $sum: 1 },
          avgEngagement: { $avg: { $add: ['$likes', '$retweets', '$replies'] } }
        }
      }
    ]);

    const enrichedCampaign = {
      ...campaign,
      severity: calculateSeverity(campaign.stats),
      activityScore: calculateActivity(campaign.stats),
      sparkData: generateSparkData(),
      recentNotes,
      recentTweets: recentTweets.slice(0, 10),
      relatedAlerts,
      tweetStats,
      analytics: {
        totalTweets: campaign.stats.totalTweets,
        engagementRate: calculateEngagementRate(recentTweets),
        sentimentTrend: generateSentimentTrend(),
        timelineData: generateTimelineData()
      }
    };

    res.json({
      success: true,
      data: { campaign: enrichedCampaign }
    });
  } catch (error) {
    console.error('Get campaign by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve campaign'
    });
  }
};

// Update campaign
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = campaignSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check permissions
    const hasEditAccess = campaign.createdBy.toString() === req.user._id.toString() ||
                         campaign.team.some(member => 
                           member.user.toString() === req.user._id.toString() && 
                           ['lead', 'analyst'].includes(member.role)
                         );

    if (!hasEditAccess) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to edit this campaign'
      });
    }

    // Process tags if provided
    let tagIds = campaign.tags;
    if (value.tags) {
      tagIds = [];
      for (const tagName of value.tags) {
        let tag = await Tag.findOne({ name: tagName.toLowerCase() });
        if (!tag) {
          tag = new Tag({
            name: tagName.toLowerCase(),
            createdBy: req.user._id
          });
          await tag.save();
        }
        tagIds.push(tag._id);
      }
    }

    // Update campaign
    Object.assign(campaign, value);
    campaign.tags = tagIds;
    await campaign.save();

    await campaign.populate(['createdBy', 'tags', 'team.user']);

    // Send real-time update
    socketService.sendCampaignUpdate({
      id: campaign._id,
      title: campaign.name,
      description: campaign.description,
      severity: campaign.severity,
      activity: campaign.activityScore,
      reposts: campaign.stats.totalTweets,
      lead: { name: campaign.createdBy.name }
    });

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign }
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign'
    });
  }
};

// Archive campaign
export const archiveCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check permissions (only lead can archive)
    const isLead = campaign.createdBy.toString() === req.user._id.toString() ||
                   campaign.team.some(member => 
                     member.user.toString() === req.user._id.toString() && 
                     member.role === 'lead'
                   );

    if (!isLead) {
      return res.status(403).json({
        success: false,
        message: 'Only campaign leads can archive campaigns'
      });
    }

    campaign.isArchived = true;
    campaign.archivedAt = new Date();
    campaign.archivedBy = req.user._id;
    campaign.status = 'archived';

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign archived successfully',
      data: { campaign }
    });
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive campaign'
    });
  }
};

// Add note to campaign
export const addCampaignNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = noteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check access
    const hasAccess = campaign.createdBy.toString() === req.user._id.toString() ||
                     campaign.team.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const note = new CampaignNote({
      ...value,
      campaign: id,
      author: req.user._id
    });

    await note.save();
    await note.populate('author', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Add campaign note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
};

// Get campaign analytics
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '7d' } = req.query;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Calculate date range
    const now = new Date();
    const ranges = {
      '24h': new Date(now - 24 * 60 * 60 * 1000),
      '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now - 90 * 24 * 60 * 60 * 1000)
    };

    const startDate = ranges[timeRange] || ranges['7d'];

    // Get tweet analytics
    const tweetAnalytics = await Tweet.aggregate([
      {
        $match: {
          searchTopic: campaign.topic,
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" } },
            classification: "$classification"
          },
          count: { $sum: 1 },
          totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Get sentiment analysis
    const sentimentData = await Tweet.aggregate([
      {
        $match: {
          searchTopic: campaign.topic,
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" } },
          avgSentiment: { $avg: "$sentiment" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get top accounts
    const topAccounts = await Tweet.aggregate([
      {
        $match: {
          searchTopic: campaign.topic,
          crawledAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$username",
          tweetCount: { $sum: 1 },
          totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } },
          avgEngagement: { $avg: { $add: ["$likes", "$retweets", "$replies"] } },
          classifications: { $push: "$classification" }
        }
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          topic: campaign.topic
        },
        timeRange,
        analytics: {
          overview: {
            totalTweets: campaign.stats.totalTweets,
            realPosts: campaign.stats.realPosts,
            fakePosts: campaign.stats.fakePosts,
            propagandaPosts: campaign.stats.propagandaPosts,
            avgSentiment: campaign.stats.avgSentiment
          },
          timeline: tweetAnalytics,
          sentiment: sentimentData,
          topAccounts,
          riskScore: calculateRiskScore(campaign.stats),
          trends: generateTrendAnalysis(tweetAnalytics)
        }
      }
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign analytics'
    });
  }
};

// Helper functions
function calculateSeverity(stats) {
  if (!stats) return 'low';
  
  const { fakePosts = 0, propagandaPosts = 0, totalTweets = 1 } = stats;
  const riskRatio = (fakePosts + propagandaPosts) / totalTweets;
  
  if (riskRatio > 0.7) return 'high';
  if (riskRatio > 0.3) return 'medium';
  return 'low';
}

function calculateActivity(stats) {
  if (!stats) return Math.floor(Math.random() * 50);
  
  const { totalTweets = 0, lastCrawled } = stats;
  const hoursSinceLastCrawl = lastCrawled ? 
    (Date.now() - new Date(lastCrawled).getTime()) / (1000 * 60 * 60) : 24;
  
  const activityScore = Math.min(100, (totalTweets / 10) + (24 - hoursSinceLastCrawl) * 2);
  return Math.max(0, Math.floor(activityScore));
}

function generateSparkData() {
  return Array.from({ length: 12 }, () => ({ 
    v: 20 + Math.round(Math.random() * 60) 
  }));
}

function calculateEngagementRate(tweets) {
  if (!tweets || tweets.length === 0) return 0;
  
  const totalEngagement = tweets.reduce((sum, tweet) => 
    sum + (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0), 0
  );
  
  return Math.round((totalEngagement / tweets.length) * 100) / 100;
}

function generateSentimentTrend() {
  return Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sentiment: 0.3 + Math.random() * 0.4
  }));
}

function generateTimelineData() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    tweets: Math.floor(Math.random() * 20) + 5
  }));
}

function calculateRiskScore(stats) {
  if (!stats) return 0;
  
  const { fakePosts = 0, propagandaPosts = 0, totalTweets = 1 } = stats;
  return Math.round(((fakePosts + propagandaPosts) / totalTweets) * 100);
}

function generateTrendAnalysis(timelineData) {
  if (!timelineData || timelineData.length < 2) return { trend: 'stable', change: 0 };
  
  const recent = timelineData.slice(-3);
  const earlier = timelineData.slice(-6, -3);
  
  const recentAvg = recent.reduce((sum, item) => sum + item.count, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, item) => sum + item.count, 0) / earlier.length;
  
  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  
  return {
    trend: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
    change: Math.round(change)
  };
}