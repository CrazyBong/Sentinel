import mongoose from 'mongoose';

const tweetSchema = new mongoose.Schema({
  tweetId: {
    type: String,
    unique: true,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  retweets: {
    type: Number,
    default: 0
  },
  replies: {
    type: Number,
    default: 0
  },
  profileImageUrl: {
    type: String
  },
  tweetUrl: {
    type: String,
    required: true
  },
  searchTopic: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  verified: {
    type: Boolean,
    default: false
  },
  isClassified: {
    type: Boolean,
    default: false
  },
  classification: {
    type: String,
    enum: ['real', 'fake', 'propaganda', 'pending'],
    default: 'pending'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  crawledAt: {
    type: Date,
    default: Date.now
  },
  // AI Analysis Results
  aiAnalysis: {
    analyzed: {
      type: Boolean,
      default: false
    },
    analyzedAt: {
      type: Date
    },
    classification: {
      category: {
        type: String,
        enum: ['real', 'fake', 'propaganda', 'satire', 'opinion', 'unclear']
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      reasoning: String
    },
    sentiment: {
      score: {
        type: Number,
        min: -1,
        max: 1
      },
      label: {
        type: String,
        enum: ['positive', 'negative', 'neutral']
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      emotions: [String]
    },
    threat_assessment: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      score: {
        type: Number,
        min: 0,
        max: 1
      },
      factors: [String],
      potential_impact: String
    },
    content_analysis: {
      topics: [String],
      keywords: [String],
      entities: [String],
      claims: [String],
      source_credibility: {
        type: String,
        enum: ['high', 'medium', 'low', 'unknown']
      }
    },
    risk_indicators: {
      bot_likelihood: {
        type: Number,
        min: 0,
        max: 1
      },
      coordination_signs: Boolean,
      manipulation_tactics: [String],
      verification_status: {
        type: String,
        enum: ['verified', 'unverified', 'disputed']
      }
    },
    recommendations: {
      action: {
        type: String,
        enum: ['monitor', 'investigate', 'alert', 'escalate']
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      },
      next_steps: [String],
      alert_stakeholders: Boolean
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
tweetSchema.index({ searchTopic: 1, crawledAt: -1 });
tweetSchema.index({ tweetId: 1 });
tweetSchema.index({ username: 1 });
tweetSchema.index({ classification: 1 });
// Add indexes for AI analysis queries
tweetSchema.index({ 'aiAnalysis.analyzed': 1 });
tweetSchema.index({ 'aiAnalysis.classification.category': 1 });
tweetSchema.index({ 'aiAnalysis.threat_assessment.level': 1 });
tweetSchema.index({ 'aiAnalysis.analyzedAt': -1 });

export default mongoose.model('Tweet', tweetSchema);