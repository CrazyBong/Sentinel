import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 50
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  },
  description: {
    type: String,
    maxlength: 200
  },
  category: {
    type: String,
    enum: ['topic', 'priority', 'status', 'custom'],
    default: 'custom'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isSystemTag: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

tagSchema.index({ name: 1 });
tagSchema.index({ category: 1 });
tagSchema.index({ usageCount: -1 });

export default mongoose.model('Tag', tagSchema);