import mongoose from 'mongoose';

const campaignNoteSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['general', 'analysis', 'action_item', 'important', 'update'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  relatedTweets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  }],
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notified: {
      type: Boolean,
      default: false
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: Date,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

campaignNoteSchema.index({ campaign: 1, createdAt: -1 });
campaignNoteSchema.index({ author: 1 });
campaignNoteSchema.index({ type: 1 });
campaignNoteSchema.index({ isPinned: -1, createdAt: -1 });

export default mongoose.model('CampaignNote', campaignNoteSchema);