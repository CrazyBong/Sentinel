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
  }
}, {
  timestamps: true
});

// Indexes for performance
tweetSchema.index({ searchTopic: 1, crawledAt: -1 });
tweetSchema.index({ tweetId: 1 });
tweetSchema.index({ username: 1 });
tweetSchema.index({ classification: 1 });

export default mongoose.model('Tweet', tweetSchema);