import GeminiService from '../services/geminiService.js';
import Tweet from '../models/tweet.model.js';
import Campaign from '../models/campaign.model.js';
import Alert from '../models/alert.model.js';
import socketService from '../services/socketService.js';
import Joi from 'joi';

const geminiService = new GeminiService();

// Validation schemas
const analyzeTweetSchema = Joi.object({
  tweetId: Joi.string().optional(),
  content: Joi.string().required().max(5000),
  context: Joi.object({
    username: Joi.string().optional(),
    timestamp: Joi.date().optional(),
    engagement: Joi.number().optional(),
    platform: Joi.string().optional()
  }).optional()
});

const batchAnalysisSchema = Joi.object({
  tweetIds: Joi.array().items(Joi.string()).max(50),
  campaignId: Joi.string().optional(),
  analysisType: Joi.string().valid('comprehensive', 'classification', 'sentiment', 'threats').default('comprehensive'),
  updateDatabase: Joi.boolean().default(true)
});

const chatSchema = Joi.object({
  query: Joi.string().required().max(1000),
  campaignId: Joi.string().optional(),
  context: Joi.object().optional()
});

// Analyze single tweet
export const analyzeTweet = async (req, res) => {
  try {
    const { error, value } = analyzeTweetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { tweetId, content, context = {} } = value;

    // If tweetId provided, get tweet from database
    let tweet = null;
    if (tweetId) {
      tweet = await Tweet.findById(tweetId);
      if (!tweet) {
        return res.status(404).json({
          success: false,
          message: 'Tweet not found'
        });
      }
    }

    // Prepare content and context
    const tweetContent = tweet ? tweet.content : content;
    const analysisContext = tweet ? {
      username: tweet.username,
      timestamp: tweet.timestamp,
      engagement: (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0),
      platform: 'x'
    } : context;

    // Perform AI analysis
    const analysis = await geminiService.analyzeTweet(tweetContent, analysisContext);

    if (!analysis.success) {
      return res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: analysis.error
      });
    }

    // Update database if tweet exists and analysis is successful
    if (tweet && analysis.success) {
      await updateTweetWithAnalysis(tweet, analysis.analysis);
      
      // Check if we need to create an alert
      await checkAndCreateAlert(tweet, analysis.analysis);
    }

    res.json({
      success: true,
      message: 'Tweet analyzed successfully',
      data: {
        tweetId: tweet?._id,
        content: tweetContent,
        analysis: analysis.analysis,
        timestamp: analysis.timestamp,
        updated: !!tweet
      }
    });
  } catch (error) {
    console.error('Analyze tweet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze tweet'
    });
  }
};

// Batch analyze multiple tweets
export const analyzeBatch = async (req, res) => {
  try {
    const { error, value } = batchAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { tweetIds, campaignId, analysisType, updateDatabase } = value;

    // Get tweets to analyze
    let tweets = [];
    if (tweetIds && tweetIds.length > 0) {
      tweets = await Tweet.find({ _id: { $in: tweetIds } });
    } else if (campaignId) {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
      
      // Get unanalyzed tweets for this campaign
      tweets = await Tweet.find({
        searchTopic: campaign.topic,
        $or: [
          { 'aiAnalysis.analyzed': { $ne: true } },
          { 'aiAnalysis.analyzed': { $exists: false } }
        ]
      }).limit(50);
    } else {
      // Get most recent unanalyzed tweets
      tweets = await Tweet.find({
        $or: [
          { 'aiAnalysis.analyzed': { $ne: true } },
          { 'aiAnalysis.analyzed': { $exists: false } }
        ]
      })
      .sort({ crawledAt: -1 })
      .limit(20);
    }

    if (tweets.length === 0) {
      return res.json({
        success: true,
        message: 'No tweets found for analysis',
        data: {
          totalProcessed: 0,
          results: [],
          summary: {}
        }
      });
    }

    // Perform batch analysis
    const batchResult = await geminiService.analyzeBatch(tweets, analysisType);

    if (!batchResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Batch analysis failed',
        error: batchResult.error
      });
    }

    // Update database if requested
    let updatedCount = 0;
    let alertsCreated = 0;

    if (updateDatabase && batchResult.results) {
      for (const result of batchResult.results) {
        try {
          const tweet = tweets.find(t => t._id.toString() === result.tweetId.toString());
          if (tweet && result.analysis) {
            await updateTweetWithAnalysis(tweet, result.analysis);
            updatedCount++;
            
            // Check for alerts
            const alertCreated = await checkAndCreateAlert(tweet, result.analysis);
            if (alertCreated) alertsCreated++;
          }
        } catch (updateError) {
          console.error('Error updating tweet:', updateError);
        }
      }
    }

    res.json({
      success: true,
      message: `Batch analysis completed. Processed ${batchResult.totalProcessed} tweets.`,
      data: {
        totalProcessed: batchResult.totalProcessed,
        updatedInDatabase: updatedCount,
        alertsCreated,
        results: batchResult.results,
        summary: batchResult.summary,
        campaignId,
        timestamp: batchResult.timestamp
      }
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform batch analysis'
    });
  }
};

// Generate AI-powered campaign report
export const generateReport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange = '7d', includeCharts = true } = req.query;

    const campaign = await Campaign.findById(campaignId)
      .populate('createdBy', 'name email')
      .populate('tags', 'name color');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get campaign tweets
    const tweets = await Tweet.find({
      searchTopic: campaign.topic,
      crawledAt: { $gte: getDateFromRange(timeRange) }
    }).sort({ crawledAt: -1 }).limit(100);

    // Get analytics data
    const analytics = await generateCampaignAnalytics(campaign, tweets);

    // Generate AI report
    const reportResult = await geminiService.generateCampaignReport(
      {
        id: campaign._id,
        name: campaign.name,
        topic: campaign.topic,
        description: campaign.description,
        status: campaign.status,
        priority: campaign.priority,
        stats: campaign.stats
      },
      tweets,
      analytics
    );

    if (!reportResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Report generation failed',
        error: reportResult.error
      });
    }

    res.json({
      success: true,
      message: 'Campaign report generated successfully',
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          topic: campaign.topic
        },
        report: reportResult.report,
        analytics,
        metadata: {
          generatedAt: reportResult.generatedAt,
          dataPoints: reportResult.dataPoints,
          timeRange,
          tweetCount: tweets.length
        }
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

// AI chat interface
export const chatWithAI = async (req, res) => {
  try {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { query, campaignId, context = {} } = value;

    // Prepare context
    let enrichedContext = { ...context };

    if (campaignId) {
      const campaign = await Campaign.findById(campaignId)
        .populate('tags', 'name');
      
      if (campaign) {
        enrichedContext.campaign = {
          name: campaign.name,
          topic: campaign.topic,
          description: campaign.description,
          stats: campaign.stats,
          tags: campaign.tags?.map(tag => tag.name)
        };

        // Get recent tweet stats for context
        const recentTweets = await Tweet.find({
          searchTopic: campaign.topic
        })
        .sort({ crawledAt: -1 })
        .limit(10);

        enrichedContext.recentActivity = {
          tweetCount: recentTweets.length,
          classifications: recentTweets.map(t => t.classification).filter(Boolean),
          avgSentiment: recentTweets.reduce((sum, t) => sum + (t.sentiment || 0), 0) / recentTweets.length
        };
      }
    }

    // Add user context
    enrichedContext.user = {
      id: req.user._id,
      name: req.user.name,
      role: req.user.role
    };

    const chatResult = await geminiService.chatWithAI(query, enrichedContext);

    res.json({
      success: chatResult.success,
      message: chatResult.success ? 'AI response generated' : 'Chat failed',
      data: {
        query: chatResult.query,
        response: chatResult.response,
        timestamp: chatResult.timestamp,
        contextUsed: chatResult.contextUsed,
        error: chatResult.error
      }
    });
  } catch (error) {
    console.error('Chat with AI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat request'
    });
  }
};

// Detect patterns in campaign content
export const detectPatterns = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { patternType = 'all', limit = 100 } = req.query;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get tweets for pattern analysis
    const tweets = await Tweet.find({
      searchTopic: campaign.topic
    })
    .sort({ crawledAt: -1 })
    .limit(parseInt(limit));

    if (tweets.length === 0) {
      return res.json({
        success: true,
        message: 'No tweets found for pattern analysis',
        data: { patterns: null, analyzedTweets: 0 }
      });
    }

    // Detect patterns using AI
    const patternResult = await geminiService.detectPatterns(tweets, patternType);

    res.json({
      success: patternResult.success,
      message: patternResult.success ? 'Pattern analysis completed' : 'Pattern detection failed',
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          topic: campaign.topic
        },
        patterns: patternResult.patterns,
        analyzedTweets: patternResult.analyzedTweets,
        timestamp: patternResult.timestamp,
        error: patternResult.error
      }
    });
  } catch (error) {
    console.error('Detect patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect patterns'
    });
  }
};

// Get AI analysis summary for dashboard
export const getAnalysisSummary = async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const startDate = getDateFromRange(timeRange);

    // Get analysis statistics
    const stats = await Tweet.aggregate([
      {
        $match: {
          crawledAt: { $gte: startDate },
          'aiAnalysis.analyzed': true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          classifications: { $push: '$aiAnalysis.classification.category' },
          threats: { $push: '$aiAnalysis.threat_assessment.level' },
          sentiments: { $push: '$aiAnalysis.sentiment.score' }
        }
      }
    ]);

    const summary = stats[0] || { total: 0, classifications: [], threats: [], sentiments: [] };

    // Calculate distributions
    const classificationDist = getDistribution(summary.classifications);
    const threatDist = getDistribution(summary.threats);
    const avgSentiment = summary.sentiments.length > 0 ? 
      summary.sentiments.reduce((a, b) => a + b, 0) / summary.sentiments.length : 0;

    // Get recent high-risk findings
    const highRiskTweets = await Tweet.find({
      'aiAnalysis.threat_assessment.level': { $in: ['high', 'critical'] },
      crawledAt: { $gte: startDate }
    })
    .sort({ crawledAt: -1 })
    .limit(10)
    .select('content username aiAnalysis.threat_assessment crawledAt');

    res.json({
      success: true,
      data: {
        timeRange,
        summary: {
          totalAnalyzed: summary.total,
          classificationDistribution: classificationDist,
          threatDistribution: threatDist,
          averageSentiment: Math.round(avgSentiment * 100) / 100,
          highRiskCount: (threatDist.high || 0) + (threatDist.critical || 0),
          misinformationRate: ((classificationDist.fake || 0) + (classificationDist.propaganda || 0)) / summary.total
        },
        highRiskFindings: highRiskTweets,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get analysis summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analysis summary'
    });
  }
};

// Helper functions
async function updateTweetWithAnalysis(tweet, analysis) {
  tweet.aiAnalysis = {
    analyzed: true,
    analyzedAt: new Date(),
    classification: analysis.classification,
    sentiment: analysis.sentiment,
    threat_assessment: analysis.threat_assessment,
    content_analysis: analysis.content_analysis,
    risk_indicators: analysis.risk_indicators,
    recommendations: analysis.recommendations
  };

  // Update legacy fields for compatibility
  tweet.classification = analysis.classification?.category || 'unclear';
  tweet.confidence = analysis.classification?.confidence || 0;
  tweet.isClassified = true;
  tweet.sentiment = analysis.sentiment?.score || 0;

  await tweet.save();
}

async function checkAndCreateAlert(tweet, analysis) {
  const threatLevel = analysis.threat_assessment?.level;
  const classification = analysis.classification?.category;
  
  // Create alert for high-risk content
  if (['high', 'critical'].includes(threatLevel) || ['fake', 'propaganda'].includes(classification)) {
    const alert = new Alert({
      title: `${threatLevel?.toUpperCase() || 'HIGH'} Risk Content Detected`,
      description: `${classification?.toUpperCase() || 'SUSPICIOUS'} content from @${tweet.username}: ${tweet.content.substring(0, 100)}...`,
      severity: threatLevel === 'critical' ? 'high' : 'medium',
      platform: 'x',
      relatedTweets: [tweet._id],
      triggeredBy: 'ai_analysis'
    });

    await alert.save();

    // Send real-time alert
    socketService.sendLiveAlert({
      id: alert._id,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      platform: alert.platform,
      timestamp: alert.createdAt
    });

    return true;
  }

  return false;
}

function getDateFromRange(timeRange) {
  const now = new Date();
  const ranges = {
    '1h': new Date(now - 60 * 60 * 1000),
    '24h': new Date(now - 24 * 60 * 60 * 1000),
    '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now - 30 * 24 * 60 * 60 * 1000)
  };
  return ranges[timeRange] || ranges['24h'];
}

function getDistribution(array) {
  return array.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

async function generateCampaignAnalytics(campaign, tweets) {
  // Generate analytics summary for the campaign
  return {
    totalTweets: tweets.length,
    timeRange: {
      start: tweets[tweets.length - 1]?.crawledAt,
      end: tweets[0]?.crawledAt
    },
    engagement: {
      total: tweets.reduce((sum, t) => sum + (t.likes + t.retweets + t.replies), 0),
      average: tweets.length > 0 ? tweets.reduce((sum, t) => sum + (t.likes + t.retweets + t.replies), 0) / tweets.length : 0
    },
    accounts: {
      unique: [...new Set(tweets.map(t => t.username))].length,
      mostActive: getMostActiveAccounts(tweets)
    },
    classifications: getDistribution(tweets.map(t => t.classification).filter(Boolean))
  };
}

function getMostActiveAccounts(tweets) {
  const accountCounts = {};
  tweets.forEach(tweet => {
    accountCounts[tweet.username] = (accountCounts[tweet.username] || 0) + 1;
  });
  
  return Object.entries(accountCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([username, count]) => ({ username, count }));
}