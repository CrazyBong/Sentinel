import AlertRule from '../models/alertRule.model.js';
import Alert from '../models/alert.model.js';
import Tweet from '../models/tweet.model.js';
import socketService from './socketService.js';

class AlertRuleService {
  constructor() {
    this.activeRules = new Map();
    this.ruleCache = new Map();
    this.loadActiveRules();
  }

  async loadActiveRules() {
    try {
      const rules = await AlertRule.getActiveRules();
      this.activeRules.clear();
      
      for (const rule of rules) {
        this.activeRules.set(rule._id.toString(), rule);
      }
      
      console.log(`📋 Loaded ${rules.length} active alert rules`);
    } catch (error) {
      console.error('Error loading alert rules:', error);
    }
  }

  async evaluateTweet(tweet, campaignId = null) {
    try {
      const triggeredRules = [];
      const rulesToCheck = Array.from(this.activeRules.values()).filter(rule => {
        // Check if rule applies to this context
        if (rule.scope.global) return true;
        if (campaignId && rule.scope.campaigns.includes(campaignId)) return true;
        return false;
      });

      for (const rule of rulesToCheck) {
        if (await this.evaluateRule(rule, tweet)) {
          triggeredRules.push(rule);
          
          // Execute rule actions
          await this.executeRuleActions(rule, tweet, campaignId);
          
          // Update rule performance (assuming it's a true positive for now)
          rule.updatePerformance(true);
        }
      }

      return triggeredRules;
    } catch (error) {
      console.error('Error evaluating tweet against rules:', error);
      return [];
    }
  }

  async evaluateRule(rule, tweet) {
    try {
      const conditions = rule.conditions;
      
      // Content conditions
      if (conditions.content) {
        if (!this.checkContentConditions(conditions.content, tweet)) {
          return false;
        }
      }

      // User conditions
      if (conditions.user) {
        if (!this.checkUserConditions(conditions.user, tweet)) {
          return false;
        }
      }

      // Engagement conditions
      if (conditions.engagement) {
        if (!this.checkEngagementConditions(conditions.engagement, tweet)) {
          return false;
        }
      }

      // Temporal conditions
      if (conditions.temporal) {
        if (!this.checkTemporalConditions(conditions.temporal, tweet)) {
          return false;
        }
      }

      // AI Analysis conditions
      if (conditions.aiAnalysis) {
        if (!this.checkAIAnalysisConditions(conditions.aiAnalysis, tweet)) {
          return false;
        }
      }

      // Geographic conditions
      if (conditions.geographic) {
        if (!this.checkGeographicConditions(conditions.geographic, tweet)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false;
    }
  }

  checkContentConditions(conditions, tweet) {
    const content = tweet.content.toLowerCase();
    
    // Keywords check
    if (conditions.keywords && conditions.keywords.length > 0) {
      const hasKeyword = conditions.keywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Phrases check
    if (conditions.phrases && conditions.phrases.length > 0) {
      const hasPhrase = conditions.phrases.some(phrase => 
        content.includes(phrase.toLowerCase())
      );
      if (!hasPhrase) return false;
    }

    // Regex patterns
    if (conditions.regexPatterns && conditions.regexPatterns.length > 0) {
      const hasPattern = conditions.regexPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(content);
        } catch (e) {
          console.error('Invalid regex pattern:', pattern);
          return false;
        }
      });
      if (!hasPattern) return false;
    }

    // Sentiment check
    if (conditions.sentiment && tweet.sentiment !== undefined) {
      const { threshold, operator } = conditions.sentiment;
      switch (operator) {
        case 'less_than':
          if (tweet.sentiment >= threshold) return false;
          break;
        case 'greater_than':
          if (tweet.sentiment <= threshold) return false;
          break;
        case 'equals':
          if (Math.abs(tweet.sentiment - threshold) > 0.1) return false;
          break;
      }
    }

    // Language check
    if (conditions.language && conditions.language.length > 0) {
      if (!conditions.language.includes(tweet.language || 'en')) {
        return false;
      }
    }

    return true;
  }

  checkUserConditions(conditions, tweet) {
    // Follower count check
    if (conditions.followerCount) {
      const { min, max } = conditions.followerCount;
      const followers = tweet.followerCount || 0;
      if (min !== undefined && followers < min) return false;
      if (max !== undefined && followers > max) return false;
    }

    // Account age check
    if (conditions.accountAge && tweet.accountCreated) {
      const accountAgeInDays = Math.floor(
        (Date.now() - new Date(tweet.accountCreated)) / (1000 * 60 * 60 * 24)
      );
      const { min, max } = conditions.accountAge;
      if (min !== undefined && accountAgeInDays < min) return false;
      if (max !== undefined && accountAgeInDays > max) return false;
    }

    // Verified status
    if (conditions.verifiedOnly && !tweet.verified) return false;
    if (conditions.excludeVerified && tweet.verified) return false;

    // Username inclusion/exclusion
    if (conditions.usernames && conditions.usernames.length > 0) {
      if (!conditions.usernames.includes(tweet.username)) return false;
    }
    if (conditions.excludeUsernames && conditions.excludeUsernames.length > 0) {
      if (conditions.excludeUsernames.includes(tweet.username)) return false;
    }

    return true;
  }

  checkEngagementConditions(conditions, tweet) {
    // Likes check
    if (conditions.likes) {
      const { min, max } = conditions.likes;
      if (min !== undefined && tweet.likes < min) return false;
      if (max !== undefined && tweet.likes > max) return false;
    }

    // Retweets check
    if (conditions.retweets) {
      const { min, max } = conditions.retweets;
      if (min !== undefined && tweet.retweets < min) return false;
      if (max !== undefined && tweet.retweets > max) return false;
    }

    // Replies check
    if (conditions.replies) {
      const { min, max } = conditions.replies;
      if (min !== undefined && tweet.replies < min) return false;
      if (max !== undefined && tweet.replies > max) return false;
    }

    // Rapid growth check (would require historical data)
    if (conditions.rapidGrowth && conditions.rapidGrowth.enabled) {
      // This would require implementing rapid growth detection
      // For now, we'll skip this check
    }

    return true;
  }

  checkTemporalConditions(conditions, tweet) {
    const tweetTime = new Date(tweet.crawledAt || tweet.createdAt);
    
    // Time range check
    if (conditions.timeRange) {
      const tweetHour = tweetTime.getHours();
      const tweetMinute = tweetTime.getMinutes();
      const currentTime = tweetHour * 60 + tweetMinute;
      
      const [startHour, startMinute] = conditions.timeRange.start.split(':').map(Number);
      const [endHour, endMinute] = conditions.timeRange.end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (startTime <= endTime) {
        // Same day range
        if (currentTime < startTime || currentTime > endTime) return false;
      } else {
        // Crosses midnight
        if (currentTime < startTime && currentTime > endTime) return false;
      }
    }

    // Days of week check
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
      const dayOfWeek = tweetTime.getDay();
      if (!conditions.daysOfWeek.includes(dayOfWeek)) return false;
    }

    return true;
  }

  checkAIAnalysisConditions(conditions, tweet) {
    // Classification check
    if (conditions.classification) {
      const { types, confidence } = conditions.classification;
      
      if (types && types.length > 0) {
        if (!types.includes(tweet.classification)) return false;
      }
      
      if (confidence && tweet.classificationConfidence !== undefined) {
        const { min, max } = confidence;
        if (min !== undefined && tweet.classificationConfidence < min) return false;
        if (max !== undefined && tweet.classificationConfidence > max) return false;
      }
    }

    // Threats check
    if (conditions.threats && tweet.threats) {
      const { types, severity } = conditions.threats;
      
      if (types && types.length > 0) {
        const hasThreatType = tweet.threats.some(threat => types.includes(threat.type));
        if (!hasThreatType) return false;
      }
      
      if (severity && severity.length > 0) {
        const hasSeverity = tweet.threats.some(threat => severity.includes(threat.severity));
        if (!hasSeverity) return false;
      }
    }

    return true;
  }

  checkGeographicConditions(conditions, tweet) {
    if (!tweet.location) return true; // No location data, skip check
    
    // Countries check
    if (conditions.countries && conditions.countries.length > 0) {
      if (!conditions.countries.includes(tweet.location.country)) return false;
    }
    
    if (conditions.excludeCountries && conditions.excludeCountries.length > 0) {
      if (conditions.excludeCountries.includes(tweet.location.country)) return false;
    }

    return true;
  }

  async executeRuleActions(rule, tweet, campaignId) {
    try {
      const actions = rule.actions;

      // Create alert
      if (actions.createAlert) {
        await this.createAlertFromRule(rule, tweet, campaignId);
      }

      // Send notifications
      if (actions.sendNotification && actions.sendNotification.enabled) {
        await this.sendRuleNotifications(rule, tweet, actions.sendNotification);
      }

      // Auto-assign
      if (actions.autoAssign && actions.autoAssign.enabled) {
        // This would be implemented when creating the alert
      }

    } catch (error) {
      console.error('Error executing rule actions:', error);
    }
  }

  async createAlertFromRule(rule, tweet, campaignId) {
    try {
      const alert = new Alert({
        title: rule.alert.title || `Alert: ${rule.name}`,
        description: rule.alert.description || `Rule "${rule.name}" triggered by tweet from @${tweet.username}`,
        severity: rule.alert.severity,
        type: rule.alert.type,
        category: rule.alert.category,
        platform: tweet.platform || 'x',
        triggeredBy: 'ai_analysis',
        relatedTweets: [tweet._id],
        relatedCampaigns: campaignId ? [campaignId] : [],
        tags: rule.alert.tags || [],
        source: {
          system: 'alert_rule_engine',
          automated: true
        },
        aiAnalysis: {
          confidence: 0.8, // Rule-based confidence
          reasoning: `Triggered by rule: ${rule.name}`,
          threats: [],
          patterns: [rule.name],
          keywords: rule.conditions.content?.keywords || []
        },
        createdBy: rule.createdBy,
        assignedTo: rule.actions.autoAssign?.enabled ? rule.actions.autoAssign.to : null
      });

      await alert.save();

      // Send real-time alert
      socketService.sendLiveAlert(alert);

      console.log(`🚨 Alert created from rule "${rule.name}": ${alert.title}`);
      return alert;
    } catch (error) {
      console.error('Error creating alert from rule:', error);
      throw error;
    }
  }

  async sendRuleNotifications(rule, tweet, notificationConfig) {
    try {
      for (const channel of notificationConfig.channels) {
        switch (channel.type) {
          case 'socket':
            // Real-time notification via Socket.IO
            for (const recipient of channel.recipients) {
              socketService.sendNotification(recipient, {
                title: `Rule Alert: ${rule.name}`,
                message: `Rule "${rule.name}" was triggered by @${tweet.username}`,
                type: 'rule_alert',
                severity: rule.alert.severity,
                data: {
                  ruleId: rule._id,
                  tweetId: tweet._id,
                  username: tweet.username
                }
              });
            }
            break;
          case 'email':
            // Email notifications would be implemented here
            console.log(`📧 Email notification sent for rule: ${rule.name}`);
            break;
          case 'slack':
            // Slack notifications would be implemented here
            console.log(`💬 Slack notification sent for rule: ${rule.name}`);
            break;
          case 'webhook':
            // Webhook notifications would be implemented here
            console.log(`🔗 Webhook notification sent for rule: ${rule.name}`);
            break;
        }
      }
    } catch (error) {
      console.error('Error sending rule notifications:', error);
    }
  }

  // Rule management methods
  async createRule(ruleData, userId) {
    try {
      const rule = new AlertRule({
        ...ruleData,
        createdBy: userId
      });
      
      await rule.save();
      
      // Reload active rules
      await this.loadActiveRules();
      
      console.log(`📋 New alert rule created: ${rule.name}`);
      return rule;
    } catch (error) {
      console.error('Error creating rule:', error);
      throw error;
    }
  }

  async updateRule(ruleId, updateData, userId) {
    try {
      const rule = await AlertRule.findByIdAndUpdate(
        ruleId,
        {
          ...updateData,
          lastModifiedBy: userId,
          version: { $inc: 1 }
        },
        { new: true }
      );
      
      if (rule) {
        // Reload active rules
        await this.loadActiveRules();
        console.log(`📋 Alert rule updated: ${rule.name}`);
      }
      
      return rule;
    } catch (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  }

  async deleteRule(ruleId) {
    try {
      const rule = await AlertRule.findByIdAndUpdate(
        ruleId,
        { isActive: false },
        { new: true }
      );
      
      if (rule) {
        // Reload active rules
        await this.loadActiveRules();
        console.log(`📋 Alert rule deactivated: ${rule.name}`);
      }
      
      return rule;
    } catch (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  }

  // Performance monitoring
  async getRulePerformanceStats() {
    try {
      const stats = await AlertRule.aggregate([
        {
          $group: {
            _id: null,
            totalRules: { $sum: 1 },
            activeRules: { $sum: { $cond: ['$isActive', 1, 0] } },
            avgAccuracy: { $avg: '$performance.accuracy' },
            totalTriggers: { $sum: '$performance.triggerCount' },
            totalTruePositives: { $sum: '$performance.truePositiveCount' },
            totalFalsePositives: { $sum: '$performance.falsePositiveCount' }
          }
        }
      ]);

      return stats[0] || {
        totalRules: 0,
        activeRules: 0,
        avgAccuracy: 0,
        totalTriggers: 0,
        totalTruePositives: 0,
        totalFalsePositives: 0
      };
    } catch (error) {
      console.error('Error getting rule performance stats:', error);
      return null;
    }
  }
}

export default new AlertRuleService();