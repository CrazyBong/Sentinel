import mongoose from 'mongoose';

const alertRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Rule conditions
  conditions: {
    // Tweet content conditions
    content: {
      keywords: [String],
      phrases: [String],
      regexPatterns: [String],
      sentiment: {
        threshold: Number,
        operator: {
          type: String,
          enum: ['less_than', 'greater_than', 'equals']
        }
      },
      language: [String]
    },
    
    // User conditions
    user: {
      followerCount: {
        min: Number,
        max: Number
      },
      accountAge: {
        min: Number, // days
        max: Number
      },
      verifiedOnly: Boolean,
      excludeVerified: Boolean,
      usernames: [String],
      excludeUsernames: [String]
    },
    
    // Engagement conditions
    engagement: {
      likes: {
        min: Number,
        max: Number
      },
      retweets: {
        min: Number,
        max: Number
      },
      replies: {
        min: Number,
        max: Number
      },
      rapidGrowth: {
        enabled: Boolean,
        timeWindow: Number, // minutes
        threshold: Number // percentage increase
      }
    },
    
    // Time-based conditions
    temporal: {
      timeRange: {
        start: String, // HH:MM format
        end: String
      },
      daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
      excludeHolidays: Boolean,
      timezone: String
    },
    
    // Geographic conditions
    geographic: {
      countries: [String],
      excludeCountries: [String],
      regions: [String],
      cities: [String]
    },
    
    // AI analysis conditions
    aiAnalysis: {
      classification: {
        types: [String], // fake, propaganda, etc.
        confidence: {
          min: Number,
          max: Number
        }
      },
      threats: {
        types: [String],
        severity: [String]
      }
    },
    
    // Pattern detection
    patterns: {
      coordinatedBehavior: Boolean,
      botActivity: Boolean,
      massPosting: {
        enabled: Boolean,
        threshold: Number, // posts per hour
        timeWindow: Number // hours
      },
      duplicateContent: {
        enabled: Boolean,
        similarity: Number // percentage
      }
    }
  },
  
  // Alert configuration
  alert: {
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    type: {
      type: String,
      enum: ['misinformation', 'threat', 'anomaly', 'pattern', 'manual', 'system'],
      required: true
    },
    category: {
      type: String,
      enum: [
        'fake_news',
        'hate_speech',
        'spam',
        'bot_activity',
        'coordinated_inauthentic_behavior',
        'election_interference',
        'health_misinformation',
        'financial_scam',
        'other'
      ],
      required: true
    },
    title: String,
    description: String,
    tags: [String]
  },
  
  // Actions to take when rule triggers
  actions: {
    createAlert: {
      type: Boolean,
      default: true
    },
    sendNotification: {
      enabled: Boolean,
      channels: [{
        type: {
          type: String,
          enum: ['email', 'sms', 'slack', 'webhook', 'socket']
        },
        recipients: [String],
        template: String
      }]
    },
    escalate: {
      enabled: Boolean,
      to: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      department: String,
      afterMinutes: Number
    },
    autoAssign: {
      enabled: Boolean,
      to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    rateLimiting: {
      enabled: Boolean,
      maxAlertsPerHour: Number,
      cooldownMinutes: Number
    }
  },
  
  // Rule scope
  scope: {
    campaigns: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    }],
    platforms: [String],
    global: {
      type: Boolean,
      default: false
    }
  },
  
  // Performance tracking
  performance: {
    triggerCount: {
      type: Number,
      default: 0
    },
    lastTriggered: Date,
    falsePositiveCount: {
      type: Number,
      default: 0
    },
    truePositiveCount: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    }
  },
  
  // Rule metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  
  // Testing and validation
  testResults: [{
    testedAt: Date,
    testedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    testData: mongoose.Schema.Types.Mixed,
    triggered: Boolean,
    expectedResult: Boolean,
    passed: Boolean,
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes
alertRuleSchema.index({ isActive: 1 });
alertRuleSchema.index({ 'scope.campaigns': 1 });
alertRuleSchema.index({ 'scope.global': 1 });
alertRuleSchema.index({ createdBy: 1 });
alertRuleSchema.index({ 'alert.severity': 1 });
alertRuleSchema.index({ 'performance.accuracy': -1 });

// Methods
alertRuleSchema.methods.updatePerformance = function(wasCorrect) {
  this.performance.triggerCount += 1;
  this.performance.lastTriggered = new Date();
  
  if (wasCorrect) {
    this.performance.truePositiveCount += 1;
  } else {
    this.performance.falsePositiveCount += 1;
  }
  
  const total = this.performance.truePositiveCount + this.performance.falsePositiveCount;
  this.performance.accuracy = total > 0 ? (this.performance.truePositiveCount / total) * 100 : 0;
  
  return this.save();
};

alertRuleSchema.methods.test = function(testData, expectedResult) {
  // This would contain the rule evaluation logic
  // For now, it's a placeholder
  const testResult = {
    testedAt: new Date(),
    testData,
    expectedResult,
    triggered: false, // Would be determined by rule evaluation
    passed: false,
    notes: 'Test implementation pending'
  };
  
  testResult.passed = testResult.triggered === expectedResult;
  this.testResults.push(testResult);
  
  return this.save();
};

// Static methods
alertRuleSchema.statics.getActiveRules = function(campaignId = null) {
  const query = { isActive: true };
  
  if (campaignId) {
    query.$or = [
      { 'scope.global': true },
      { 'scope.campaigns': campaignId }
    ];
  } else {
    query['scope.global'] = true;
  }
  
  return this.find(query).populate('createdBy', 'name email');
};

alertRuleSchema.statics.getTopPerformingRules = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'performance.accuracy': -1, 'performance.triggerCount': -1 })
    .limit(limit)
    .populate('createdBy', 'name email');
};

export default mongoose.model('AlertRule', alertRuleSchema);