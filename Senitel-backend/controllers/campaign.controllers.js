import Campaign from '../models/campaign.model.js';
import CampaignNote from '../models/campaignNote.model.js';
import Tag from '../models/tag.model.js';
import Tweet from '../models/tweet.model.js';
import Alert from '../models/alert.model.js';
import socketService from '../services/socketService.js';
import crawlerManager from '../services/crawlerManager.js';
import mongoose from 'mongoose';
import Joi from 'joi';

const { ObjectId } = mongoose.Types;

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
        tag.usageCount = (tag.usageCount || 0) + 1;
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

    // 🚀 AUTO-START CRAWLING FOR THE NEW CAMPAIGN
    try {
      const crawlStarted = await crawlerManager.startCampaignCrawling(campaign);
      if (crawlStarted) {
        console.log(`✅ Auto-crawling started for campaign: ${campaign.name}`);
      } else {
        console.log(`⚠️ Could not start auto-crawling for campaign: ${campaign.name} (crawler not ready)`);
      }
    } catch (crawlError) {
      console.error('Failed to start auto-crawling:', crawlError);
      // Don't fail the campaign creation if crawling fails
    }

    // Send real-time update
    try {
      if (socketService && typeof socketService.sendCampaignUpdate === 'function') {
        socketService.sendCampaignUpdate({
          id: campaign._id,
          title: campaign.name,
          description: campaign.description,
          severity: calculateSeverity(campaign.stats),
          activity: calculateActivity(campaign.stats),
          reposts: campaign.stats?.totalTweets || 0,
          lead: { name: req.user.name }
        });
      }
    } catch (socketError) {
      console.warn('Socket update failed:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully and crawling started!',
      data: { campaign }
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      if (tagIds.length > 0) {
        query.tags = { $in: tagIds };
      }
    }

    // Add search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } }
      ];
    }

    // Add user access filter
    const accessQuery = {
      $or: [
        { createdBy: new ObjectId(req.user._id) },
        { 'team.user': new ObjectId(req.user._id) }
      ]
    };

    // Combine with existing query
    const finalQuery = { $and: [query, accessQuery] };

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const campaigns = await Campaign.find(finalQuery)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('tags', 'name color')
      .populate('team.user', 'name email')
      .lean();

    const total = await Campaign.countDocuments(finalQuery);

    // Add calculated fields
    const enrichedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      severity: calculateSeverity(campaign.stats),
      activityScore: calculateActivity(campaign.stats),
      sparkData: generateSparkData()
    }));

    res.json({
      success: true,
      data: {
        campaigns: enrichedCampaigns,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
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
      message: 'Failed to retrieve campaigns',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single campaign details
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

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
    let recentNotes = [];
    try {
      recentNotes = await CampaignNote.find({ campaign: id })
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(10)
        .populate('author', 'name email avatar')
        .lean();
    } catch (error) {
      console.warn('Could not fetch notes:', error.message);
    }

    // Get recent tweets (if Tweet model exists)
    let recentTweets = [];
    try {
      recentTweets = await Tweet.find({ searchTopic: campaign.topic })
        .sort({ crawledAt: -1 })
        .limit(20)
        .lean();
    } catch (error) {
      console.warn('Could not fetch tweets:', error.message);
    }

    // Get related alerts (if Alert model exists)
    let relatedAlerts = [];
    try {
      relatedAlerts = await Alert.find({ campaign: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } catch (error) {
      console.warn('Could not fetch alerts:', error.message);
    }

    // Calculate tweet stats if tweets exist
    let tweetStats = [];
    if (recentTweets.length > 0) {
      try {
        tweetStats = await Tweet.aggregate([
          { $match: { searchTopic: campaign.topic } },
          {
            $group: {
              _id: '$classification',
              count: { $sum: 1 },
              avgEngagement: { $avg: { $add: ['$likes', '$retweets', '$replies'] } }
            }
          }
        ]);
      } catch (error) {
        console.warn('Could not calculate tweet stats:', error.message);
      }
    }

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
        totalTweets: campaign.stats?.totalTweets || 0,
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
      message: 'Failed to retrieve campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update campaign
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

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
    try {
      if (socketService && typeof socketService.sendCampaignUpdate === 'function') {
        socketService.sendCampaignUpdate({
          id: campaign._id,
          title: campaign.name,
          description: campaign.description,
          severity: calculateSeverity(campaign.stats),
          activity: calculateActivity(campaign.stats),
          reposts: campaign.stats?.totalTweets || 0,
          lead: { name: campaign.createdBy.name }
        });
      }
    } catch (socketError) {
      console.warn('Socket update failed:', socketError.message);
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign }
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Archive campaign
export const archiveCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

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

    // 🛑 STOP CRAWLING FOR ARCHIVED CAMPAIGN
    try {
      crawlerManager.stopCampaignCrawling(id);
      console.log(`🛑 Stopped crawling for archived campaign: ${campaign.name}`);
    } catch (crawlError) {
      console.error('Failed to stop crawling:', crawlError);
    }

    res.json({
      success: true,
      message: 'Campaign archived successfully and crawling stopped',
      data: { campaign }
    });
  } catch (error) {
    console.error('Archive campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add note to campaign
export const addCampaignNote = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

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
      message: 'Failed to add note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get campaign analytics
// export const getCampaignAnalytics = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { timeRange = '7d' } = req.query;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid campaign ID'
//       });
//     }

//     const campaign = await Campaign.findById(id);
//     if (!campaign) {
//       return res.status(404).json({
//         success: false,
//         message: 'Campaign not found'
//       });
//     }

//     // Check access permissions
//     const hasAccess = campaign.createdBy.toString() === req.user._id.toString() ||
//                      campaign.team.some(member => member.user.toString() === req.user._id.toString());

//     if (!hasAccess) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied'
//       });
//     }

//     // Calculate date range
//     const now = new Date();
//     const ranges = {
//       '24h': new Date(now - 24 * 60 * 60 * 1000),
//       '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
//       '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
//       '90d': new Date(now - 90 * 24 * 60 * 60 * 1000)
//     };

//     const startDate = ranges[timeRange] || ranges['7d'];

//     // Initialize analytics with default values
//     let tweetAnalytics = [];
//     let sentimentData = [];
//     let topAccounts = [];
//     let classificationData = [];

//     // Try to get tweet analytics if Tweet model exists
//     try {
//       // Tweet volume and classification over time
//       tweetAnalytics = await Tweet.aggregate([
//         {
//           $match: {
//             searchTopic: campaign.topic,
//             crawledAt: { $gte: startDate }
//           }
//         },
//         {
//           $group: {
//             _id: {
//               date: { $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" } },
//               classification: "$classification"
//             },
//             count: { $sum: 1 },
//             totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } }
//           }
//         },
//         { $sort: { "_id.date": 1 } }
//       );

//       // Classification distribution - FIXED SYNTAX ERROR
//       classificationData = await Tweet.aggregate([
//         {
//           $match: {
//             searchTopic: campaign.topic,
//             crawledAt: { $gte: startDate }
//           }
//         },
//         {
//           $group: {
//             _id: "$classification",
//             count: { $sum: 1 },
//             avgEngagement: { $avg: { $add: ["$likes", "$retweets", "$replies"] } },
//             avgConfidence: { $avg: "$classificationConfidence" }
//           }
//         },
//         { $sort: { count: -1 } }
//       ]); // FIXED: Added missing closing bracket

//       // Sentiment analysis over time
//       sentimentData = await Tweet.aggregate([
//         {
//           $match: {
//             searchTopic: campaign.topic,
//             crawledAt: { $gte: startDate },
//             sentiment: { $exists: true }
//           }
//         },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" } },
//             avgSentiment: { $avg: "$sentiment" },
//             count: { $sum: 1 },
//             positiveCount: {
//               $sum: { $cond: [{ $gt: ["$sentiment", 0.1] }, 1, 0] }
//             },
//             negativeCount: {
//               $sum: { $cond: [{ $lt: ["$sentiment", -0.1] }, 1, 0] }
//             }
//           }
//         },
//         { $sort: { "_id": 1 } }
//       ]);

//       // Top influential accounts
//       topAccounts = await Tweet.aggregate([
//         {
//           $match: {
//             searchTopic: campaign.topic,
//             crawledAt: { $gte: startDate }
//           }
//         },
//         {
//           $group: {
//             _id: "$username",
//             tweetCount: { $sum: 1 },
//             totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } },
//             avgEngagement: { $avg: { $add: ["$likes", "$retweets", "$replies"] } },
//             classifications: { $push: "$classification" },
//             avgSentiment: { $avg: "$sentiment" },
//             followerCount: { $max: "$user.followersCount" }
//           }
//         },
//         { $sort: { totalEngagement: -1 } },
//         { $limit: 10 }
//       ]);
//     } catch (error) {
//       console.warn('Could not fetch tweet analytics:', error.message);
//     }

//     // Generate engagement timeline
//     const engagementTimeline = generateEngagementTimeline(tweetAnalytics);
    
//     // Calculate risk metrics
//     const riskMetrics = calculateRiskMetrics(classificationData, campaign.stats);
    
//     // Generate trend analysis
//     const trendAnalysis = generateTrendAnalysis(tweetAnalytics);

//     const analytics = {
//       campaign: {
//         id: campaign._id,
//         name: campaign.name,
//         topic: campaign.topic,
//         status: campaign.status,
//         priority: campaign.priority
//       },
//       timeRange,
//       overview: {
//         totalTweets: campaign.stats?.totalTweets || 0,
//         realPosts: campaign.stats?.realPosts || 0,
//         fakePosts: campaign.stats?.fakePosts || 0,
//         propagandaPosts: campaign.stats?.propagandaPosts || 0,
//         avgSentiment: campaign.stats?.avgSentiment || 0,
//         riskScore: calculateRiskScore(campaign.stats),
//         severity: calculateSeverity(campaign.stats)
//       },
//       timeline: {
//         tweets: tweetAnalytics,
//         engagement: engagementTimeline,
//         sentiment: sentimentData
//       },
//       classification: {
//         distribution: classificationData,
//         trends: trendAnalysis
//       },
//       sentiment: {
//         timeline: sentimentData,
//         summary: calculateSentimentSummary(sentimentData)
//       },
//       accounts: {
//         topInfluencers: topAccounts,
//         suspicious: topAccounts.filter(acc => 
//           acc.classifications.some(c => ['fake', 'propaganda'].includes(c))
//         )
//       },
//       risks: riskMetrics,
//       insights: generateInsights(classificationData, sentimentData, topAccounts)
//     };

//     res.json({
//       success: true,
//       data: { analytics }
//     });
//   } catch (error) {
//     console.error('Get campaign analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to get campaign analytics',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };


// Get campaign analytics
export const getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '7d' } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check access permissions
    const hasAccess = campaign.createdBy.toString() === req.user._id.toString() ||
                     campaign.team.some(member => member.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
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

    // Initialize analytics with default values
    let tweetAnalytics = [];
    let sentimentData = [];
    let topAccounts = [];
    let classificationData = [];
    let engagementData = [];
    let hashtagAnalysis = [];
    let hourlyDistribution = [];

    // Build search query for campaign topics
    const searchTopics = [
      campaign.topic,
      ...campaign.keywords,
      ...campaign.hashtags.map(tag => tag.replace('#', ''))
    ].filter(Boolean);

    // Try to get tweet analytics if Tweet model exists
    try {
      // Tweet volume and classification over time
      tweetAnalytics = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
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
            totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } },
            avgConfidence: { $avg: "$classificationConfidence" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]);

      // Classification distribution
      classificationData = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
            crawledAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: "$classification",
            count: { $sum: 1 },
            avgEngagement: { $avg: { $add: ["$likes", "$retweets", "$replies"] } },
            avgConfidence: { $avg: "$classificationConfidence" },
            totalLikes: { $sum: "$likes" },
            totalRetweets: { $sum: "$retweets" },
            totalReplies: { $sum: "$replies" }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Sentiment analysis over time
      sentimentData = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
            crawledAt: { $gte: startDate },
            sentiment: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" } },
            avgSentiment: { $avg: "$sentiment" },
            count: { $sum: 1 },
            positiveCount: {
              $sum: { $cond: [{ $gt: ["$sentiment", 0.1] }, 1, 0] }
            },
            negativeCount: {
              $sum: { $cond: [{ $lt: ["$sentiment", -0.1] }, 1, 0] }
            },
            neutralCount: {
              $sum: { 
                $cond: [
                  { $and: [{ $gte: ["$sentiment", -0.1] }, { $lte: ["$sentiment", 0.1] }] }, 
                  1, 
                  0
                ] 
              }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      // Top influential accounts
      topAccounts = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
            crawledAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: "$username",
            tweetCount: { $sum: 1 },
            totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } },
            avgEngagement: { $avg: { $add: ["$likes", "$retweets", "$replies"] } },
            classifications: { $push: "$classification" },
            avgSentiment: { $avg: "$sentiment" },
            followerCount: { $max: "$user.followersCount" },
            totalLikes: { $sum: "$likes" },
            totalRetweets: { $sum: "$retweets" },
            totalReplies: { $sum: "$replies" },
            isVerified: { $max: "$user.isVerified" },
            profileImage: { $first: "$user.profileImageUrl" }
          }
        },
        { $sort: { totalEngagement: -1 } },
        { $limit: 15 }
      ]);

      // Engagement metrics over time
      engagementData = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
            crawledAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" } },
            totalLikes: { $sum: "$likes" },
            totalRetweets: { $sum: "$retweets" },
            totalReplies: { $sum: "$replies" },
            tweetCount: { $sum: 1 },
            avgEngagementRate: { 
              $avg: { 
                $divide: [
                  { $add: ["$likes", "$retweets", "$replies"] },
                  { $max: ["$user.followersCount", 1] }
                ]
              }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      // Hashtag analysis
      hashtagAnalysis = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
            crawledAt: { $gte: startDate },
            hashtags: { $exists: true, $ne: [] }
          }
        },
        { $unwind: "$hashtags" },
        {
          $group: {
            _id: "$hashtags",
            count: { $sum: 1 },
            totalEngagement: { $sum: { $add: ["$likes", "$retweets", "$replies"] } },
            avgSentiment: { $avg: "$sentiment" }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Hourly distribution
      hourlyDistribution = await Tweet.aggregate([
        {
          $match: {
            $or: [
              { searchTopic: { $in: searchTopics } },
              { content: { $regex: campaign.topic, $options: 'i' } }
            ],
            crawledAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $hour: "$crawledAt" },
            count: { $sum: 1 },
            avgEngagement: { $avg: { $add: ["$likes", "$retweets", "$replies"] } }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

    } catch (error) {
      console.warn('Could not fetch tweet analytics:', error.message);
    }

    // Generate enhanced analytics
    const engagementTimeline = generateEngagementTimeline(tweetAnalytics);
    const riskMetrics = calculateRiskMetrics(classificationData, campaign.stats);
    const trendAnalysis = generateTrendAnalysis(tweetAnalytics);
    const sentimentSummary = calculateSentimentSummary(sentimentData);
    const insights = generateInsights(classificationData, sentimentData, topAccounts);

    // Calculate additional metrics
    const totalTweets = classificationData.reduce((sum, item) => sum + item.count, 0);
    const totalEngagement = engagementData.reduce((sum, day) => 
      sum + day.totalLikes + day.totalRetweets + day.totalReplies, 0
    );

    const analytics = {
      campaign: {
        id: campaign._id,
        name: campaign.name,
        topic: campaign.topic,
        status: campaign.status,
        priority: campaign.priority,
        category: campaign.category,
        keywords: campaign.keywords,
        hashtags: campaign.hashtags
      },
      timeRange,
      period: {
        startDate,
        endDate: now,
        days: Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
      },
      overview: {
        totalTweets: totalTweets || campaign.stats?.totalTweets || 0,
        realPosts: campaign.stats?.realPosts || 0,
        fakePosts: campaign.stats?.fakePosts || 0,
        propagandaPosts: campaign.stats?.propagandaPosts || 0,
        totalEngagement: totalEngagement,
        avgSentiment: campaign.stats?.avgSentiment || 0,
        riskScore: calculateRiskScore(campaign.stats),
        severity: calculateSeverity(campaign.stats),
        avgEngagementPerTweet: totalTweets > 0 ? Math.round(totalEngagement / totalTweets) : 0
      },
      timeline: {
        tweets: tweetAnalytics,
        engagement: engagementTimeline,
        sentiment: sentimentData,
        daily: engagementData
      },
      classification: {
        distribution: classificationData,
        trends: trendAnalysis,
        summary: {
          total: totalTweets,
          real: classificationData.find(c => c._id === 'real')?.count || 0,
          fake: classificationData.find(c => c._id === 'fake')?.count || 0,
          propaganda: classificationData.find(c => c._id === 'propaganda')?.count || 0,
          bot: classificationData.find(c => c._id === 'bot')?.count || 0
        }
      },
      sentiment: {
        timeline: sentimentData,
        summary: sentimentSummary,
        distribution: {
          positive: sentimentSummary.positive,
          negative: sentimentSummary.negative,
          neutral: sentimentSummary.neutral
        }
      },
      accounts: {
        topInfluencers: topAccounts.slice(0, 10),
        suspicious: topAccounts.filter(acc => 
          acc.classifications.some(c => ['fake', 'propaganda', 'bot'].includes(c))
        ),
        verified: topAccounts.filter(acc => acc.isVerified),
        highEngagement: topAccounts.filter(acc => acc.avgEngagement > 100)
      },
      content: {
        hashtags: hashtagAnalysis,
        trending: hashtagAnalysis.slice(0, 10),
        hourlyDistribution: Array.from({ length: 24 }, (_, hour) => {
          const hourData = hourlyDistribution.find(h => h._id === hour);
          return {
            hour,
            count: hourData?.count || 0,
            avgEngagement: hourData?.avgEngagement || 0
          };
        })
      },
      risks: riskMetrics,
      insights: insights,
      metadata: {
        lastUpdated: new Date(),
        dataPoints: totalTweets,
        searchTerms: searchTopics,
        crawlerStatus: campaign.status === 'active' ? 'running' : 'stopped'
      }
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get crawled tweets for a campaign


// Helper functions for getCrawledTweets
function calculateTweetRiskLevel(tweet) {
  if (!tweet.classification || !tweet.classificationConfidence) return 'low';
  
  const riskClassifications = ['fake', 'propaganda', 'bot'];
  if (riskClassifications.includes(tweet.classification)) {
    if (tweet.classificationConfidence > 0.8) return 'high';
    if (tweet.classificationConfidence > 0.6) return 'medium';
    return 'low';
  }
  return 'low';
}

function getSentimentLabel(sentiment) {
  if (sentiment === null || sentiment === undefined) return 'unknown';
  if (sentiment > 0.1) return 'positive';
  if (sentiment < -0.1) return 'negative';
  return 'neutral';
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Get campaign notes
export const getCampaignNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type, search } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
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

    // Build query
    const query = { campaign: id };
    if (type) query.type = type;
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const notes = await CampaignNote.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('author', 'name email avatar')
      .lean();

    const total = await CampaignNote.countDocuments(query);

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get campaign notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update campaign note
export const updateCampaignNote = async (req, res) => {
  try {
    const { id, noteId } = req.params;
    const { error, value } = noteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const note = await CampaignNote.findById(noteId);
    if (!note || note.campaign.toString() !== id) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check if user can edit (author or campaign lead)
    const campaign = await Campaign.findById(id);
    const canEdit = note.author.toString() === req.user._id.toString() ||
                   campaign.createdBy.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to edit this note'
      });
    }

    // Save edit history if CampaignNote model supports it
    try {
      if (note.content !== value.content && note.editHistory) {
        note.editHistory.push({
          content: note.content,
          editedAt: new Date(),
          editedBy: req.user._id
        });
        note.isEdited = true;
      }
    } catch (error) {
      // Ignore if editHistory is not supported
    }

    Object.assign(note, value);
    await note.save();
    await note.populate('author', 'name email avatar');

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Update campaign note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete campaign note
export const deleteCampaignNote = async (req, res) => {
  try {
    const { id, noteId } = req.params;

    const note = await CampaignNote.findById(noteId);
    if (!note || note.campaign.toString() !== id) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check if user can delete (author or campaign lead)
    const campaign = await Campaign.findById(id);
    const canDelete = note.author.toString() === req.user._id.toString() ||
                     campaign.createdBy.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete this note'
      });
    }

    await CampaignNote.findByIdAndDelete(noteId);

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update campaign status
export const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const validStatuses = ['active', 'paused', 'completed', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
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
        message: 'Insufficient permissions to update campaign status'
      });
    }

    const previousStatus = campaign.status;
    campaign.status = status;
    
    // Add status change metadata
    if (status === 'archived' && !campaign.isArchived) {
      campaign.isArchived = true;
      campaign.archivedAt = new Date();
      campaign.archivedBy = req.user._id;
    }

    await campaign.save();
    await campaign.populate(['createdBy', 'tags', 'team.user']);

    // Send real-time update
    try {
      if (socketService && typeof socketService.sendCampaignUpdate === 'function') {
        socketService.sendCampaignUpdate({
          id: campaign._id,
          title: campaign.name,
          description: campaign.description,
          severity: calculateSeverity(campaign.stats),
          activity: calculateActivity(campaign.stats),
          reposts: campaign.stats?.totalTweets || 0,
          lead: { name: campaign.createdBy.name },
          statusChange: { from: previousStatus, to: status }
        });
      }
    } catch (socketError) {
      console.warn('Socket update failed:', socketError.message);
    }

    res.json({
      success: true,
      message: `Campaign status updated from ${previousStatus} to ${status}`,
      data: { campaign }
    });
  } catch (error) {
    console.error('Update campaign status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get campaign stats
export const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const stats = {
      basic: campaign.stats || {},
      calculated: {
        severity: calculateSeverity(campaign.stats),
        activityScore: calculateActivity(campaign.stats),
        riskScore: calculateRiskScore(campaign.stats)
      },
      notes: await CampaignNote.countDocuments({ campaign: id }),
      teamSize: campaign.team?.length || 0,
      metadata: {
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        status: campaign.status,
        priority: campaign.priority,
        category: campaign.category
      }
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
  
  if (recent.length === 0 || earlier.length === 0) return { trend: 'stable', change: 0 };
  
  const recentAvg = recent.reduce((sum, item) => sum + item.count, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, item) => sum + item.count, 0) / earlier.length;
  
  const change = earlierAvg === 0 ? 0 : ((recentAvg - earlierAvg) / earlierAvg) * 100;
  
  return {
    trend: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
    change: Math.round(change)
  };
}

function generateEngagementTimeline(tweetAnalytics) {
  const timeline = {};
  
  tweetAnalytics.forEach(item => {
    const date = item._id.date;
    if (!timeline[date]) {
      timeline[date] = { date, totalEngagement: 0, count: 0 };
    }
    timeline[date].totalEngagement += item.totalEngagement;
    timeline[date].count += item.count;
  });
  
  return Object.values(timeline).map(day => ({
    ...day,
    avgEngagement: day.count > 0 ? Math.round(day.totalEngagement / day.count) : 0
  }));
}

function calculateRiskMetrics(classificationData, stats) {
  const total = classificationData.reduce((sum, item) => sum + item.count, 0);
  
  if (total === 0) return { level: 'low', score: 0, factors: [] };
  
  const fakePercent = classificationData.find(c => c._id === 'fake')?.count || 0;
  const propagandaPercent = classificationData.find(c => c._id === 'propaganda')?.count || 0;
  
  const riskScore = Math.round(((fakePercent + propagandaPercent) / total) * 100);
  
  return {
    level: riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low',
    score: riskScore,
    factors: [
      { name: 'Fake Content', value: Math.round((fakePercent / total) * 100) },
      { name: 'Propaganda', value: Math.round((propagandaPercent / total) * 100) }
    ]
  };
}

function calculateSentimentSummary(sentimentData) {
  if (!sentimentData || sentimentData.length === 0) {
    return { overall: 'neutral', positive: 0, negative: 0, neutral: 0 };
  }
  
  const totalCount = sentimentData.reduce((sum, item) => sum + item.count, 0);
  const totalPositive = sentimentData.reduce((sum, item) => sum + item.positiveCount, 0);
  const totalNegative = sentimentData.reduce((sum, item) => sum + item.negativeCount, 0);
  
  const positivePercent = Math.round((totalPositive / totalCount) * 100);
  const negativePercent = Math.round((totalNegative / totalCount) * 100);
  const neutralPercent = 100 - positivePercent - negativePercent;
  
  return {
    overall: positivePercent > negativePercent ? 'positive' : negativePercent > positivePercent ? 'negative' : 'neutral',
    positive: positivePercent,
    negative: negativePercent,
    neutral: neutralPercent
  };
}

function generateInsights(classificationData, sentimentData, topAccounts) {
  const insights = [];
  
  // Classification insights
  if (classificationData.length > 0) {
    const total = classificationData.reduce((sum, item) => sum + item.count, 0);
    const fakeCount = classificationData.find(c => c._id === 'fake')?.count || 0;
    
    if (fakeCount / total > 0.3) {
      insights.push({
        type: 'warning',
        title: 'High Fake Content Detection',
        description: `${Math.round((fakeCount / total) * 100)}% of content classified as fake`,
        priority: 'high'
      });
    }
  }
  
  // Sentiment insights
  if (sentimentData.length > 0) {
    const avgSentiment = sentimentData.reduce((sum, item) => sum + item.avgSentiment, 0) / sentimentData.length;
    
    if (avgSentiment < -0.3) {
      insights.push({
        type: 'info',
        title: 'Negative Sentiment Trend',
        description: 'Overall sentiment is trending negative',
        priority: 'medium'
      });
    }
  }
  
  // Account insights
  if (topAccounts.length > 0) {
    const suspiciousAccounts = topAccounts.filter(acc => 
      acc.classifications.some(c => ['fake', 'propaganda'].includes(c))
    );
    
    if (suspiciousAccounts.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Suspicious Accounts Detected',
        description: `${suspiciousAccounts.length} high-engagement accounts posting suspicious content`,
        priority: 'high'
      });
    }
  }
  
  return insights;
}