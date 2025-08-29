import TwitterCrawler from '../services/twitterCrawler.js';
import Campaign from '../models/campaign.model.js';
import Tweet from '../models/tweet.model.js';
import Joi from 'joi';

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

let crawlerInstance = null;

// Initialize crawler (call this once)
export const initializeCrawler = async (req, res) => {
  try {
    if (crawlerInstance) {
      await crawlerInstance.close();
    }

    crawlerInstance = new TwitterCrawler();
    await crawlerInstance.init();

    res.json({
      success: true,
      message: 'Crawler initialized successfully'
    });
  } catch (error) {
    console.error('Crawler initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize crawler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login to Twitter
export const loginToTwitter = async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Login request body:', req.body);
    
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body is required and must be valid JSON'
      });
    }

    // Validate input with Joi
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { username, password } = value;

    if (!crawlerInstance) {
      crawlerInstance = new TwitterCrawler();
      await crawlerInstance.init();
    }

    const loginResult = await crawlerInstance.login(username, password);

    if (loginResult) {
      res.json({
        success: true,
        message: 'Successfully logged into X',
        data: {
          isLoggedIn: crawlerInstance.isLoggedIn
        }
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

// Crawl tweets for a topic
export const crawlTweets = async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Crawl request body:', req.body);
    
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body is required and must be valid JSON'
      });
    }

    // Validate input
    const { error, value } = crawlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { topic, maxTweets, campaignId } = value;

    if (!crawlerInstance) {
      return res.status(400).json({
        success: false,
        message: 'Crawler not initialized. Please initialize first.'
      });
    }

    if (!crawlerInstance.isLoggedIn) {
      // Check login status
      const isLoggedIn = await crawlerInstance.checkLoginStatus();
      if (!isLoggedIn) {
        return res.status(400).json({
          success: false,
          message: 'Not logged in to X. Please login first.'
        });
      }
    }

    console.log(`🚀 Starting crawl request for topic: "${topic}"`);
    
    // Crawl tweets
    const result = await crawlerInstance.crawlTopic(topic, maxTweets);

    // Update campaign stats if campaignId provided
    if (campaignId && result.success) {
      try {
        const campaign = await Campaign.findById(campaignId);
        if (campaign) {
          campaign.stats.totalTweets += result.totalSaved;
          campaign.stats.lastCrawled = new Date();
          await campaign.save();
        }
      } catch (campaignError) {
        console.error('Failed to update campaign stats:', campaignError);
      }
    }

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully crawled ${result.totalSaved} new tweets`,
        data: {
          topic: result.topic,
          totalExtracted: result.totalExtracted,
          totalSaved: result.totalSaved,
          tweets: result.tweets.map(tweet => ({
            id: tweet._id,
            username: tweet.username,
            displayName: tweet.displayName,
            content: tweet.content.substring(0, 200) + (tweet.content.length > 200 ? '...' : ''),
            timestamp: tweet.timestamp,
            engagement: {
              likes: tweet.likes,
              retweets: tweet.retweets,
              replies: tweet.replies
            },
            tweetUrl: tweet.tweetUrl
          }))
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to crawl tweets',
        data: {
          topic: result.topic,
          totalExtracted: result.totalExtracted,
          totalSaved: result.totalSaved
        }
      });
    }
  } catch (error) {
    console.error('Crawl tweets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during crawling',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get crawled tweets
export const getCrawledTweets = async (req, res) => {
  try {
    const { topic, page = 1, limit = 20 } = req.query;
    
    const query = topic ? { searchTopic: new RegExp(topic, 'i') } : {};
    
    const tweets = await Tweet.find(query)
      .sort({ crawledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Tweet.countDocuments(query);

    res.json({
      success: true,
      data: {
        tweets,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get crawled tweets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tweets'
    });
  }
};

// Crawler status
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
      { $limit: 5 }
    ]);

    const status = {
      initialized: !!crawlerInstance,
      loggedIn: crawlerInstance ? crawlerInstance.isLoggedIn : false,
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

// Close crawler
export const closeCrawler = async (req, res) => {
  try {
    if (crawlerInstance) {
      await crawlerInstance.close();
      crawlerInstance = null;
    }

    res.json({
      success: true,
      message: 'Crawler closed successfully'
    });
  } catch (error) {
    console.error('Close crawler error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close crawler'
    });
  }
};