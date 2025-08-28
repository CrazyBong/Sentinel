import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'document', 'audio', 'archive', 'other']
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  filePath: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String // For images/videos
  },
  metadata: {
    dimensions: {
      width: Number,
      height: Number
    },
    duration: Number, // For videos/audio
    pageCount: Number, // For documents
    colorSpace: String,
    format: String,
    compression: String,
    created: Date,
    modified: Date,
    author: String,
    title: String,
    description: String,
    keywords: [String],
    gps: {
      latitude: Number,
      longitude: Number,
      altitude: Number
    },
    device: {
      make: String,
      model: String,
      software: String
    },
    hash: {
      md5: String,
      sha256: String
    }
  },
  analysis: {
    analyzed: {
      type: Boolean,
      default: false
    },
    analyzedAt: Date,
    aiResults: {
      contentType: String,
      objects: [String],
      text: String,
      faces: [{
        confidence: Number,
        boundingBox: {
          x: Number,
          y: Number,
          width: Number,
          height: Number
        }
      }],
      landmarks: [String],
      sentiment: Number,
      explicit: Boolean,
      violence: Boolean,
      medical: Boolean
    },
    forensics: {
      authentic: Boolean,
      confidence: Number,
      manipulations: [String],
      source: String,
      timestamp: Date
    }
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  relatedTweets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  }],
  relatedAlerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['screenshot', 'media_file', 'document', 'report', 'backup', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed', 'archived'],
    default: 'processing'
  },
  visibility: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'team'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  versions: [{
    version: {
      type: Number,
      default: 1
    },
    filename: String,
    filePath: String,
    url: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changes: String
  }],
  accessLog: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['view', 'download', 'edit', 'delete', 'share']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
evidenceSchema.index({ campaign: 1, createdAt: -1 });
evidenceSchema.index({ uploadedBy: 1 });
evidenceSchema.index({ fileType: 1 });
evidenceSchema.index({ status: 1 });
evidenceSchema.index({ 'metadata.hash.sha256': 1 });
evidenceSchema.index({ tags: 1 });
evidenceSchema.index({ isArchived: 1 });

// Virtual for file size in human readable format
evidenceSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for current version
evidenceSchema.virtual('currentVersion').get(function() {
  return this.versions.length > 0 ? Math.max(...this.versions.map(v => v.version)) : 1;
});

export default mongoose.model('Evidence', evidenceSchema);