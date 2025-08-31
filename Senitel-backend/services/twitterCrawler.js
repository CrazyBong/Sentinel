import { chromium } from 'playwright';
import Tweet from '../models/tweet.model.js';
import UserAgent from 'user-agents';

class TwitterCrawler {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.userAgent = new UserAgent();
    this.sessionCookies = null;
    this.loginInProgress = false;
    this.activeCampaign = null;
    this.lastActivity = Date.now();
  }

  async init() {
    try {
      console.log('🚀 Initializing Twitter Crawler...');
      
      // Close existing browser if any
      if (this.browser) {
        await this.close();
      }
      
      // Launch browser with minimal settings for stability
      this.browser = await chromium.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled',
          '--no-default-browser-check'
        ]
      });

      // Create single persistent context
      this.context = await this.browser.newContext({
        userAgent: this.userAgent.toString(),
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      // Create single page
      this.page = await this.context.newPage();

      // Basic stealth
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
      });

      // Set reasonable timeouts
      this.page.setDefaultTimeout(45000);
      this.page.setDefaultNavigationTimeout(45000);

      // Minimal resource blocking - only block heavy stuff
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'stylesheet', 'font'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log('✅ Twitter crawler initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize crawler:', error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      if (this.loginInProgress) {
        console.log('⏳ Login already in progress, waiting...');
        while (this.loginInProgress) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return this.isLoggedIn;
      }

      this.loginInProgress = true;

      if (!this.page) await this.init();

      console.log('🔐 Logging into X...');
      
      // Navigate to login
      await this.page.goto('https://x.com/i/flow/login', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });

      await this.page.waitForTimeout(3000);

      // Enter username
      console.log('👤 Entering username...');
      await this.page.waitForSelector('input[name="text"]', { timeout: 30000 });
      await this.page.fill('input[name="text"]', username);
      
      // Click Next
      console.log('➡️ Clicking Next...');
      await this.page.click('[role="button"]:has-text("Next")');
      
      // Wait for password field
      console.log('🔒 Waiting for password field...');
      await this.page.waitForSelector('input[name="password"]', { timeout: 30000 });
      await this.page.waitForTimeout(2000);
      
      // Enter password
      console.log('🔒 Entering password...');
      await this.page.fill('input[name="password"]', password);
      
      // Click Log in
      console.log('🚀 Clicking Log in...');
      await this.page.click('[role="button"]:has-text("Log in")');

      // Wait for login completion
      console.log('⏳ Waiting for login to complete...');
      try {
        await this.page.waitForURL('**/home', { timeout: 30000 });
        this.isLoggedIn = true;
        console.log('✅ Successfully logged into X');
        
        this.loginInProgress = false;
        return true;
      } catch (waitError) {
        // Check if we're actually logged in
        const currentUrl = this.page.url();
        if (currentUrl.includes('/home')) {
          this.isLoggedIn = true;
          console.log('✅ Successfully logged into X');
          this.loginInProgress = false;
          return true;
        }
        throw waitError;
      }
    } catch (error) {
      console.error('❌ X login failed:', error);
      this.isLoggedIn = false;
      this.loginInProgress = false;
      throw new Error('Failed to login to X');
    }
  }

  async crawlSingleCampaign(topic, campaignId, maxTweets = 20) {
    try {
      console.log(`🎯 Starting single campaign crawl: "${topic}" for campaign ${campaignId} (max: ${maxTweets} tweets)`);
      
      if (!this.isLoggedIn) {
        throw new Error('Not logged in to X');
      }

      // Set active campaign
      this.activeCampaign = topic;

      const searchUrl = `https://x.com/search?q=${encodeURIComponent(topic)}&src=typed_query&f=live`;
      
      console.log(`🔍 Navigating to search: ${topic}`);
      await this.page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
      
      // Wait for content to load
      await this.page.waitForTimeout(5000);
      
      // Check if we're blocked
      const pageText = await this.page.textContent('body');
      if (pageText.includes('Something went wrong') || 
          pageText.includes('Rate limit exceeded') ||
          pageText.includes('Try again')) {
        console.log('⚠️ Detected rate limiting, waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return await this.crawlSingleCampaign(topic, campaignId, maxTweets);
      }
      
      // Scroll a few times to load tweets
      console.log('📜 Loading tweets...');
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.page.waitForTimeout(3000);
      }
      
      // Extract tweets
      console.log(`📊 Extracting tweets for: ${topic}`);
      const tweets = await this.page.evaluate((searchTopic) => {
        const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
        const extractedTweets = [];

        Array.from(tweetElements).slice(0, 15).forEach((tweetEl, index) => {
          try {
            // Get username
            const usernameEl = tweetEl.querySelector('[data-testid="User-Name"] a[href*="/"]');
            const username = usernameEl ? usernameEl.href.split('/').pop() : null;

            // Get content
            const contentEl = tweetEl.querySelector('[data-testid="tweetText"]');
            const content = contentEl ? contentEl.innerText.trim() : '';

            // Get timestamp
            const timeEl = tweetEl.querySelector('time');
            const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();

            // Skip if missing essentials
            if (!username || !content || username === 'status') {
              return;
            }

            // Get display name
            const displayNameEl = tweetEl.querySelector('[data-testid="User-Name"] span:first-child');
            const displayName = displayNameEl ? displayNameEl.innerText : username;

            // Create unique ID
            const tweetId = `${username}_${Date.parse(timestamp)}_${index}`;

            const tweetData = {
              tweetId,
              username,
              displayName,
              content,
              timestamp: new Date(timestamp),
              likes: 0,
              retweets: 0,
              replies: 0,
              isRetweet: content.startsWith('RT @'),
              hashtags: (content.match(/#\w+/g) || []).map(tag => tag.toLowerCase()),
              mentions: (content.match(/@\w+/g) || []).map(mention => mention.substring(1)),
              urls: [],
              media: [],
              searchTopic,
              user: {
                username,
                displayName,
                isVerified: !!tweetEl.querySelector('[data-testid="icon-verified"]')
              }
            };

            extractedTweets.push(tweetData);
          } catch (err) {
            console.error('Error extracting tweet:', err);
          }
        });

        return extractedTweets;
      }, topic);

      console.log(`📝 Extracted ${tweets.length} tweets`);

      // Save tweets to database
      const savedTweets = [];
      let duplicatesSkipped = 0;

      for (const tweet of tweets) {
        try {
          // Check if tweet already exists
          const existingTweet = await Tweet.findOne({ tweetId: tweet.tweetId });
          if (existingTweet) {
            duplicatesSkipped++;
            continue;
          }

          // Create tweet data with campaignId
          const tweetData = {
            tweetId: tweet.tweetId,
            username: tweet.username,
            displayName: tweet.displayName,
            content: tweet.content,
            timestamp: tweet.timestamp,
            crawledAt: new Date(),
            campaignId: campaignId,  // ✅ Campaign ID added here
            searchTopic: topic,      // Keep for backward compatibility
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
            isRetweet: tweet.isRetweet,
            hashtags: tweet.hashtags,
            mentions: tweet.mentions,
            urls: tweet.urls,
            media: tweet.media,
            lang: 'en',
            user: {
              name: tweet.displayName,
              username: tweet.username,
              displayName: tweet.displayName,
              isVerified: tweet.user.isVerified,
              profileImageUrl: '',
              followersCount: 0,
              followingCount: 0,
              description: '',
              location: '',
              url: '',
              joinedDate: null
            },
            source: 'twitter',
            crawlerVersion: '2.3.0-campaign',
            
            // Initialize empty aiAnalysis structure
            aiAnalysis: {
              sentiment: {
                score: null,
                label: null,
                confidence: null,
                emotions: []
              },
              threat_assessment: {
                level: null,
                score: null,
                factors: [],
                potential_impact: null
              },
              content_analysis: {
                topics: [],
                keywords: [],
                entities: [],
                claims: []
              },
              risk_indicators: {
                manipulation_tactics: [],
                bot_likelihood: null,
                coordination_signs: false
              },
              recommendations: {
                action: null,
                priority: null,
                next_steps: []
              },
              analyzed: false,
              analyzedAt: null
            },
            
            processingFlags: {
              analyzed: false,
              classified: false,
              sentimentAnalyzed: false
            }
          };

          // Save to database
          const newTweet = new Tweet(tweetData);
          await newTweet.save();
          savedTweets.push(newTweet);
          console.log(`💾 Saved tweet from @${tweet.username} for campaign ${campaignId}`);

        } catch (error) {
          console.error('Error saving tweet:', error.message);
        }
      }

      console.log(`✅ Campaign "${topic}" completed: ${savedTweets.length} new tweets saved, ${duplicatesSkipped} duplicates skipped`);

      // Clear active campaign
      this.activeCampaign = null;
      this.lastActivity = Date.now();

      return {
        success: true,
        totalExtracted: tweets.length,
        totalSaved: savedTweets.length,
        duplicatesSkipped,
        tweets: savedTweets
      };

    } catch (error) {
      console.error(`❌ Failed to crawl campaign ${topic}:`, error);
      this.activeCampaign = null;
      
      return {
        success: false,
        error: error.message,
        totalExtracted: 0,
        totalSaved: 0,
        duplicatesSkipped: 0,
        tweets: []
      };
    }
  }

  // ✅ Updated main method to accept campaignId
  async crawlTopic(topic, campaignId, maxTweets = 20) {
    // If already processing a campaign, wait
    if (this.activeCampaign) {
      console.log(`⏳ Another campaign "${this.activeCampaign}" in progress, skipping "${topic}"`);
      return {
        success: false,
        error: 'Another campaign in progress',
        totalExtracted: 0,
        totalSaved: 0,
        duplicatesSkipped: 0,
        tweets: []
      };
    }

    return await this.crawlSingleCampaign(topic, campaignId, maxTweets);
  }

  async close() {
    try {
      console.log('🔴 Closing Twitter Crawler...');
      
      this.activeCampaign = null;
      
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.isLoggedIn = false;
      this.loginInProgress = false;
      
      console.log('✅ Twitter Crawler closed successfully');
    } catch (error) {
      console.error('❌ Error closing crawler:', error);
    }
  }

  getStatus() {
    return {
      initialized: !!this.browser && !!this.page,
      loggedIn: this.isLoggedIn,
      loginInProgress: this.loginInProgress,
      activeCampaign: this.activeCampaign,
      lastActivity: this.lastActivity,
      userAgent: this.userAgent.toString()
    };
  }
}

export default TwitterCrawler;