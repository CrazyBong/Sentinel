import { chromium } from 'playwright';
import Tweet from '../models/tweet.model.js';
import UserAgent from 'user-agents';

class TwitterCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.userAgent = new UserAgent();
  }

  async init() {
    try {
      // Launch browser with stealth mode
      this.browser = await chromium.launch({
        headless: false, // Set to true for production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      this.page = await this.browser.newPage({
        userAgent: this.userAgent.toString(),
        viewport: { width: 1366, height: 768 }
      });

      // Set longer timeouts
      this.page.setDefaultTimeout(60000);
      this.page.setDefaultNavigationTimeout(60000);

      // Block unnecessary resources for faster loading
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log('✅ Twitter crawler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize crawler:', error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      if (!this.page) await this.init();

      console.log('🔐 Logging into X...');
      
      // Navigate to X login
      await this.page.goto('https://x.com/i/flow/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Wait a bit for page to fully load
      await this.page.waitForTimeout(3000);

      // Wait for username input and fill it
      console.log('👤 Entering username...');
      await this.page.waitForSelector('input[name="text"]', { timeout: 30000 });
      await this.page.click('input[name="text"]');
      await this.page.fill('input[name="text"]', username);
      
      // Click Next button
      console.log('➡️ Clicking Next...');
      await this.page.click('[role="button"]:has-text("Next")');
      
      // Wait for password input
      console.log('🔒 Waiting for password field...');
      await this.page.waitForSelector('input[name="password"]', { timeout: 30000 });
      await this.page.waitForTimeout(1000);
      
      // Fill password
      console.log('🔒 Entering password...');
      await this.page.click('input[name="password"]');
      await this.page.fill('input[name="password"]', password);
      
      // Click Log in button
      console.log('🚀 Clicking Log in...');
      await this.page.click('[role="button"]:has-text("Log in")');

      // Wait for login to complete - check for multiple possible success indicators
      console.log('⏳ Waiting for login to complete...');
      try {
        await Promise.race([
          this.page.waitForURL('**/home', { timeout: 30000 }),
          this.page.waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', { timeout: 30000 }),
          this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 30000 })
        ]);
        
        this.isLoggedIn = true;
        console.log('✅ Successfully logged into X');
        return true;
      } catch (waitError) {
        // Check if we're actually logged in by looking for user elements
        const isLoggedIn = await this.page.evaluate(() => {
          return document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null ||
                 document.querySelector('[data-testid="primaryColumn"]') !== null ||
                 window.location.href.includes('/home');
        });
        
        if (isLoggedIn) {
          this.isLoggedIn = true;
          console.log('✅ Successfully logged into X (verified by DOM)');
          return true;
        } else {
          throw waitError;
        }
      }
    } catch (error) {
      console.error('❌ X login failed:', error);
      
      // Take screenshot for debugging
      try {
        await this.page.screenshot({ path: 'login-error.png' });
        console.log('📸 Login error screenshot saved as login-error.png');
      } catch (screenshotError) {
        console.log('Failed to take screenshot:', screenshotError.message);
      }
      
      throw new Error('Failed to login to X');
    }
  }

  async searchAndCrawl(topic, maxTweets = 10) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('Not logged in to X');
      }

      console.log(`🔍 Searching for topic: ${topic}`);
      
      // Navigate to search with better error handling
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(topic)}&src=typed_query&f=live`;
      
      await this.page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Wait for page to load and then look for tweets
      await this.page.waitForTimeout(5000);
      
      // Try different selectors for tweets
      try {
        await Promise.race([
          this.page.waitForSelector('[data-testid="tweet"]', { timeout: 20000 }),
          this.page.waitForSelector('article[data-testid="tweet"]', { timeout: 20000 }),
          this.page.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 20000 })
        ]);
      } catch (selectorError) {
        console.log('⚠️ Tweet selectors not found, trying alternative approach...');
        await this.page.waitForTimeout(3000);
      }

      const tweets = [];
      let retries = 0;
      const maxRetries = 5;

      while (tweets.length < maxTweets && retries < maxRetries) {
        console.log(`📊 Extraction attempt ${retries + 1}/${maxRetries}, found ${tweets.length}/${maxTweets} tweets`);
        
        // Get current tweets on page
        const currentTweets = await this.extractTweets(topic);
        
        // Add new tweets
        for (const tweet of currentTweets) {
          if (!tweets.some(t => t.tweetId === tweet.tweetId)) {
            tweets.push(tweet);
          }
        }

        if (tweets.length < maxTweets) {
          // Scroll down to load more tweets
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          
          // Wait for new content to load
          await this.page.waitForTimeout(3000);
          retries++;
        } else {
          break;
        }
      }

      const limitedTweets = tweets.slice(0, maxTweets);
      console.log(`✅ Extracted ${limitedTweets.length} tweets for topic: ${topic}`);
      
      return limitedTweets;
    } catch (error) {
      console.error('❌ Failed to search and crawl:', error);
      
      // Take screenshot for debugging
      try {
        await this.page.screenshot({ path: 'search-error.png' });
        console.log('📸 Search error screenshot saved as search-error.png');
      } catch (screenshotError) {
        console.log('Failed to take screenshot:', screenshotError.message);
      }
      
      throw error;
    }
  }

  async extractTweets(topic) {
    try {
      const tweets = await this.page.evaluate((searchTopic) => {
        // Helper function to extract numbers from text
        const extractNumber = (text) => {
          if (!text) return 0;
          const match = text.match(/[\d,]+/);
          return match ? parseInt(match[0].replace(/,/g, '')) : 0;
        };

        // Try multiple selectors for tweets
        const tweetSelectors = [
          '[data-testid="tweet"]',
          'article[data-testid="tweet"]',
          '[data-testid="cellInnerDiv"] article'
        ];

        let tweetElements = [];
        for (const selector of tweetSelectors) {
          tweetElements = document.querySelectorAll(selector);
          if (tweetElements.length > 0) break;
        }

        console.log(`Found ${tweetElements.length} tweet elements`);
        const extractedTweets = [];

        tweetElements.forEach((tweetEl, index) => {
          try {
            // Try multiple selectors for username
            const usernameSelectors = [
              '[data-testid="User-Name"] a[href*="/"]',
              'a[href*="/"][role="link"]',
              '[data-testid="User-Names"] a'
            ];
            
            let usernameEl = null;
            for (const selector of usernameSelectors) {
              usernameEl = tweetEl.querySelector(selector);
              if (usernameEl) break;
            }

            // Try multiple selectors for content
            const contentSelectors = [
              '[data-testid="tweetText"]',
              '[lang] span',
              'div[lang] span'
            ];
            
            let contentEl = null;
            for (const selector of contentSelectors) {
              contentEl = tweetEl.querySelector(selector);
              if (contentEl && contentEl.innerText.trim()) break;
            }

            const timeEl = tweetEl.querySelector('time');

            // Skip if essential elements are missing
            if (!usernameEl || !contentEl || !contentEl.innerText.trim()) {
              return;
            }

            const username = usernameEl.href ? usernameEl.href.split('/').pop() : `user_${index}`;
            const content = contentEl.innerText.trim();
            const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();
            const tweetUrl = usernameEl.href || `https://x.com/${username}`;
            
            // Generate unique tweet ID
            const tweetId = `${username}_${Date.parse(timestamp)}_${index}`;

            // Extract engagement metrics with fallbacks
            const likesEl = tweetEl.querySelector('[data-testid="like"]') || tweetEl.querySelector('[aria-label*="like"]');
            const retweetsEl = tweetEl.querySelector('[data-testid="retweet"]') || tweetEl.querySelector('[aria-label*="repost"]');
            const repliesEl = tweetEl.querySelector('[data-testid="reply"]') || tweetEl.querySelector('[aria-label*="repl"]');

            const likes = likesEl ? extractNumber(likesEl.getAttribute('aria-label')) : 0;
            const retweets = retweetsEl ? extractNumber(retweetsEl.getAttribute('aria-label')) : 0;
            const replies = repliesEl ? extractNumber(repliesEl.getAttribute('aria-label')) : 0;

            // Get display name
            const displayNameEl = tweetEl.querySelector('[data-testid="User-Name"] span') || 
                                  tweetEl.querySelector('div[dir="ltr"] span');
            const displayName = displayNameEl ? displayNameEl.innerText : username;

            extractedTweets.push({
              tweetId,
              username,
              displayName,
              content,
              timestamp: new Date(timestamp),
              likes,
              retweets,
              replies,
              tweetUrl,
              searchTopic
            });
          } catch (err) {
            console.error('Error extracting individual tweet:', err);
          }
        });

        return extractedTweets;
      }, topic);

      console.log(`📝 Extracted ${tweets.length} tweets from page`);
      return tweets;
    } catch (error) {
      console.error('❌ Failed to extract tweets:', error);
      return [];
    }
  }

  async saveTweets(tweets) {
    try {
      const savedTweets = [];
      
      for (const tweetData of tweets) {
        try {
          // Check if tweet already exists
          const existingTweet = await Tweet.findOne({ tweetId: tweetData.tweetId });
          
          if (!existingTweet) {
            const tweet = new Tweet(tweetData);
            await tweet.save();
            savedTweets.push(tweet);
            console.log(`💾 Saved tweet from @${tweetData.username}`);
          } else {
            console.log(`⏭️ Tweet from @${tweetData.username} already exists`);
          }
        } catch (saveError) {
          console.error('Error saving individual tweet:', saveError);
        }
      }

      console.log(`✅ Saved ${savedTweets.length} new tweets to database`);
      return savedTweets;
    } catch (error) {
      console.error('❌ Failed to save tweets:', error);
      throw error;
    }
  }

  async crawlTopic(topic, maxTweets = 10) {
    try {
      console.log(`🎯 Starting crawl for topic: "${topic}" (max: ${maxTweets} tweets)`);
      
      // Search and extract tweets
      const tweets = await this.searchAndCrawl(topic, maxTweets);
      
      if (tweets.length === 0) {
        console.log('⚠️ No tweets extracted, possibly due to page structure changes');
        return {
          success: false,
          topic,
          error: 'No tweets found - page structure may have changed',
          totalExtracted: 0,
          totalSaved: 0,
          tweets: []
        };
      }
      
      // Save to database
      const savedTweets = await this.saveTweets(tweets);
      
      return {
        success: true,
        topic,
        totalExtracted: tweets.length,
        totalSaved: savedTweets.length,
        tweets: savedTweets
      };
    } catch (error) {
      console.error(`❌ Failed to crawl topic ${topic}:`, error);
      return {
        success: false,
        topic,
        error: error.message,
        totalExtracted: 0,
        totalSaved: 0,
        tweets: []
      };
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Browser closed');
      }
    } catch (error) {
      console.error('❌ Error closing browser:', error);
    }
  }

  // Method to check if still logged in
  async checkLoginStatus() {
    try {
      if (!this.page) return false;
      
      const isLoggedIn = await this.page.evaluate(() => {
        return document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null ||
               document.querySelector('[data-testid="primaryColumn"]') !== null;
      });
      
      this.isLoggedIn = isLoggedIn;
      return isLoggedIn;
    } catch (error) {
      console.error('Error checking login status:', error);
      this.isLoggedIn = false;
      return false;
    }
  }
}

export default TwitterCrawler;