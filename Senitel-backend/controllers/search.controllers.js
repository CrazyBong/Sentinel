import searchService from '../services/searchService.js';
import Joi from 'joi';

// Validation schemas
const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500),
  contentTypes: Joi.array().items(
    Joi.string().valid('tweets', 'campaigns', 'evidence', 'alerts', 'users')
  ).optional(),
  filters: Joi.object({
    sentiment: Joi.object({
      min: Joi.number().min(-1).max(1),
      max: Joi.number().min(-1).max(1)
    }),
    classification: Joi.array().items(Joi.string()),
    threats: Joi.array().items(Joi.string()),
    engagement: Joi.object({
      likes: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      }),
      retweets: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      })
    }),
    verified: Joi.boolean(),
    fileType: Joi.array().items(Joi.string()),
    category: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    severity: Joi.array().items(Joi.string().valid('low', 'medium', 'high', 'critical')),
    status: Joi.array().items(Joi.string()),
    type: Joi.array().items(Joi.string()),
    priority: Joi.array().items(Joi.string().valid('low', 'medium', 'high', 'urgent')),
    role: Joi.array().items(Joi.string())
  }).optional(),
  dateRange: Joi.object({
    start: Joi.date(),
    end: Joi.date()
  }).optional(),
  campaignId: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('relevance', 'createdAt', 'likes', 'retweets').default('relevance'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const similarContentSchema = Joi.object({
  contentId: Joi.string().required(),
  contentType: Joi.string().valid('tweet', 'campaign', 'evidence').required(),
  limit: Joi.number().min(1).max(50).default(10),
  threshold: Joi.number().min(0).max(1).default(0.7)
});

const patternDetectionSchema = Joi.object({
  campaignId: Joi.string().optional(),
  timeRange: Joi.number().min(1).max(168).default(24), // 1 hour to 1 week
  minOccurrences: Joi.number().min(2).max(100).default(3)
});

// Universal search endpoint
export const universalSearch = async (req, res) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const options = {
      ...value,
      userId: req.user._id
    };

    const results = await searchService.universalSearch(value.query, options);

    res.json({
      success: true,
      data: {
        ...results,
        query: value.query,
        options: {
          contentTypes: value.contentTypes,
          filters: value.filters,
          dateRange: value.dateRange,
          page: value.page,
          limit: value.limit,
          sortBy: value.sortBy
        }
      }
    });

  } catch (error) {
    console.error('Universal search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};

// Quick search for autocomplete
export const quickSearch = async (req, res) => {
  try {
    const { q, type = 'all', limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
          results: []
        }
      });
    }

    // Get search suggestions
    const suggestions = await searchService.getSearchSuggestions(q, { 
      limit: Math.ceil(limit / 2), 
      contentType: type 
    });

    // Get quick results
    const quickResults = await searchService.universalSearch(q, {
      userId: req.user._id,
      contentTypes: type === 'all' ? ['tweets', 'campaigns'] : [type],
      limit: Math.ceil(limit / 2)
    });

    res.json({
      success: true,
      data: {
        suggestions,
        results: quickResults.combined || [],
        total: quickResults.total,
        searchTime: quickResults.searchTime
      }
    });

  } catch (error) {
    console.error('Quick search error:', error);
    res.status(500).json({
      success: false,
      message: 'Quick search failed'
    });
  }
};

// Find similar content
export const findSimilarContent = async (req, res) => {
  try {
    const { error, value } = similarContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const similarContent = await searchService.findSimilarContent(
      value.contentId,
      value.contentType,
      {
        limit: value.limit,
        threshold: value.threshold
      }
    );

    res.json({
      success: true,
      data: {
        similarContent,
        contentId: value.contentId,
        contentType: value.contentType,
        threshold: value.threshold,
        count: similarContent.length
      }
    });

  } catch (error) {
    console.error('Find similar content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find similar content'
    });
  }
};

// Pattern detection
export const detectPatterns = async (req, res) => {
  try {
    const { error, value } = patternDetectionSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const patterns = await searchService.detectPatterns(value);

    res.json({
      success: true,
      data: {
        patterns,
        analysis: {
          timeRange: value.timeRange,
          campaignId: value.campaignId,
          detectionTime: new Date(),
          summary: {
            repeatedContentCount: patterns.repeatedContent?.length || 0,
            coordinatedActivityCount: patterns.coordinatedPosting?.length || 0,
            suspiciousAccountsCount: patterns.suspiciousAccounts?.length || 0,
            viralContentCount: patterns.viralContent?.length || 0,
            temporalPatternsCount: patterns.temporalPatterns?.length || 0
          }
        }
      }
    });

  } catch (error) {
    console.error('Pattern detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Pattern detection failed'
    });
  }
};

// Advanced tweet search
export const searchTweets = async (req, res) => {
  try {
    const { 
      query,
      campaignId,
      sentiment,
      classification,
      threats,
      engagement,
      verified,
      dateRange,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const textQuery = searchService.buildTextSearchQuery(query);
    const dateFilter = searchService.buildDateFilter(dateRange ? JSON.parse(dateRange) : null);

    const tweets = await searchService.searchTweets(textQuery, {
      campaignId,
      sentiment: sentiment ? JSON.parse(sentiment) : undefined,
      classification: classification ? classification.split(',') : undefined,
      threats: threats ? threats.split(',') : undefined,
      engagement: engagement ? JSON.parse(engagement) : undefined,
      verified: verified !== undefined ? verified === 'true' : undefined,
      dateFilter,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: {
        tweets,
        query,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Tweet search error:', error);
    res.status(500).json({
      success: false,
      message: 'Tweet search failed'
    });
  }
};

// Get search history
export const getSearchHistory = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const history = searchService.getSearchHistory(req.user._id).slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });

  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search history'
    });
  }
};

// Get popular searches
export const getPopularSearches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularSearches = searchService.getPopularSearches(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        popularSearches,
        count: popularSearches.length
      }
    });

  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches'
    });
  }
};

// Search analytics
export const getSearchAnalytics = async (req, res) => {
  try {
    const { timeRange = 24 } = req.query; // hours
    
    // This would typically come from a dedicated analytics collection
    // For now, we'll provide basic analytics
    const analytics = {
      totalSearches: searchService.popularSearches.size,
      uniqueUsers: searchService.searchHistory.size,
      topQueries: searchService.getPopularSearches(10),
      searchTrends: [], // Would be implemented with time-series data
      avgResultsPerSearch: 0, // Would be calculated from search logs
      searchSuccessRate: 0 // Percentage of searches that returned results
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get search analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search analytics'
    });
  }
};