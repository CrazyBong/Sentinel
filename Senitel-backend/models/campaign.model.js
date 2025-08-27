import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  settings: {
    maxTweets: {
      type: Number,
      default: 100
    },
    crawlInterval: {
      type: Number,
      default: 300000 // 5 minutes in milliseconds
    },
    platforms: [{
      type: String,
      enum: ['twitter', 'facebook', 'reddit'],
      default: ['twitter']
    }]
  },
  stats: {
    totalTweets: {
      type: Number,
      default: 0
    },
    lastCrawled: Date,
    fakePosts: {
      type: Number,
      default: 0
    },
    realPosts: {
      type: Number,
      default: 0
    },
    propagandaPosts: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Campaign', campaignSchema);