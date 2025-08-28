import Tweet from '../models/tweet.model.js';
import Campaign from '../models/campaign.model.js';
import Evidence from '../models/evidence.model.js';
import Alert from '../models/alert.model.js';
import User from '../models/user.model.js';

class SearchService {
  constructor() {
    this.searchHistory = new Map();
    this.popularSearches = new Map();
  }

  // Universal search across all content types
  async universalSearch(query, options = {}) {
    try {
      const {
        userId,
        campaignId = null,
        contentTypes = ['tweets', 'campaigns', 'evidence', 'alerts'],
        filters = {},
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        dateRange = null
      } = options;

      const results = {
        tweets: [],
        campaigns: [],
        evidence: [],
        alerts: [],
        users: [],
        total: 0,
        searchTime: Date.now()
      };

      // Build base query for text search
      const textQuery = this.buildTextSearchQuery(query);
      const dateFilter = this.buildDateFilter(dateRange);

      // Search tweets
      if (contentTypes.includes('tweets')) {
        results.tweets = await this.searchTweets(textQuery, {
          ...filters,
          campaignId,
          dateFilter,
          page,
          limit: Math.ceil(limit / contentTypes.length)
        });
      }

      // Search campaigns
      if (contentTypes.includes('campaigns')) {
        results.campaigns = await this.searchCampaigns(textQuery, {
          ...filters,
          userId,
          dateFilter,
          page,
          limit: Math.ceil(limit / contentTypes.length)
        });
      }

      // Search evidence
      if (contentTypes.includes('evidence')) {
        results.evidence = await this.searchEvidence(textQuery, {
          ...filters,
          campaignId,
          dateFilter,
          page,
          limit: Math.ceil(limit / contentTypes.length)
        });
      }

      // Search alerts
      if (contentTypes.includes('alerts')) {
        results.alerts = await this.searchAlerts(textQuery, {
          ...filters,
          campaignId,
          dateFilter,
          page,
          limit: Math.ceil(limit / contentTypes.length)
        });
      }

      // Search users
      if (contentTypes.includes('users')) {
        results.users = await this.searchUsers(textQuery, {
          ...filters,
          page,
          limit: Math.ceil(limit / contentTypes.length)
        });
      }

      // Calculate total results
      results.total = results.tweets.length + results.campaigns.length + 
                     results.evidence.length + results.alerts.length + results.users.length;

      // Sort combined results by relevance
      if (sortBy === 'relevance') {
        results.combined = this.combineAndSortByRelevance(results, query);
      }

      // Track search
      this.trackSearch(query, userId, results.total);

      results.searchTime = Date.now() - results.searchTime;
      return results;

    } catch (error) {
      console.error('Universal search error:', error);
      throw error;
    }
  }

  // Advanced tweet search with AI classification
  async searchTweets(query, options = {}) {
    try {
      const {
        campaignId,
        sentiment,
        classification,
        threats,
        dateFilter,
        engagement,
        verified,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build MongoDB aggregation pipeline
      const pipeline = [];

      // Match stage
      const matchStage = {
        $match: {
          ...query,
          ...dateFilter
        }
      };

      if (campaignId) {
        matchStage.$match.campaign = campaignId;
      }

      if (sentiment !== undefined) {
        matchStage.$match.sentiment = {
          $gte: sentiment.min || -1,
          $lte: sentiment.max || 1
        };
      }

      if (classification) {
        matchStage.$match.classification = { $in: classification };
      }

      if (threats && threats.length > 0) {
        matchStage.$match['threats.type'] = { $in: threats };
      }

      if (engagement) {
        if (engagement.likes) {
          matchStage.$match.likes = {
            $gte: engagement.likes.min || 0,
            $lte: engagement.likes.max || Number.MAX_SAFE_INTEGER
          };
        }
        if (engagement.retweets) {
          matchStage.$match.retweets = {
            $gte: engagement.retweets.min || 0,
            $lte: engagement.retweets.max || Number.MAX_SAFE_INTEGER
          };
        }
      }

      if (verified !== undefined) {
        matchStage.$match.verified = verified;
      }

      pipeline.push(matchStage);

      // Add text score for relevance
      if (query.$text) {
        pipeline.push({
          $addFields: {
            score: { $meta: "textScore" }
          }
        });
      }

      // Sort stage
      const sortStage = { $sort: {} };
      if (sortBy === 'relevance' && query.$text) {
        sortStage.$sort.score = { $meta: "textScore" };
      } else {
        sortStage.$sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }
      pipeline.push(sortStage);

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      // Populate related data
      pipeline.push({
        $lookup: {
          from: 'campaigns',
          localField: 'campaign',
          foreignField: '_id',
          as: 'campaignData'
        }
      });

      const tweets = await Tweet.aggregate(pipeline);
      return tweets;

    } catch (error) {
      console.error('Tweet search error:', error);
      return [];
    }
  }

  // Campaign search with team and status filters
  async searchCampaigns(query, options = {}) {
    try {
      const {
        userId,
        status,
        priority,
        dateFilter,
        page = 1,
        limit = 20
      } = options;

      const pipeline = [];

      // Match stage
      const matchStage = {
        $match: {
          ...query,
          ...dateFilter
        }
      };

      // Access control - only campaigns user has access to
      if (userId) {
        matchStage.$match.$or = [
          { createdBy: userId },
          { 'team.user': userId }
        ];
      }

      if (status) {
        matchStage.$match.status = { $in: Array.isArray(status) ? status : [status] };
      }

      if (priority) {
        matchStage.$match.priority = { $in: Array.isArray(priority) ? priority : [priority] };
      }

      pipeline.push(matchStage);

      // Add relevance score
      if (query.$text) {
        pipeline.push({
          $addFields: {
            score: { $meta: "textScore" }
          }
        });
        pipeline.push({ $sort: { score: { $meta: "textScore" } } });
      } else {
        pipeline.push({ $sort: { createdAt: -1 } });
      }

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      // Populate team data
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      });

      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'team.user',
          foreignField: '_id',
          as: 'teamMembers'
        }
      });

      const campaigns = await Campaign.aggregate(pipeline);
      return campaigns;

    } catch (error) {
      console.error('Campaign search error:', error);
      return [];
    }
  }

  // Evidence search with file type and metadata filtering
  async searchEvidence(query, options = {}) {
    try {
      const {
        campaignId,
        fileType,
        category,
        tags,
        dateFilter,
        page = 1,
        limit = 20
      } = options;

      const pipeline = [];

      // Match stage
      const matchStage = {
        $match: {
          ...query,
          ...dateFilter,
          isArchived: false
        }
      };

      if (campaignId) {
        matchStage.$match.campaign = campaignId;
      }

      if (fileType) {
        matchStage.$match.fileType = { $in: Array.isArray(fileType) ? fileType : [fileType] };
      }

      if (category) {
        matchStage.$match.category = { $in: Array.isArray(category) ? category : [category] };
      }

      if (tags && tags.length > 0) {
        matchStage.$match.tags = { $in: tags };
      }

      pipeline.push(matchStage);

      // Add relevance score
      if (query.$text) {
        pipeline.push({
          $addFields: {
            score: { $meta: "textScore" }
          }
        });
        pipeline.push({ $sort: { score: { $meta: "textScore" } } });
      } else {
        pipeline.push({ $sort: { createdAt: -1 } });
      }

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      // Populate related data
      pipeline.push({
        $lookup: {
          from: 'campaigns',
          localField: 'campaign',
          foreignField: '_id',
          as: 'campaignData'
        }
      });

      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'uploader'
        }
      });

      const evidence = await Evidence.aggregate(pipeline);
      return evidence;

    } catch (error) {
      console.error('Evidence search error:', error);
      return [];
    }
  }

  // Alert search with severity and status filtering
  async searchAlerts(query, options = {}) {
    try {
      const {
        campaignId,
        severity,
        status,
        type,
        category,
        dateFilter,
        page = 1,
        limit = 20
      } = options;

      const pipeline = [];

      // Match stage
      const matchStage = {
        $match: {
          ...query,
          ...dateFilter,
          isArchived: false
        }
      };

      if (campaignId) {
        matchStage.$match.relatedCampaigns = campaignId;
      }

      if (severity) {
        matchStage.$match.severity = { $in: Array.isArray(severity) ? severity : [severity] };
      }

      if (status) {
        matchStage.$match.status = { $in: Array.isArray(status) ? status : [status] };
      }

      if (type) {
        matchStage.$match.type = { $in: Array.isArray(type) ? type : [type] };
      }

      if (category) {
        matchStage.$match.category = { $in: Array.isArray(category) ? category : [category] };
      }

      pipeline.push(matchStage);

      // Add relevance score
      if (query.$text) {
        pipeline.push({
          $addFields: {
            score: { $meta: "textScore" }
          }
        });
        pipeline.push({ $sort: { score: { $meta: "textScore" } } });
      } else {
        pipeline.push({ $sort: { createdAt: -1 } });
      }

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      // Populate related data
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      });

      pipeline.push({
        $lookup: {
          from: 'tweets',
          localField: 'relatedTweets',
          foreignField: '_id',
          as: 'relatedTweetsData'
        }
      });

      const alerts = await Alert.aggregate(pipeline);
      return alerts;

    } catch (error) {
      console.error('Alert search error:', error);
      return [];
    }
  }

  // User search for mentions and collaboration
  async searchUsers(query, options = {}) {
    try {
      const {
        role,
        verified,
        page = 1,
        limit = 20
      } = options;

      const pipeline = [];

      // Match stage
      const matchStage = {
        $match: {
          ...query
        }
      };

      if (role) {
        matchStage.$match.role = { $in: Array.isArray(role) ? role : [role] };
      }

      if (verified !== undefined) {
        matchStage.$match.verified = verified;
      }

      pipeline.push(matchStage);

      // Add relevance score
      if (query.$text) {
        pipeline.push({
          $addFields: {
            score: { $meta: "textScore" }
          }
        });
        pipeline.push({ $sort: { score: { $meta: "textScore" } } });
      } else {
        pipeline.push({ $sort: { createdAt: -1 } });
      }

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      // Exclude sensitive data
      pipeline.push({
        $project: {
          name: 1,
          email: 1,
          role: 1,
          avatar: 1,
          verified: 1,
          createdAt: 1,
          score: 1
        }
      });

      const users = await User.aggregate(pipeline);
      return users;

    } catch (error) {
      console.error('User search error:', error);
      return [];
    }
  }

  // Content correlation and similarity detection
  async findSimilarContent(contentId, contentType, options = {}) {
    try {
      const { limit = 10, threshold = 0.7 } = options;

      switch (contentType) {
        case 'tweet':
          return await this.findSimilarTweets(contentId, { limit, threshold });
        case 'campaign':
          return await this.findSimilarCampaigns(contentId, { limit, threshold });
        case 'evidence':
          return await this.findSimilarEvidence(contentId, { limit, threshold });
        default:
          throw new Error('Unsupported content type');
      }
    } catch (error) {
      console.error('Find similar content error:', error);
      return [];
    }
  }

  async findSimilarTweets(tweetId, options = {}) {
    try {
      const { limit = 10, threshold = 0.7 } = options;
      
      const sourceTweet = await Tweet.findById(tweetId);
      if (!sourceTweet) return [];

      // Use text similarity and common keywords
      const keywords = this.extractKeywords(sourceTweet.content);
      
      const similarTweets = await Tweet.find({
        _id: { $ne: tweetId },
        $or: [
          { content: { $regex: keywords.join('|'), $options: 'i' } },
          { hashtags: { $in: sourceTweet.hashtags || [] } },
          { mentions: { $in: sourceTweet.mentions || [] } }
        ]
      })
      .limit(limit)
      .populate('campaign', 'name')
      .lean();

      // Calculate similarity scores
      return similarTweets.map(tweet => ({
        ...tweet,
        similarity: this.calculateTextSimilarity(sourceTweet.content, tweet.content)
      })).filter(tweet => tweet.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      console.error('Find similar tweets error:', error);
      return [];
    }
  }

  async findSimilarCampaigns(campaignId, options = {}) {
    try {
      const { limit = 10 } = options;
      
      const sourceCampaign = await Campaign.findById(campaignId);
      if (!sourceCampaign) return [];

      // Find campaigns with similar topics or keywords
      const keywords = this.extractKeywords(`${sourceCampaign.name} ${sourceCampaign.description}`);
      
      const similarCampaigns = await Campaign.find({
        _id: { $ne: campaignId },
        $or: [
          { topic: sourceCampaign.topic },
          { keywords: { $in: sourceCampaign.keywords || [] } },
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } }
        ]
      })
      .limit(limit)
      .populate('createdBy', 'name')
      .lean();

      return similarCampaigns;

    } catch (error) {
      console.error('Find similar campaigns error:', error);
      return [];
    }
  }

  async findSimilarEvidence(evidenceId, options = {}) {
    try {
      const { limit = 10 } = options;
      
      const sourceEvidence = await Evidence.findById(evidenceId);
      if (!sourceEvidence) return [];

      // Find similar evidence by file type, tags, and metadata
      const similarEvidence = await Evidence.find({
        _id: { $ne: evidenceId },
        $or: [
          { fileType: sourceEvidence.fileType },
          { tags: { $in: sourceEvidence.tags || [] } },
          { category: sourceEvidence.category },
          { 'metadata.hash.md5': sourceEvidence.metadata?.hash?.md5 }
        ]
      })
      .limit(limit)
      .populate('campaign', 'name')
      .populate('uploadedBy', 'name')
      .lean();

      return similarEvidence;

    } catch (error) {
      console.error('Find similar evidence error:', error);
      return [];
    }
  }

  // Advanced pattern detection
  async detectPatterns(options = {}) {
    try {
      const {
        campaignId,
        timeRange = 24, // hours
        minOccurrences = 3
      } = options;

      const patterns = {
        repeatedContent: await this.detectRepeatedContent(campaignId, timeRange, minOccurrences),
        coordinatedPosting: await this.detectCoordinatedPosting(campaignId, timeRange),
        suspiciousAccounts: await this.detectSuspiciousAccounts(campaignId, timeRange),
        viralContent: await this.detectViralContent(campaignId, timeRange),
        temporalPatterns: await this.detectTemporalPatterns(campaignId, timeRange)
      };

      return patterns;

    } catch (error) {
      console.error('Pattern detection error:', error);
      return {};
    }
  }

  async detectRepeatedContent(campaignId, timeRange, minOccurrences) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      const pipeline = [
        {
          $match: {
            campaign: campaignId,
            createdAt: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: '$content',
            count: { $sum: 1 },
            usernames: { $addToSet: '$username' },
            tweets: { $push: '$$ROOT' }
          }
        },
        {
          $match: {
            count: { $gte: minOccurrences }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ];

      const repeatedContent = await Tweet.aggregate(pipeline);
      return repeatedContent;

    } catch (error) {
      console.error('Detect repeated content error:', error);
      return [];
    }
  }

  async detectCoordinatedPosting(campaignId, timeRange) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      // Find accounts posting very similar content at similar times
      const pipeline = [
        {
          $match: {
            campaign: campaignId,
            createdAt: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: {
              username: '$username',
              hour: { $hour: '$createdAt' }
            },
            count: { $sum: 1 },
            tweets: { $push: '$$ROOT' }
          }
        },
        {
          $match: {
            count: { $gte: 5 } // 5+ tweets in same hour
          }
        },
        {
          $group: {
            _id: '$_id.hour',
            accounts: {
              $push: {
                username: '$_id.username',
                count: '$count'
              }
            },
            totalAccounts: { $sum: 1 }
          }
        },
        {
          $match: {
            totalAccounts: { $gte: 3 } // 3+ accounts active in same hour
          }
        },
        {
          $sort: { totalAccounts: -1 }
        }
      ];

      const coordinatedActivity = await Tweet.aggregate(pipeline);
      return coordinatedActivity;

    } catch (error) {
      console.error('Detect coordinated posting error:', error);
      return [];
    }
  }

  async detectSuspiciousAccounts(campaignId, timeRange) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      const pipeline = [
        {
          $match: {
            campaign: campaignId,
            createdAt: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: '$username',
            tweetCount: { $sum: 1 },
            avgLikes: { $avg: '$likes' },
            avgRetweets: { $avg: '$retweets' },
            accountAge: { $first: '$accountCreated' },
            followerCount: { $first: '$followerCount' },
            verified: { $first: '$verified' }
          }
        },
        {
          $addFields: {
            suspiciousScore: {
              $add: [
                { $cond: [{ $gt: ['$tweetCount', 20] }, 2, 0] }, // High tweet volume
                { $cond: [{ $lt: ['$followerCount', 100] }, 1, 0] }, // Low followers
                { $cond: [{ $eq: ['$verified', false] }, 1, 0] }, // Not verified
                { $cond: [{ $lt: ['$avgLikes', 2] }, 1, 0] } // Low engagement
              ]
            }
          }
        },
        {
          $match: {
            suspiciousScore: { $gte: 3 }
          }
        },
        {
          $sort: { suspiciousScore: -1, tweetCount: -1 }
        },
        {
          $limit: 20
        }
      ];

      const suspiciousAccounts = await Tweet.aggregate(pipeline);
      return suspiciousAccounts;

    } catch (error) {
      console.error('Detect suspicious accounts error:', error);
      return [];
    }
  }

  async detectViralContent(campaignId, timeRange) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      const viralContent = await Tweet.find({
        campaign: campaignId,
        createdAt: { $gte: cutoffTime },
        $or: [
          { likes: { $gte: 100 } },
          { retweets: { $gte: 50 } },
          { replies: { $gte: 25 } }
        ]
      })
      .sort({ likes: -1, retweets: -1 })
      .limit(10)
      .lean();

      return viralContent;

    } catch (error) {
      console.error('Detect viral content error:', error);
      return [];
    }
  }

  async detectTemporalPatterns(campaignId, timeRange) {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
      
      const pipeline = [
        {
          $match: {
            campaign: campaignId,
            createdAt: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              dayOfWeek: { $dayOfWeek: '$createdAt' }
            },
            count: { $sum: 1 },
            avgLikes: { $avg: '$likes' },
            avgRetweets: { $avg: '$retweets' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const temporalPatterns = await Tweet.aggregate(pipeline);
      return temporalPatterns;

    } catch (error) {
      console.error('Detect temporal patterns error:', error);
      return [];
    }
  }

  // Utility methods
  buildTextSearchQuery(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return {};
    }

    const trimmedTerm = searchTerm.trim();
    
    // If it's a quoted phrase, search for exact phrase
    if (trimmedTerm.startsWith('"') && trimmedTerm.endsWith('"')) {
      const phrase = trimmedTerm.slice(1, -1);
      return {
        $text: { $search: `"${phrase}"` }
      };
    }

    // Regular text search with MongoDB text index
    return {
      $text: { $search: trimmedTerm }
    };
  }

  buildDateFilter(dateRange) {
    if (!dateRange) return {};

    const filter = {};
    if (dateRange.start) {
      filter.createdAt = { $gte: new Date(dateRange.start) };
    }
    if (dateRange.end) {
      filter.createdAt = { ...filter.createdAt, $lte: new Date(dateRange.end) };
    }

    return filter;
  }

  extractKeywords(text) {
    if (!text) return [];
    
    // Simple keyword extraction - remove common words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  combineAndSortByRelevance(results, query) {
    const combined = [];
    
    // Combine all results with type information
    results.tweets.forEach(item => combined.push({ ...item, _type: 'tweet' }));
    results.campaigns.forEach(item => combined.push({ ...item, _type: 'campaign' }));
    results.evidence.forEach(item => combined.push({ ...item, _type: 'evidence' }));
    results.alerts.forEach(item => combined.push({ ...item, _type: 'alert' }));
    results.users.forEach(item => combined.push({ ...item, _type: 'user' }));

    // Sort by relevance score (if available) or date
    return combined.sort((a, b) => {
      if (a.score && b.score) {
        return b.score - a.score;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  trackSearch(query, userId, resultCount) {
    try {
      // Track search history
      if (userId) {
        if (!this.searchHistory.has(userId)) {
          this.searchHistory.set(userId, []);
        }
        
        const userHistory = this.searchHistory.get(userId);
        userHistory.unshift({
          query,
          timestamp: new Date(),
          resultCount
        });
        
        // Keep only last 50 searches
        if (userHistory.length > 50) {
          userHistory.splice(50);
        }
      }

      // Track popular searches
      const popularity = this.popularSearches.get(query) || 0;
      this.popularSearches.set(query, popularity + 1);

    } catch (error) {
      console.error('Search tracking error:', error);
    }
  }

  getSearchHistory(userId) {
    return this.searchHistory.get(userId) || [];
  }

  getPopularSearches(limit = 10) {
    return Array.from(this.popularSearches.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));
  }

  // Search suggestions and autocomplete
  async getSearchSuggestions(partialQuery, options = {}) {
    try {
      const { limit = 10, contentType = 'all' } = options;
      const suggestions = new Set();

      // Add suggestions from popular searches
      const popularSearches = this.getPopularSearches(20);
      popularSearches.forEach(({ query }) => {
        if (query.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(query);
        }
      });

      // Add suggestions from existing content
      if (contentType === 'all' || contentType === 'tweets') {
        const tweetSuggestions = await Tweet.distinct('hashtags', {
          hashtags: { $regex: partialQuery, $options: 'i' }
        });
        tweetSuggestions.slice(0, 5).forEach(tag => suggestions.add(`#${tag}`));
      }

      if (contentType === 'all' || contentType === 'campaigns') {
        const campaignSuggestions = await Campaign.distinct('keywords', {
          keywords: { $regex: partialQuery, $options: 'i' }
        });
        campaignSuggestions.slice(0, 5).forEach(keyword => suggestions.add(keyword));
      }

      return Array.from(suggestions).slice(0, limit);

    } catch (error) {
      console.error('Get search suggestions error:', error);
      return [];
    }
  }
}

export default new SearchService();