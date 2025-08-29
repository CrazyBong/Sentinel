import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'false_positive'],
    default: 'open',
    required: true
  },
  type: {
    type: String,
    enum: ['misinformation', 'threat', 'anomaly', 'pattern', 'manual', 'system'],
    default: 'manual'
  },
  platform: {
    type: String,
    enum: ['x', 'facebook', 'instagram', 'tiktok', 'youtube', 'telegram', 'all'],
    default: 'x'
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
    default: 'other'
  },
  
  // Related content
  relatedTweets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet'
  }],
  relatedCampaigns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],
  relatedEvidence: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  
  // AI Analysis that triggered this alert
  triggeredBy: {
    type: String,
    enum: ['ai_analysis', 'pattern_detection', 'manual_review', 'external_api', 'user_report'],
    default: 'manual_review'
  },
  aiAnalysis: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    reasoning: String,
    threats: [String],
    patterns: [String],
    keywords: [String]
  },
  
  // Metadata
  source: {
    system: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    automated: Boolean
  },
  
  // Geographic data
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Response and actions
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: {
    type: String,
    maxlength: 500
  },
  
  // Impact assessment
  impact: {
    estimated_reach: Number,
    confirmed_harm: Boolean,
    urgency_level: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  },
  
  // Escalation
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    department: String,
    escalatedAt: Date,
    reason: String
  }],
  
  // Tags for classification
  tags: [{
    type: String,
    trim: true
  }],
  
  // Comments and updates
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: true
    }
  }],
  
  // Notification settings
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    slack: {
      type: Boolean,
      default: false
    },
    webhook: {
      type: Boolean,
      default: false
    }
  },
  
  // Workflow tracking
  workflow: {
    currentStep: String,
    steps: [{
      name: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'skipped']
      },
      completedAt: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }]
  },
  
  // Metrics and analytics
  metrics: {
    responseTime: Number, // in minutes
    resolutionTime: Number, // in minutes
    viewCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    }
  },
  
  // External integrations
  externalRefs: [{
    system: String,
    id: String,
    url: String,
    synced: Boolean,
    lastSync: Date
  }],
  
  // Archive and cleanup
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ assignedTo: 1, status: 1 });
alertSchema.index({ platform: 1, type: 1 });
alertSchema.index({ triggeredBy: 1 });
alertSchema.index({ tags: 1 });
alertSchema.index({ isArchived: 1 });
alertSchema.index({ 'impact.urgency_level': 1 });

// Compound indexes for common queries
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ severity: 1, status: 1, createdAt: -1 });
alertSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

// Virtual for alert age in hours
alertSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for response time status
alertSchema.virtual('responseStatus').get(function() {
  const ageHours = this.ageInHours;
  const severity = this.severity;
  
  // Define SLA based on severity
  const sla = {
    critical: 1,  // 1 hour
    high: 4,      // 4 hours
    medium: 24,   // 24 hours
    low: 72       // 72 hours
  };
  
  const threshold = sla[severity] || 24;
  
  if (this.status === 'resolved') return 'resolved';
  if (ageHours > threshold) return 'overdue';
  if (ageHours > threshold * 0.8) return 'warning';
  return 'on_time';
});

// Pre-save middleware
alertSchema.pre('save', function(next) {
  // Update lastModifiedBy
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.constructor._currentUser;
  }
  
  // Auto-assign urgency based on severity and type
  if (this.isModified('severity') || this.isModified('type')) {
    if (this.severity === 'critical') {
      this.impact.urgency_level = 'urgent';
    } else if (this.severity === 'high') {
      this.impact.urgency_level = 'high';
    }
  }
  
  // Update resolution timestamp
  if (this.isModified('status') && this.status === 'resolved') {
    this.resolvedAt = new Date();
    if (!this.resolvedBy) {
      this.resolvedBy = this.constructor._currentUser;
    }
  }
  
  next();
});

// Static methods
alertSchema.statics.getByStatus = function(status) {
  return this.find({ status, isArchived: false })
    .sort({ createdAt: -1 })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');
};

alertSchema.statics.getOpenAlertsCount = function() {
  return this.countDocuments({ 
    status: { $in: ['open', 'investigating'] },
    isArchived: false 
  });
};

alertSchema.statics.getCriticalAlertsCount = function() {
  return this.countDocuments({ 
    severity: 'critical',
    status: { $in: ['open', 'investigating'] },
    isArchived: false 
  });
};

// Instance methods
alertSchema.methods.addComment = function(userId, text, isInternal = true) {
  this.comments.push({
    user: userId,
    text,
    isInternal,
    createdAt: new Date()
  });
  return this.save();
};

alertSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  if (this.status === 'open') {
    this.status = 'investigating';
  }
  return this.save();
};

alertSchema.methods.escalate = function(userId, reason, department = null) {
  this.escalated = true;
  this.escalatedTo.push({
    user: userId,
    department,
    escalatedAt: new Date(),
    reason
  });
  
  // Increase severity if not already critical
  if (this.severity !== 'critical') {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(this.severity);
    this.severity = severityLevels[Math.min(currentIndex + 1, 3)];
  }
  
  return this.save();
};

export default mongoose.model('Alert', alertSchema);