import mongoose from 'mongoose';

const tweetSchema = new mongoose.Schema({
  tweetId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  displayName: {
    type: String,
    required: false,
    default: ''
  },
  content: {
    type: String,
    required: true,
    index: 'text'
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  crawledAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  searchTopic: {
    type: String,
    required: true,
    index: true
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
  user: {
    name: String,
    username: String,
    displayName: String,
    profileImageUrl: String,
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    description: String,
    location: String,
    url: String,
    joinedDate: Date
  },
  media: [{
    type: { type: String },
    url: String,
    previewUrl: String,
    altText: String
  }],
  hashtags: [String],
  mentions: [String],
  urls: [String],
  isRetweet: {
    type: Boolean,
    default: false
  },
  retweetOf: String,
  inReplyTo: String,
  conversationId: String,
  lang: String,
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  
  // ADD THIS: Complete AI Analysis Schema
  aiAnalysis: {
    sentiment: {
      score: { type: Number, min: -1, max: 1, default: null },
      label: { type: String, default: null },
      confidence: { type: Number, min: 0, max: 1, default: null },
      emotions: [String]
    },
    threat_assessment: {
      level: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'critical', null],  // ✅ Add null
        default: null 
      },
      score: { type: Number, min: 0, max: 1, default: null },
      factors: [String],
      potential_impact: { type: String, default: null }
    },
    content_analysis: {
      topics: [String],
      keywords: [String],
      entities: [{
        type: String,
        name: String,
        confidence: Number
      }],
      claims: [{
        text: String,
        type: String, // 'factual', 'opinion', 'unverified'
        confidence: Number
      }]
    },
    risk_indicators: {
      manipulation_tactics: [String],
      bot_likelihood: { type: Number, min: 0, max: 1, default: null },
      coordination_signs: { type: Boolean, default: false }
    },
    recommendations: {
      action: { 
        type: String, 
        enum: ['monitor', 'investigate', 'flag', 'escalate', null],  // ✅ Add null
        default: null 
      },
      priority: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'critical', null],  // ✅ Add null
        default: null 
      },
      next_steps: [String]
    },
    analyzed: { type: Boolean, default: false },
    analyzedAt: { type: Date, default: null }
  },
  
  // Keep existing AI fields for backward compatibility
  sentiment: {
    type: Number,
    min: -1,
    max: 1
  },
  classification: {
    type: String,
    enum: ['real', 'fake', 'propaganda', 'bot', 'opinion', 'misinformation', 'unclear', 'unknown'],
    default: 'unknown'
  },
  classificationConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  topics: [String],
  entities: [{
    type: String,
    value: String,
    confidence: Number
  }],
  
  // Metadata
  source: {
    type: String,
    default: 'twitter'
  },
  crawlerVersion: String,
  processingFlags: {
    analyzed: { type: Boolean, default: false },
    classified: { type: Boolean, default: false },
    sentimentAnalyzed: { type: Boolean, default: false }
  },
  
  // Alert references
  alerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }],
  hasAlerts: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'tweets'
});

// Indexes for better performance
tweetSchema.index({ searchTopic: 1, crawledAt: -1 });
tweetSchema.index({ username: 1, timestamp: -1 });
tweetSchema.index({ classification: 1, crawledAt: -1 });
tweetSchema.index({ sentiment: 1 });
tweetSchema.index({ 'user.isVerified': 1 });
tweetSchema.index({ 'aiAnalysis.analyzed': 1 });
tweetSchema.index({ 'aiAnalysis.threat_assessment.level': 1 });
tweetSchema.index({ 'processingFlags.analyzed': 1 });

export default mongoose.model('Tweet', tweetSchema);