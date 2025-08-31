import TwitterCrawler from './twitterCrawler.js';
import Campaign from '../models/campaign.model.js';
import Tweet from '../models/tweet.model.js';
import Alert from '../models/alert.model.js';
import AIProcessingService from './aiProcessingService.js';

class CrawlerManager {
  constructor() {
    this.crawlerInstance = null;
    this.activeCrawlers = new Map(); // campaignId -> crawler info
    this.crawlIntervals = new Map(); // campaignId -> interval ID
    this.isInitialized = false;
    this.loginAttempts = 0;
    this.maxLoginAttempts = 3;
    this.socketService = null;
    this.autoInitStarted = false;
    this.aiProcessingService = new AIProcessingService();
    
  }

  // Set socket service reference
  setSocketService(socketService) {
    this.socketService = socketService;
  }

  async startAutoInitialization() {
    if (this.autoInitStarted) {
      console.log('⚠️ Auto-initialization already started');
      return;
    }
    
    this.autoInitStarted = true;
    console.log('🚀 Starting Crawler Manager auto-initialization...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.initialize();
      await this.autoLogin();
      
    } catch (error) {
      console.error('❌ Auto-initialization failed:', error);
      this.autoInitStarted = false;
    }
  }

  async autoLogin() {
    try {
      if (this.loginAttempts >= this.maxLoginAttempts) {
        console.log('❌ Max login attempts reached. Manual login required.');
        return false;
      }

      this.loginAttempts++;
      
      // Try to get credentials from environment variables
      const username = process.env.TWITTER_USERNAME || 'sentialAI';
      const password = process.env.TWITTER_PASSWORD || 'Chandra@1708';
      
      if (!username || !password) {
        console.log('⚠️ No Twitter credentials found in environment variables');
        return false;
      }

      console.log(`🔑 Attempting auto-login to X (attempt ${this.loginAttempts}/${this.maxLoginAttempts})...`);
      
      const result = await this.loginToTwitter(username, password);
      
      if (result) {
        console.log('✅ Auto-login successful! Crawler is ready for campaigns.');
        this.loginAttempts = 0; // Reset on success
        return true;
      } else {
        console.log(`❌ Auto-login failed (attempt ${this.loginAttempts}/${this.maxLoginAttempts})`);
        
        // Retry after a delay if not max attempts
        if (this.loginAttempts < this.maxLoginAttempts) {
          console.log(`⏳ Retrying login in 30 seconds...`);
          setTimeout(() => {
            this.autoLogin();
          }, 30000); // Increased delay to 30 seconds
        }
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Auto-login error (attempt ${this.loginAttempts}):`, error.message);
      
      // Retry after a delay if not max attempts
      if (this.loginAttempts < this.maxLoginAttempts) {
        console.log(`⏳ Retrying login in 45 seconds...`);
        setTimeout(() => {
          this.autoLogin();
        }, 45000); // Increased delay to 45 seconds
      }
      return false;
    }
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('⚠️ Crawler Manager already initialized');
        return true;
      }

      console.log('🕷️ Initializing Crawler Manager...');
      
      // Close any existing instance first
      if (this.crawlerInstance) {
        try {
          await this.crawlerInstance.close();
        } catch (closeError) {
          console.warn('Warning closing existing instance:', closeError.message);
        }
        this.crawlerInstance = null;
      }
      
      // Create new instance
      this.crawlerInstance = new TwitterCrawler();
      await this.crawlerInstance.init();
      console.log('✅ TwitterCrawler instance created and initialized');
      
      // Start AI processing service
      await this.aiProcessingService.start();
      console.log('✅ AI Processing Service started');
      
      this.isInitialized = true;
      console.log('✅ Crawler Manager initialized successfully');
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize crawler manager:', error);
      this.isInitialized = false;
      
      // Don't auto-retry initialization - let it be manual
      throw error;
    }
  }

  async loginToTwitter(username, password) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Initializing crawler before login...');
        await this.initialize();
      }
      
      if (!this.crawlerInstance) {
        throw new Error('Crawler instance not available');
      }
      
      console.log(`🔐 Logging into X as @${username}...`);
      
      // Add timeout to prevent hanging
      const loginPromise = this.crawlerInstance.login(username, password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout after 60 seconds')), 60000);
      });
      
      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      if (result) {
        console.log('✅ Successfully logged into X');
        
        // Start crawling for existing active campaigns
        await this.startExistingCampaigns();
        
        // Broadcast login success (check if socketService exists)
        if (this.socketService && typeof this.socketService.broadcast === 'function') {
          this.socketService.broadcast('crawler_login_success', {
            username: username,
            timestamp: new Date(),
            status: this.getStatus()
          });
        }
        
        return true;
      } else {
        console.log('❌ Login to X failed - invalid credentials or rate limited');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Re-initialize crawler on login failure
      this.isInitialized = false;
      if (this.crawlerInstance) {
        try {
          await this.crawlerInstance.close();
        } catch (closeError) {
          console.warn('Warning closing failed crawler:', closeError.message);
        }
        this.crawlerInstance = null;
      }
      
      // Broadcast login failure (check if socketService exists)
      if (this.socketService && typeof this.socketService.broadcast === 'function') {
        this.socketService.broadcast('crawler_login_failed', {
          username: username,
          error: error.message,
          timestamp: new Date()
        });
      }
      
      throw error;
    }
  }

  async startCampaignCrawling(campaign) {
    try {
      // Wait for initialization and login if not ready
      if (!this.isInitialized) {
        console.log(`⏳ Waiting for crawler initialization for campaign: ${campaign.name}`);
        const ready = await this.waitForReady(60000); // Wait up to 60 seconds
        if (!ready) {
          console.log(`❌ Crawler not ready for campaign: ${campaign.name}`);
          return false;
        }
      }

      if (!this.isInitialized || !this.crawlerInstance?.isLoggedIn) {
        console.log(`⚠️ Cannot start crawling for campaign ${campaign.name} - crawler not ready`);
        console.log(`   Initialized: ${this.isInitialized}, Logged in: ${this.crawlerInstance?.isLoggedIn || false}`);
        return false;
      }

      // Stop existing crawler for this campaign if any
      this.stopCampaignCrawling(campaign._id);

      const crawlInterval = campaign.settings?.crawlInterval || 300000; // 5 minutes default
      
      console.log(`🚀 Starting automatic crawling for campaign: ${campaign.name}`);
      console.log(`📝 Topic: ${campaign.topic}`);
      console.log(`⏰ Interval: ${crawlInterval / 1000} seconds`);

      // Store crawler info
      this.activeCrawlers.set(campaign._id.toString(), {
        campaign: campaign,
        startedAt: new Date(),
        lastCrawl: null,
        totalCrawled: 0
      });

      // Start crawling immediately (with a delay to avoid overwhelming)
      setTimeout(async () => {
        await this.performCrawl(campaign);
      }, 10000); // Increased delay to 10 seconds

      // Set up interval for continuous crawling
      const intervalId = setInterval(async () => {
        await this.performCrawl(campaign);
      }, crawlInterval);

      this.crawlIntervals.set(campaign._id.toString(), intervalId);

      // Send real-time update
      if (this.socketService && typeof this.socketService.broadcast === 'function') {
        this.socketService.broadcast('crawler_started', {
          campaignId: campaign._id,
          campaignName: campaign.name,
          topic: campaign.topic,
          interval: crawlInterval
        });
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to start crawling for campaign ${campaign.name}:`, error);
      return false;
    }
  }

  async waitForReady(timeout = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.isInitialized && this.crawlerInstance?.isLoggedIn) {
        return true;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }

  async performCrawl(campaign) {
    try {
      // Check if crawler is still ready
      if (!this.isInitialized || !this.crawlerInstance?.isLoggedIn) {
        console.log(`⚠️ Crawler not ready for crawl of campaign: ${campaign.name}`);
        return;
      }

      const maxTweets = campaign.settings?.maxTweets || 100;
      
      console.log(`🔍 Crawling for campaign: ${campaign.name} (topic: ${campaign.topic})`);
      
      // Use keywords and hashtags to build search queries
      const searchQueries = [
        campaign.topic,
        ...(campaign.keywords || []).slice(0, 3), // Limit to avoid API limits
        ...(campaign.hashtags || []).slice(0, 2)
      ].filter(Boolean);

      let totalNewTweets = 0;
      const allNewTweets = [];

      for (const query of searchQueries) {
        try {
          // ✅ Pass campaignId to crawlTopic
          const result = await this.crawlerInstance.crawlTopic(
            query, 
            campaign._id,  // Pass campaign ID here
            Math.ceil(maxTweets / searchQueries.length)
          );
          
          if (result && result.success) {
            totalNewTweets += result.totalSaved || 0;
            if (result.tweets) {
              allNewTweets.push(...result.tweets);
            }
            
            // Brief delay between queries to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (queryError) {
          console.error(`❌ Error crawling query "${query}":`, queryError.message);
        }
      }

      // Trigger AI processing for new tweets if any were found
      if (totalNewTweets > 0) {
        console.log(`✅ Crawl completed for ${campaign.name}: ${totalNewTweets} new tweets`);
        
        // Trigger AI processing after a brief delay
        setTimeout(async () => {
          try {
            await this.aiProcessingService.processNewTweets();
            console.log(`🤖 AI processing triggered for ${totalNewTweets} new tweets`);
          } catch (aiError) {
            console.error('❌ AI processing failed:', aiError.message);
          }
        }, 5000); // Process after 5 seconds
      }

      // Update campaign stats
      await this.updateCampaignStats(campaign._id, totalNewTweets, allNewTweets);

      // Update crawler info
      const crawlerInfo = this.activeCrawlers.get(campaign._id.toString());
      if (crawlerInfo) {
        crawlerInfo.lastCrawl = new Date();
        crawlerInfo.totalCrawled += totalNewTweets;
      }

      // Check for alerts if enabled
      if (campaign.settings?.enableRealTimeAlerts && allNewTweets.length > 0) {
        await this.checkForAlerts(campaign, allNewTweets);
      }

      // Send real-time update
      if (this.socketService && typeof this.socketService.broadcast === 'function' && totalNewTweets > 0) {
        this.socketService.broadcast('crawl_update', {
          campaignId: campaign._id,
          campaignName: campaign.name,
          newTweets: totalNewTweets,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error(`❌ Crawl failed for campaign ${campaign.name}:`, error);
      
      // Send error notification
      if (this.socketService && typeof this.socketService.broadcast === 'function') {
        this.socketService.broadcast('crawl_error', {
          campaignId: campaign._id,
          campaignName: campaign.name,
          error: error.message,
          timestamp: new Date()
        });
      }
    }
  }

  async updateCampaignStats(campaignId, newTweets, tweets) {
    try {
      if (newTweets === 0) return;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return;

      // Initialize stats if not present
      if (!campaign.stats) {
        campaign.stats = {
          totalTweets: 0,
          realPosts: 0,
          fakePosts: 0,
          propagandaPosts: 0,
          totalEngagement: 0,
          avgSentiment: 0,
          lastCrawled: null
        };
      }

      // Calculate stats from new tweets
      let realPosts = 0;
      let fakePosts = 0;
      let propagandaPosts = 0;
      let totalEngagement = 0;
      let sentimentSum = 0;
      let validSentiments = 0;

      tweets.forEach(tweet => {
        // Engagement
        totalEngagement += (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0);
        
        // Classification (if available)
        if (tweet.classification) {
          switch (tweet.classification) {
            case 'real': realPosts++; break;
            case 'fake': fakePosts++; break;
            case 'propaganda': propagandaPosts++; break;
          }
        }
        
        // Sentiment (if available)
        if (tweet.sentiment !== undefined && tweet.sentiment !== null) {
          sentimentSum += tweet.sentiment;
          validSentiments++;
        }
      });

      // Update campaign stats
      campaign.stats.totalTweets += newTweets;
      campaign.stats.realPosts += realPosts;
      campaign.stats.fakePosts += fakePosts;
      campaign.stats.propagandaPosts += propagandaPosts;
      campaign.stats.totalEngagement += totalEngagement;
      campaign.stats.lastCrawled = new Date();
      
      if (validSentiments > 0) {
        const newAvgSentiment = sentimentSum / validSentiments;
        campaign.stats.avgSentiment = ((campaign.stats.avgSentiment || 0) + newAvgSentiment) / 2;
      }

      await campaign.save();
      console.log(`📊 Updated stats for campaign ${campaign.name}: +${newTweets} tweets`);

    } catch (error) {
      console.error('❌ Failed to update campaign stats:', error);
    }
  }

  async checkForAlerts(campaign, tweets) {
    try {
      const alertThreshold = campaign.settings?.alertThreshold || 0.7;
      
      for (const tweet of tweets) {
        // Check for suspicious content
        const shouldAlert = 
          (tweet.classification === 'fake' && tweet.classificationConfidence >= alertThreshold) ||
          (tweet.classification === 'propaganda' && tweet.classificationConfidence >= alertThreshold) ||
          (tweet.sentiment && tweet.sentiment <= -0.8); // Very negative sentiment

        if (shouldAlert) {
          // Create alert (if Alert model exists)
          try {
            const alert = new Alert({
              campaign: campaign._id,
              tweet: tweet._id,
              type: tweet.classification || 'sentiment',
              severity: tweet.classificationConfidence >= 0.9 ? 'high' : 'medium',
              title: `Suspicious ${tweet.classification || 'content'} detected`,
              description: `Detected ${tweet.classification || 'negative sentiment'} in tweet by @${tweet.username}`,
              metadata: {
                confidence: tweet.classificationConfidence,
                sentiment: tweet.sentiment,
                engagement: (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0)
              }
            });
            
            await alert.save();
            
            // Send real-time alert
            if (this.socketService && typeof this.socketService.broadcast === 'function') {
              this.socketService.broadcast('new_alert', {
                campaignId: campaign._id,
                alert: alert
              });
            }
            
          } catch (alertError) {
            console.warn('⚠️ Failed to create alert:', alertError.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to check for alerts:', error);
    }
  }

  stopCampaignCrawling(campaignId) {
    const campaignIdStr = campaignId.toString();
    
    // Clear interval
    const intervalId = this.crawlIntervals.get(campaignIdStr);
    if (intervalId) {
      clearInterval(intervalId);
      this.crawlIntervals.delete(campaignIdStr);
    }
    
    // Remove from active crawlers
    const crawlerInfo = this.activeCrawlers.get(campaignIdStr);
    if (crawlerInfo) {
      console.log(`🛑 Stopped crawling for campaign: ${crawlerInfo.campaign.name}`);
      this.activeCrawlers.delete(campaignIdStr);
      
      // Send real-time update
      if (this.socketService && typeof this.socketService.broadcast === 'function') {
        this.socketService.broadcast('crawler_stopped', {
          campaignId: campaignId,
          campaignName: crawlerInfo.campaign.name
        });
      }
    }
  }

  async startExistingCampaigns() {
    try {
      const activeCampaigns = await Campaign.find({ 
        status: 'active', 
        isArchived: false 
      }).limit(2);  // ✅ Limit to 2 campaigns max
    
      console.log(`🔄 Found ${activeCampaigns.length} active campaigns (limited to 2 for stability)`);
    
      if (activeCampaigns.length === 0) {
        console.log('❌ No active campaigns found');
        return;
      }

      // Start campaigns with staggered timing
      for (let i = 0; i < activeCampaigns.length; i++) {
        const campaign = activeCampaigns[i];
        
        // Add delay between starting campaigns
        setTimeout(async () => {
          await this.startCampaignCrawling(campaign);
        }, i * 30000); // 30 seconds apart
      }

      console.log(`🚀 Campaign crawling setup complete: ${activeCampaigns.length} active crawlers`);
    } catch (error) {
      console.error('❌ Error starting campaigns:', error);
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      loggedIn: this.crawlerInstance?.isLoggedIn || false,
      loginAttempts: this.loginAttempts,
      maxLoginAttempts: this.maxLoginAttempts,
      autoInitStarted: this.autoInitStarted,
      aiProcessingRunning: this.aiProcessingService?.isRunning || false,
      activeCampaigns: Array.from(this.activeCrawlers.entries()).map(([campaignId, info]) => ({
        campaignId,
        campaignName: info.campaign.name,
        topic: info.campaign.topic,
        startedAt: info.startedAt,
        lastCrawl: info.lastCrawl,
        totalCrawled: info.totalCrawled,
        status: 'running'
      })),
      totalActiveCrawlers: this.activeCrawlers.size,
      lastStatusCheck: new Date()
    };
  }

  // Force re-initialization (useful for debugging)
  async forceReinitialize() {
    console.log('🔄 Force re-initializing crawler manager...');
    
    // Stop all active crawlers
    for (const campaignId of this.crawlIntervals.keys()) {
      this.stopCampaignCrawling(campaignId);
    }
    
    // Reset state
    this.isInitialized = false;
    this.loginAttempts = 0;
    this.autoInitStarted = false;
    
    if (this.crawlerInstance) {
      try {
        await this.crawlerInstance.close();
      } catch (error) {
        console.warn('Warning closing existing crawler:', error.message);
      }
      this.crawlerInstance = null;
    }
    
    // Stop AI processing service
    if (this.aiProcessingService) {
      await this.aiProcessingService.stop();
    }
    
    // Re-initialize
    await this.initialize();
    await this.autoLogin();
  }

  async close() {
    console.log('🔴 Closing Crawler Manager...');
    
    // Stop all crawlers
    for (const campaignId of this.crawlIntervals.keys()) {
      this.stopCampaignCrawling(campaignId);
    }
    
    // Close AI processing service
    if (this.aiProcessingService) {
      await this.aiProcessingService.stop();
      console.log('✅ AI Processing Service stopped');
    }
    
    // Close crawler instance
    if (this.crawlerInstance) {
      try {
        await this.crawlerInstance.close();
      } catch (error) {
        console.warn('Warning closing crawler instance:', error.message);
      }
      this.crawlerInstance = null;
    }
    
    this.isInitialized = false;
    this.autoInitStarted = false;
    console.log('✅ Crawler Manager closed successfully');
  }
}

// Create and export a single instance
const crawlerManager = new CrawlerManager();
export default crawlerManager;