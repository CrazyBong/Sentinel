import Tweet from '../models/tweet.model.js';
import Campaign from '../models/campaign.model.js';
import Alert from '../models/alert.model.js';
import User from '../models/user.model.js';

class AnalyticsService {
  constructor() {
    this.timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
  }

  // Generate time-series analytics for campaigns
  async generateTimeSeriesData(campaignId, timeRange = '7d', granularity = 'hour') {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const endDate = new Date();
      const startDate = new Date(endDate - this.timeRanges[timeRange]);

      // Build aggregation pipeline based on granularity
      const dateFormat = this.getDateFormat(granularity);
      const groupBy = this.getGroupBy(granularity);

      const pipeline = [
        {
          $match: {
            searchTopic: campaign.topic,
            crawledAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: dateFormat, date: "$crawledAt" } },
              classification: "$classification"
            },
            count: { $sum: 1 },
            totalEngagement: {
              $sum: { $add: ["$likes", "$retweets", "$replies"] }
            },
            avgSentiment: { $avg: "$sentiment" },
            uniqueUsers: { $addToSet: "$username" },
            maxEngagement: {
              $max: { $add: ["$likes", "$retweets", "$replies"] }
            }
          }
        },
        {
          $group: {
            _id: "$_id.date",
            total: { $sum: "$count" },
            real: {
              $sum: {
                $cond: [{ $eq: ["$_id.classification", "real"] }, "$count", 0]
              }
            },
            fake: {
              $sum: {
                $cond: [{ $eq: ["$_id.classification", "fake"] }, "$count", 0]
              }
            },
            propaganda: {
              $sum: {
                $cond: [{ $eq: ["$_id.classification", "propaganda"] }, "$count", 0]
              }
            },
            unclear: {
              $sum: {
                $cond: [{ $eq: ["$_id.classification", "unclear"] }, "$count", 0]
              }
            },
            totalEngagement: { $sum: "$totalEngagement" },
            avgSentiment: { $avg: "$avgSentiment" },
            uniqueUsers: { $sum: { $size: "$uniqueUsers" } },
            maxEngagement: { $max: "$maxEngagement" }
          }
        },
        { $sort: { "_id": 1 } }
      ];

      const timeSeriesData = await Tweet.aggregate(pipeline);

      // Fill in missing time points with zero values
      const filledData = this.fillMissingTimePoints(timeSeriesData, startDate, endDate, granularity);

      return {
        success: true,
        data: filledData,
        metadata: {
          campaignId,
          timeRange,
          granularity,
          startDate,
          endDate,
          totalPoints: filledData.length
        }
      };
    } catch (error) {
      console.error('Time series analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Advanced sentiment analysis with trends
  async generateSentimentAnalytics(campaignId, timeRange = '7d') {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const endDate = new Date();
      const startDate = new Date(endDate - this.timeRanges[timeRange]);

      // Sentiment over time
      const sentimentTimeline = await Tweet.aggregate([
        {
          $match: {
            searchTopic: campaign.topic,
            crawledAt: { $gte: startDate, $lte: endDate },
            sentiment: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d-%H", date: "$crawledAt" }
            },
            avgSentiment: { $avg: "$sentiment" },
            count: { $sum: 1 },
            positive: {
              $sum: { $cond: [{ $gt: ["$sentiment", 0.1] }, 1, 0] }
            },
            negative: {
              $sum: { $cond: [{ $lt: ["$sentiment", -0.1] }, 1, 0] }
            },
            neutral: {
              $sum: { $cond: [{ $and: [{ $gte: ["$sentiment", -0.1] }, { $lte: ["$sentiment", 0.1] }] }, 1, 0] }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      // Sentiment by classification
      const sentimentByClassification = await Tweet.aggregate([
        {
          $match: {
            searchTopic: campaign.topic,
            crawledAt: { $gte: startDate, $lte: endDate },
            sentiment: { $exists: true, $ne: null },
            classification: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: "$classification",
            avgSentiment: { $avg: "$sentiment" },
            count: { $sum: 1 },
            sentimentDistribution: {
              $push: "$sentiment"
            }
          }
        }
      ]);

      // Top emotional triggers
      const emotionalTriggers = await this.findEmotionalTriggers(campaign.topic, startDate, endDate);

      return {
        success: true,
        data: {
          timeline: sentimentTimeline,
          byClassification: sentimentByClassification,
          emotionalTriggers,
          summary: this.calculateSentimentSummary(sentimentTimeline)
        }
      };
    } catch (error) {
      console.error('Sentiment analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Network analysis for account relationships
  async generateNetworkAnalytics(campaignId, minInteractions = 2) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get tweets with interactions
      const tweets = await Tweet.find({
        searchTopic: campaign.topic,
        $or: [
          { retweets: { $gt: 0 } },
          { replies: { $gt: 0 } },
          { likes: { $gt: minInteractions } }
        ]
      }).select('username content likes retweets replies crawledAt classification');

      // Build network graph
      const nodes = new Map();
      const edges = new Map();
      const interactions = new Map();

      tweets.forEach(tweet => {
        const user = tweet.username;
        
        // Add or update user node
        if (!nodes.has(user)) {
          nodes.set(user, {
            id: user,
            label: user,
            tweets: 0,
            totalEngagement: 0,
            classifications: [],
            firstSeen: tweet.crawledAt,
            lastSeen: tweet.crawledAt
          });
        }

        const node = nodes.get(user);
        node.tweets++;
        node.totalEngagement += (tweet.likes + tweet.retweets + tweet.replies);
        node.classifications.push(tweet.classification);
        node.lastSeen = new Date(Math.max(node.lastSeen, tweet.crawledAt));

        // Track interaction patterns (simplified)
        const engagement = tweet.likes + tweet.retweets + tweet.replies;
        if (engagement > minInteractions) {
          const key = `${user}_interaction`;
          interactions.set(key, (interactions.get(key) || 0) + engagement);
        }
      });

      // Convert to arrays and calculate metrics
      const nodeArray = Array.from(nodes.values()).map(node => ({
        ...node,
        size: Math.log(node.totalEngagement + 1) * 5,
        color: this.getNodeColor(node.classifications),
        influenceScore: this.calculateInfluenceScore(node)
      }));

      const edgeArray = Array.from(edges.values());

      // Identify clusters and influential accounts
      const clusters = this.identifyClusters(nodeArray, edgeArray);
      const influentialAccounts = nodeArray
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, 10);

      return {
        success: true,
        data: {
          nodes: nodeArray,
          edges: edgeArray,
          clusters,
          influentialAccounts,
          metrics: {
            totalAccounts: nodeArray.length,
            totalInteractions: edgeArray.length,
            avgInfluenceScore: nodeArray.reduce((sum, n) => sum + n.influenceScore, 0) / nodeArray.length,
            networkDensity: this.calculateNetworkDensity(nodeArray.length, edgeArray.length)
          }
        }
      };
    } catch (error) {
      console.error('Network analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Geographic analysis of tweet origins
  async generateGeographicAnalytics(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Note: This would require location data from tweets
      // For now, we'll simulate based on timezone and language patterns
      
      const locationDistribution = await Tweet.aggregate([
        {
          $match: {
            searchTopic: campaign.topic,
            location: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: "$location",
            count: { $sum: 1 },
            avgSentiment: { $avg: "$sentiment" },
            classifications: { $push: "$classification" }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Simulate geographic hotspots
      const hotspots = this.generateGeographicHotspots(locationDistribution);

      return {
        success: true,
        data: {
          distribution: locationDistribution,
          hotspots,
          summary: {
            totalLocations: locationDistribution.length,
            topLocation: locationDistribution[0]?._id,
            globalReach: locationDistribution.length > 10
          }
        }
      };
    } catch (error) {
      console.error('Geographic analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Influence propagation analysis
  async generateInfluenceAnalytics(campaignId, timeRange = '7d') {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const endDate = new Date();
      const startDate = new Date(endDate - this.timeRanges[timeRange]);

      // Viral content identification
      const viralContent = await Tweet.aggregate([
        {
          $match: {
            searchTopic: campaign.topic,
            crawledAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $addFields: {
            viralityScore: {
              $multiply: [
                { $add: ["$retweets", 1] },
                { $ln: { $add: ["$likes", 1] } }
              ]
            }
          }
        },
        { $sort: { viralityScore: -1 } },
        { $limit: 20 }
      ]);

      // Cascade analysis
      const cascadeData = await this.analyzeCascades(campaign.topic, startDate, endDate);

      // Influence timeline
      const influenceTimeline = await Tweet.aggregate([
        {
          $match: {
            searchTopic: campaign.topic,
            crawledAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$crawledAt" }
            },
            totalReach: { $sum: { $add: ["$retweets", "$likes", "$replies"] } },
            uniqueAmplifiers: { $addToSet: "$username" },
            avgViralityScore: {
              $avg: {
                $multiply: [
                  { $add: ["$retweets", 1] },
                  { $ln: { $add: ["$likes", 1] } }
                ]
              }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      return {
        success: true,
        data: {
          viralContent,
          cascadeData,
          influenceTimeline,
          metrics: {
            totalReach: viralContent.reduce((sum, tweet) => sum + tweet.retweets + tweet.likes, 0),
            peakViralityDate: this.findPeakDate(influenceTimeline),
            influenceGrowthRate: this.calculateGrowthRate(influenceTimeline)
          }
        }
      };
    } catch (error) {
      console.error('Influence analytics error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Platform comparison analytics
  async generatePlatformComparison(campaignIds, timeRange = '7d') {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate - this.timeRanges[timeRange]);

      const campaigns = await Campaign.find({
        _id: { $in: campaignIds }
      });

      const comparisonData = [];

      for (const campaign of campaigns) {
        const stats = await Tweet.aggregate([
          {
            $match: {
              searchTopic: campaign.topic,
              crawledAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              totalTweets: { $sum: 1 },
              avgEngagement: {
                $avg: { $add: ["$likes", "$retweets", "$replies"] }
              },
              avgSentiment: { $avg: "$sentiment" },
              classifications: { $push: "$classification" }
            }
          }
        ]);

        comparisonData.push({
          campaign: {
            id: campaign._id,
            name: campaign.name,
            topic: campaign.topic,
            platform: campaign.platforms[0] || 'x'
          },
          metrics: stats[0] || {
            totalTweets: 0,
            avgEngagement: 0,
            avgSentiment: 0,
            classifications: []
          }
        });
      }

      return {
        success: true,
        data: {
          comparison: comparisonData,
          summary: this.generateComparisonSummary(comparisonData)
        }
      };
    } catch (error) {
      console.error('Platform comparison error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods
  getDateFormat(granularity) {
    const formats = {
      hour: "%Y-%m-%d-%H",
      day: "%Y-%m-%d",
      week: "%Y-%U",
      month: "%Y-%m"
    };
    return formats[granularity] || formats.day;
  }

  getGroupBy(granularity) {
    const groupings = {
      hour: { $hour: "$crawledAt" },
      day: { $dayOfYear: "$crawledAt" },
      week: { $week: "$crawledAt" },
      month: { $month: "$crawledAt" }
    };
    return groupings[granularity] || groupings.day;
  }

  fillMissingTimePoints(data, startDate, endDate, granularity) {
    const filled = [];
    const dataMap = new Map(data.map(d => [d._id, d]));
    
    let current = new Date(startDate);
    const increment = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    while (current <= endDate) {
      const key = this.formatDateForKey(current, granularity);
      const existing = dataMap.get(key);
      
      filled.push(existing || {
        _id: key,
        total: 0,
        real: 0,
        fake: 0,
        propaganda: 0,
        unclear: 0,
        totalEngagement: 0,
        avgSentiment: 0,
        uniqueUsers: 0,
        maxEngagement: 0
      });

      current = new Date(current.getTime() + increment);
    }

    return filled;
  }

  formatDateForKey(date, granularity) {
    if (granularity === 'hour') {
      return date.toISOString().substring(0, 13).replace('T', '-');
    }
    return date.toISOString().substring(0, 10);
  }

  async findEmotionalTriggers(topic, startDate, endDate) {
    // Identify content with extreme sentiment
    const triggers = await Tweet.aggregate([
      {
        $match: {
          searchTopic: topic,
          crawledAt: { $gte: startDate, $lte: endDate },
          $or: [
            { sentiment: { $lt: -0.5 } },
            { sentiment: { $gt: 0.5 } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $gt: ["$sentiment", 0] },
              "positive",
              "negative"
            ]
          },
          count: { $sum: 1 },
          avgSentiment: { $avg: "$sentiment" },
          examples: { $push: { content: "$content", sentiment: "$sentiment" } }
        }
      }
    ]);

    return triggers.map(trigger => ({
      ...trigger,
      examples: trigger.examples.slice(0, 3) // Limit examples
    }));
  }

  calculateSentimentSummary(timeline) {
    if (!timeline || timeline.length === 0) return {};

    const latest = timeline[timeline.length - 1];
    const earliest = timeline[0];
    
    return {
      currentSentiment: latest?.avgSentiment || 0,
      trend: latest?.avgSentiment > earliest?.avgSentiment ? 'improving' : 'declining',
      volatility: this.calculateVolatility(timeline.map(t => t.avgSentiment))
    };
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  getNodeColor(classifications) {
    const counts = classifications.reduce((acc, cls) => {
      acc[cls] = (acc[cls] || 0) + 1;
      return acc;
    }, {});

    const dominant = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    const colors = {
      real: '#10B981',
      fake: '#EF4444',
      propaganda: '#F59E0B',
      unclear: '#6B7280'
    };

    return colors[dominant] || '#6B7280';
  }

  calculateInfluenceScore(node) {
    return (node.totalEngagement * 0.7) + (node.tweets * 0.3);
  }

  calculateNetworkDensity(nodeCount, edgeCount) {
    if (nodeCount <= 1) return 0;
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    return edgeCount / maxEdges;
  }

  identifyClusters(nodes, edges) {
    // Simplified clustering - group by similar activity patterns
    const clusters = [];
    const visited = new Set();

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster = {
          id: clusters.length,
          nodes: [node],
          avgInfluence: node.influenceScore,
          classification: this.getDominantClassification(node.classifications)
        };
        
        clusters.push(cluster);
        visited.add(node.id);
      }
    });

    return clusters;
  }

  getDominantClassification(classifications) {
    const counts = classifications.reduce((acc, cls) => {
      acc[cls] = (acc[cls] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  generateGeographicHotspots(distribution) {
    // Generate mock geographic data for visualization
    return distribution.slice(0, 10).map((location, index) => ({
      location: location._id,
      latitude: 40.7128 + (Math.random() - 0.5) * 20, // Mock coordinates
      longitude: -74.0060 + (Math.random() - 0.5) * 40,
      intensity: location.count,
      sentiment: location.avgSentiment,
      rank: index + 1
    }));
  }

  async analyzeCascades(topic, startDate, endDate) {
    // Simplified cascade analysis
    const cascades = await Tweet.aggregate([
      {
        $match: {
          searchTopic: topic,
          crawledAt: { $gte: startDate, $lte: endDate },
          retweets: { $gt: 5 }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$crawledAt" },
            day: { $dayOfYear: "$crawledAt" }
          },
          cascadeSize: { $sum: "$retweets" },
          originators: { $addToSet: "$username" },
          avgReach: { $avg: { $add: ["$retweets", "$likes"] } }
        }
      },
      { $sort: { cascadeSize: -1 } },
      { $limit: 10 }
    ]);

    return cascades;
  }

  findPeakDate(timeline) {
    if (!timeline || timeline.length === 0) return null;
    
    return timeline.reduce((peak, current) => 
      current.totalReach > peak.totalReach ? current : peak
    );
  }

  calculateGrowthRate(timeline) {
    if (!timeline || timeline.length < 2) return 0;
    
    const start = timeline[0].totalReach;
    const end = timeline[timeline.length - 1].totalReach;
    
    return start > 0 ? ((end - start) / start) * 100 : 0;
  }

  generateComparisonSummary(data) {
    const totalTweets = data.reduce((sum, d) => sum + d.metrics.totalTweets, 0);
    const avgEngagement = data.reduce((sum, d) => sum + d.metrics.avgEngagement, 0) / data.length;
    
    return {
      totalCampaigns: data.length,
      totalTweets,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      mostActive: data.reduce((max, d) => 
        d.metrics.totalTweets > max.metrics.totalTweets ? d : max
      ),
      highestEngagement: data.reduce((max, d) => 
        d.metrics.avgEngagement > max.metrics.avgEngagement ? d : max
      )
    };
  }
}

export default AnalyticsService;