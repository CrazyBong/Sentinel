import GeminiService from './geminiService.js';
import Tweet from '../models/tweet.model.js';
import Alert from '../models/alert.model.js';
import AlertRule from '../models/alertRule.model.js';
import socketService from './socketService.js';

class AIProcessingService {
  constructor() {
    this.geminiService = new GeminiService();
    this.isProcessing = false;
    this.processingQueue = [];
    this.batchSize = 5;
    this.processingInterval = 30000; // 30 seconds
  }

  async start() {
    console.log('🤖 Starting AI Processing Service...');
    
    // Process existing unanalyzed tweets
    await this.processBacklog();
    
    // Start continuous processing
    this.startContinuousProcessing();
    
    console.log('✅ AI Processing Service started');
  }

  async processBacklog() {
    try {
      // Find unanalyzed tweets
      const unanalyzedTweets = await Tweet.find({
        'processingFlags.analyzed': false
      }).limit(100).sort({ crawledAt: -1 });

      console.log(`🔍 Found ${unanalyzedTweets.length} unanalyzed tweets`);

      if (unanalyzedTweets.length > 0) {
        await this.processBatch(unanalyzedTweets);
      }
    } catch (error) {
      console.error('❌ Error processing backlog:', error);
    }
  }

  startContinuousProcessing() {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processNewTweets();
      }
    }, this.processingInterval);
  }

  async processNewTweets() {
    try {
      this.isProcessing = true;

      // Get recent unanalyzed tweets
      const newTweets = await Tweet.find({
        'processingFlags.analyzed': false,
        crawledAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
      }).limit(this.batchSize).sort({ crawledAt: -1 });

      if (newTweets.length > 0) {
        console.log(`🤖 Processing ${newTweets.length} new tweets with AI`);
        await this.processBatch(newTweets);
      }

    } catch (error) {
      console.error('❌ Error processing new tweets:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processBatch(tweets) {
    for (const tweet of tweets) {
      try {
        console.log(`🔬 Analyzing tweet from @${tweet.username}: "${tweet.content.substring(0, 50)}..."`);
        
        // Analyze with Gemini AI
        const analysisResult = await this.geminiService.analyzeTweet(tweet.content, {
          username: tweet.username,
          timestamp: tweet.timestamp,
          engagement: tweet.likes + tweet.retweets + tweet.replies,
          platform: 'X/Twitter'
        });

        if (analysisResult.success) {
          // Update tweet with AI analysis
          await this.updateTweetWithAnalysis(tweet, analysisResult.analysis);
          
          // Check for alerts
          await this.checkForAlerts(tweet, analysisResult.analysis);
          
          console.log(`✅ Analysis completed for tweet ${tweet.tweetId}`);
        } else {
          console.error(`❌ Analysis failed for tweet ${tweet.tweetId}:`, analysisResult.error);
          
          // Mark as failed
          await Tweet.findByIdAndUpdate(tweet._id, {
            'processingFlags.analyzed': true,
            'processingFlags.analysisError': analysisResult.error,
            'aiAnalysis.analyzed': false
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error processing tweet ${tweet.tweetId}:`, error);
      }
    }
  }

  async updateTweetWithAnalysis(tweet, analysis) {
    try {
      const updateData = {
        'aiAnalysis.sentiment.score': analysis.sentiment?.score || 0,
        'aiAnalysis.sentiment.label': analysis.sentiment?.label || 'neutral',
        'aiAnalysis.sentiment.confidence': analysis.sentiment?.confidence || 0,
        'aiAnalysis.sentiment.emotions': analysis.sentiment?.emotions || [],
        
        'aiAnalysis.threat_assessment.level': analysis.threat_assessment?.level || 'low',
        'aiAnalysis.threat_assessment.score': analysis.threat_assessment?.score || 0,
        'aiAnalysis.threat_assessment.factors': analysis.threat_assessment?.factors || [],
        'aiAnalysis.threat_assessment.potential_impact': analysis.threat_assessment?.potential_impact || '',
        
        'aiAnalysis.content_analysis.topics': analysis.content_analysis?.topics || [],
        'aiAnalysis.content_analysis.keywords': analysis.content_analysis?.keywords || [],
        'aiAnalysis.content_analysis.entities': analysis.content_analysis?.entities || [],
        'aiAnalysis.content_analysis.claims': analysis.content_analysis?.claims || [],
        
        'aiAnalysis.risk_indicators.manipulation_tactics': analysis.risk_indicators?.manipulation_tactics || [],
        'aiAnalysis.risk_indicators.bot_likelihood': analysis.risk_indicators?.bot_likelihood || 0,
        'aiAnalysis.risk_indicators.coordination_signs': analysis.risk_indicators?.coordination_signs || false,
        
        'aiAnalysis.recommendations.action': analysis.recommendations?.action || 'monitor',
        'aiAnalysis.recommendations.priority': analysis.recommendations?.priority || 'low',
        'aiAnalysis.recommendations.next_steps': analysis.recommendations?.next_steps || [],
        
        'aiAnalysis.analyzed': true,
        'aiAnalysis.analyzedAt': new Date(),
        
        'classification': analysis.classification?.category || 'unclear',
        'isClassified': true,
        
        'processingFlags.analyzed': true,
        'processingFlags.sentimentAnalyzed': true,
        'processingFlags.classified': true
      };

      await Tweet.findByIdAndUpdate(tweet._id, updateData);
      
      // Broadcast real-time update
      socketService.broadcastMessage('tweet_analyzed', {
        tweetId: tweet.tweetId,
        analysis: analysis,
        campaignId: tweet.searchTopic
      });

    } catch (error) {
      console.error('Error updating tweet with analysis:', error);
      throw error;
    }
  }

  async checkForAlerts(tweet, analysis) {
    try {
      // Get active alert rules
      const alertRules = await AlertRule.find({ isActive: true });

      for (const rule of alertRules) {
        if (await this.evaluateAlertRule(tweet, analysis, rule)) {
          await this.createAlert(tweet, analysis, rule);
        }
      }
    } catch (error) {
      console.error('Error checking for alerts:', error);
    }
  }

  async evaluateAlertRule(tweet, analysis, rule) {
    try {
      const conditions = rule.conditions || {};
      
      // Check threat level
      if (conditions.threatLevel && conditions.threatLevel.length > 0) {
        if (!conditions.threatLevel.includes(analysis.threat_assessment?.level)) {
          return false;
        }
      }

      // Check sentiment threshold
      if (conditions.sentimentThreshold !== undefined) {
        const sentimentScore = analysis.sentiment?.score || 0;
        if (conditions.sentimentOperator === 'lt' && sentimentScore >= conditions.sentimentThreshold) {
          return false;
        }
        if (conditions.sentimentOperator === 'gt' && sentimentScore <= conditions.sentimentThreshold) {
          return false;
        }
      }

      // Check keywords
      if (conditions.keywords && conditions.keywords.length > 0) {
        const contentLower = tweet.content.toLowerCase();
        const hasKeyword = conditions.keywords.some(keyword => 
          contentLower.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      // Check classification
      if (conditions.classification && conditions.classification.length > 0) {
        if (!conditions.classification.includes(analysis.classification?.category)) {
          return false;
        }
      }

      // Check campaign/topic
      if (conditions.campaigns && conditions.campaigns.length > 0) {
        if (!conditions.campaigns.includes(tweet.searchTopic)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error evaluating alert rule:', error);
      return false;
    }
  }

  async createAlert(tweet, analysis, rule) {
    try {
      const alert = new Alert({
        title: `${rule.name}: Potential Threat Detected`,
        description: `Tweet from @${tweet.username} triggered alert rule "${rule.name}". Content: "${tweet.content.substring(0, 100)}${tweet.content.length > 100 ? '...' : ''}"`,
        severity: this.mapThreatToSeverity(analysis.threat_assessment?.level),
        type: 'content_threat',
        platform: 'twitter',
        status: 'open',
        
        triggeredBy: {
          type: 'tweet',
          tweetId: tweet.tweetId,
          username: tweet.username,
          content: tweet.content
        },
        
        ruleId: rule._id,
        ruleName: rule.name,
        
        aiAnalysis: {
          threatLevel: analysis.threat_assessment?.level,
          confidence: analysis.threat_assessment?.score,
          classification: analysis.classification?.category,
          sentiment: analysis.sentiment?.label,
          keywords: analysis.content_analysis?.keywords || [],
          claims: analysis.content_analysis?.claims || []
        },
        
        metadata: {
          campaignId: tweet.searchTopic,
          tweetTimestamp: tweet.timestamp,
          crawledAt: tweet.crawledAt,
          engagement: {
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies
          }
        }
      });

      await alert.save();
      
      console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
      
      // Send real-time alert
      socketService.sendLiveAlert(alert);
      
      // Update tweet with alert reference
      await Tweet.findByIdAndUpdate(tweet._id, {
        $push: { alerts: alert._id },
        hasAlerts: true
      });

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  mapThreatToSeverity(threatLevel) {
    const mapping = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return mapping[threatLevel] || 'low';
  }

  // Public methods for manual processing
  async processTweetById(tweetId) {
    try {
      const tweet = await Tweet.findOne({ tweetId });
      if (!tweet) {
        throw new Error('Tweet not found');
      }

      await this.processBatch([tweet]);
      return { success: true, message: 'Tweet processed successfully' };
    } catch (error) {
      console.error('Error processing specific tweet:', error);
      return { success: false, error: error.message };
    }
  }

  async reprocessCampaign(campaignId) {
    try {
      const tweets = await Tweet.find({ 
        searchTopic: campaignId,
        'processingFlags.analyzed': false 
      }).limit(50);

      await this.processBatch(tweets);
      return { 
        success: true, 
        message: `Reprocessed ${tweets.length} tweets for campaign ${campaignId}` 
      };
    } catch (error) {
      console.error('Error reprocessing campaign:', error);
      return { success: false, error: error.message };
    }
  }

  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      batchSize: this.batchSize,
      processingInterval: this.processingInterval,
      lastProcessed: this.lastProcessed || null
    };
  }
}

export default AIProcessingService;