import crawlerManager from '../services/crawlerManager.js';
import Campaign from '../models/campaign.model.js';
import Tweet from '../models/tweet.model.js';
import mongoose from 'mongoose'; // Add this import
import Joi from 'joi';

const { ObjectId } = mongoose.Types; // Add this line

// Validation schemas
const crawlSchema = Joi.object({
  topic: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Search topic is required',
    'string.min': 'Topic must be at least 2 characters long',
    'string.max': 'Topic cannot exceed 100 characters'
  }),
  maxTweets: Joi.number().integer().min(1).max(20).default(10).messages({
    'number.min': 'Maximum tweets must be at least 1',
    'number.max': 'Maximum tweets cannot exceed 20'
  }),
  campaignId: Joi.string().optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

// Initialize crawler
export const initializeCrawler = async (req, res) => {
  try {
    await crawlerManager.initialize();

    res.json({
      success: true,
      message: 'Crawler manager initialized successfully'
    });
  } catch (error) {
    console.error('Crawler initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize crawler manager',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login to Twitter
export const loginToTwitter = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { username, password } = value;
    const loginResult = await crawlerManager.loginToTwitter(username, password);

    if (loginResult) {
      res.json({
        success: true,
        message: 'Successfully logged into X and started crawling active campaigns',
        data: crawlerManager.getStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Login failed - please check credentials'
      });
    }
  } catch (error) {
    console.error('Twitter login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login to X',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get crawler status with active campaigns
export const getCrawlerStatus = async (req, res) => {
  try {
    const totalTweets = await Tweet.countDocuments();
    const recentCrawls = await Tweet.aggregate([
      {
        $group: {
          _id: '$searchTopic',
          count: { $sum: 1 },
          lastCrawled: { $max: '$crawledAt' }
        }
      },
      { $sort: { lastCrawled: -1 } },
      { $limit: 10 }
    ]);

    const crawlerStatus = crawlerManager.getStatus();

    const status = {
      ...crawlerStatus,
      totalTweets,
      recentCrawls: recentCrawls.map(crawl => ({
        topic: crawl._id,
        count: crawl.count,
        lastCrawled: crawl.lastCrawled
      }))
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get crawler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get crawler status'
    });
  }
};

// Manual crawl (still available)
export const crawlTweets = async (req, res) => {
  try {
    const { error, value } = crawlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { topic, maxTweets, campaignId } = value;
    
    if (!crawlerManager.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Crawler not initialized. Please initialize first.'
      });
    }

    // Use the crawler manager's instance for manual crawls
    const result = await crawlerManager.crawlerInstance.crawlTopic(topic, maxTweets);

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully crawled ${result.totalSaved} new tweets`,
        data: {
          topic: result.topic,
          totalExtracted: result.totalExtracted,
          totalSaved: result.totalSaved,
          tweets: result.tweets.slice(0, 5).map(tweet => ({
            id: tweet._id,
            username: tweet.username,
            content: tweet.content.substring(0, 200) + (tweet.content.length > 200 ? '...' : ''),
            timestamp: tweet.timestamp
          }))
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to crawl tweets'
      });
    }
  } catch (error) {
    console.error('Manual crawl error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during crawling',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Start crawling for specific campaign
export const startCampaignCrawling = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const started = await crawlerManager.startCampaignCrawling(campaign);
    
    if (started) {
      res.json({
        success: true,
        message: `Started crawling for campaign: ${campaign.name}`,
        data: crawlerManager.getStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to start crawling - crawler may not be ready'
      });
    }
  } catch (error) {
    console.error('Start campaign crawling error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start campaign crawling'
    });
  }
};

// Get crawled tweets for a campaign
export const getCrawledTweets = async (req, res) => {
  try {
    const { campaignId } = req.params; // Changed from 'id' to 'campaignId' for consistency
    const { 
      page = 1, 
      limit = 20, 
      classification, 
      sentiment, 
      sortBy = 'crawledAt', 
      sortOrder = 'desc',
      search,
      dateFrom,
      dateTo,
      minEngagement = 0,
      verified
    } = req.query;

    if (!ObjectId.isValid(campaignId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID'
      });
    }

    const campaign = await Campaign.findById(campaignId);
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

    // Build search query
    const searchTopics = [
      campaign.topic,
      ...campaign.keywords,
      ...campaign.hashtags.map(tag => tag.replace('#', ''))
    ].filter(Boolean);

    const query = {
      $or: [
        { searchTopic: { $in: searchTopics } },
        { content: { $regex: campaign.topic, $options: 'i' } }
      ]
    };

    // Add filters
    if (classification) {
      query.classification = classification;
    }

    if (sentiment) {
      switch (sentiment) {
        case 'positive':
          query.sentiment = { $gt: 0.1 };
          break;
        case 'negative':
          query.sentiment = { $lt: -0.1 };
          break;
        case 'neutral':
          query.sentiment = { $gte: -0.1, $lte: 0.1 };
          break;
      }
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { content: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { 'user.name': { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (dateFrom || dateTo) {
      query.crawledAt = {};
      if (dateFrom) query.crawledAt.$gte = new Date(dateFrom);
      if (dateTo) query.crawledAt.$lte = new Date(dateTo);
    }

    if (minEngagement > 0) {
      query.$expr = {
        $gte: [
          { $add: ["$likes", "$retweets", "$replies"] },
          parseInt(minEngagement)
        ]
      };
    }

    if (verified === 'true') {
      query['user.isVerified'] = true;
    } else if (verified === 'false') {
      query['user.isVerified'] = false;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    try {
      const tweets = await Tweet.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Tweet.countDocuments(query);

      // Enrich tweets with additional data
      const enrichedTweets = tweets.map(tweet => ({
        ...tweet,
        engagementScore: (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0),
        engagementRate: tweet.user?.followersCount > 0 ? 
          ((tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0)) / tweet.user.followersCount * 100 : 0,
        riskLevel: calculateTweetRiskLevel(tweet),
        sentimentLabel: getSentimentLabel(tweet.sentiment),
        timeAgo: getTimeAgo(tweet.crawledAt),
        isHighEngagement: ((tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0)) > 100,
        isSuspicious: ['fake', 'propaganda', 'bot'].includes(tweet.classification),
        contentPreview: tweet.content ? tweet.content.substring(0, 280) : '',
        hasMedia: tweet.media && tweet.media.length > 0,
        isRetweet: tweet.content && tweet.content.startsWith('RT @'),
        hashtagCount: tweet.hashtags ? tweet.hashtags.length : 0
      }));

      // Calculate summary stats for this result set
      const summaryStats = {
        totalTweets: total,
        classifications: {},
        sentiments: { positive: 0, negative: 0, neutral: 0 },
        totalEngagement: 0,
        avgEngagement: 0,
        verifiedCount: 0,
        suspiciousCount: 0
      };

      enrichedTweets.forEach(tweet => {
        // Classification stats
        summaryStats.classifications[tweet.classification] = 
          (summaryStats.classifications[tweet.classification] || 0) + 1;
        
        // Sentiment stats
        if (tweet.sentiment > 0.1) summaryStats.sentiments.positive++;
        else if (tweet.sentiment < -0.1) summaryStats.sentiments.negative++;
        else summaryStats.sentiments.neutral++;
        
        // Engagement stats
        summaryStats.totalEngagement += tweet.engagementScore;
        
        // Other stats
        if (tweet.user?.isVerified) summaryStats.verifiedCount++;
        if (tweet.isSuspicious) summaryStats.suspiciousCount++;
      });

      summaryStats.avgEngagement = enrichedTweets.length > 0 ? 
        Math.round(summaryStats.totalEngagement / enrichedTweets.length) : 0;

      res.json({
        success: true,
        data: {
          tweets: enrichedTweets,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit),
            hasNext: parseInt(page) * parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          },
          summary: summaryStats,
          filters: {
            applied: {
              classification,
              sentiment,
              search,
              dateFrom,
              dateTo,
              minEngagement,
              verified
            },
            available: {
              classifications: ['real', 'fake', 'propaganda', 'bot', 'unknown'],
              sentiments: ['positive', 'negative', 'neutral'],
              sortOptions: ['crawledAt', 'likes', 'retweets', 'replies', 'sentiment', 'classificationConfidence']
            }
          },
          campaign: {
            id: campaign._id,
            name: campaign.name,
            topic: campaign.topic,
            status: campaign.status
          }
        }
      });
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tweets from database'
      });
    }
  } catch (error) {
    console.error('Get crawled tweets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get crawled tweets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Stop crawling for specific campaign
export const stopCampaignCrawling = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    crawlerManager.stopCampaignCrawling(campaignId);
    
    res.json({
      success: true,
      message: 'Stopped crawling for campaign',
      data: crawlerManager.getStatus()
    });
  } catch (error) {
    console.error('Stop campaign crawling error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop campaign crawling'
    });
  }
};

// Close crawler
export const closeCrawler = async (req, res) => {
  try {
    await crawlerManager.close();

    res.json({
      success: true,
      message: 'Crawler manager closed successfully'
    });
  } catch (error) {
    console.error('Close crawler error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close crawler manager'
    });
  }
};

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