import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['misinformation', 'propaganda', 'bot_activity', 'general', 'political', 'health', 'finance'],
    default: 'general'
  },
  platforms: [{
    type: String,
    enum: ['x', 'reddit', 'facebook', 'tiktok', 'youtube'],
    default: ['x']
  }],
  keywords: [{
    type: String,
    trim: true
  }],
  hashtags: [{
    type: String,
    trim: true
  }],
  targetAccounts: [{
    platform: {
      type: String,
      enum: ['x', 'reddit', 'facebook', 'tiktok', 'youtube']
    },
    username: String,
    handle: String,
    notes: String
  }],
  settings: {
    maxTweets: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000
    },
    crawlInterval: {
      type: Number,
      default: 300000, // 5 minutes
      min: 60000 // 1 minute
    },
    alertThreshold: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    enableRealTimeAlerts: {
      type: Boolean,
      default: true
    },
    autoClassification: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalTweets: {
      type: Number,
      default: 0
    },
    realPosts: {
      type: Number,
      default: 0
    },
    fakePosts: {
      type: Number,
      default: 0
    },
    propagandaPosts: {
      type: Number,
      default: 0
    },
    pendingPosts: {
      type: Number,
      default: 0
    },
    totalEngagement: {
      type: Number,
      default: 0
    },
    avgSentiment: {
      type: Number,
      default: 0
    },
    lastCrawled: {
      type: Date
    },
    alertsGenerated: {
      type: Number,
      default: 0
    }
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['lead', 'analyst', 'viewer'],
      default: 'analyst'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  evidence: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  completedReason: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Indexes for performance
campaignSchema.index({ status: 1, isArchived: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ topic: 'text', name: 'text', description: 'text' });
campaignSchema.index({ 'stats.lastCrawled': -1 });
campaignSchema.index({ priority: 1, status: 1 });

// Virtual for calculated severity
campaignSchema.virtual('severity').get(function() {
  if (!this.stats || !this.stats.totalTweets) return 'low';
  
  const { fakePosts = 0, propagandaPosts = 0, totalTweets = 1 } = this.stats;
  const riskRatio = (fakePosts + propagandaPosts) / totalTweets;
  
  if (riskRatio > 0.7) return 'high';
  if (riskRatio > 0.3) return 'medium';
  return 'low';
});

// Virtual for activity score
campaignSchema.virtual('activityScore').get(function() {
  if (!this.stats) return 0;
  
  const { totalTweets = 0, lastCrawled } = this.stats;
  const hoursSinceLastCrawl = lastCrawled ? 
    (Date.now() - new Date(lastCrawled).getTime()) / (1000 * 60 * 60) : 24;
  
  const activityScore = Math.min(100, (totalTweets / 10) + (24 - hoursSinceLastCrawl) * 2);
  return Math.max(0, Math.floor(activityScore));
});

export default mongoose.model('Campaign', campaignSchema);