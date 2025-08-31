import Alert from '../models/alert.model.js';
import AlertRule from '../models/alertRule.model.js';
import Tweet from '../models/tweet.model.js';

export const getAlerts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      severity, 
      status, 
      platform,
      startDate,
      endDate 
    } = req.query;

    const filter = {};
    
    if (severity) filter.severity = { $in: severity.split(',') };
    if (status) filter.status = { $in: status.split(',') };
    if (platform) filter.platform = { $in: platform.split(',') };
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('ruleId', 'name description');

    const total = await Alert.countDocuments(filter);

    res.json({
      success: true,
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('ruleId', 'name description conditions');

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Get related tweet if available
    let relatedTweet = null;
    if (alert.triggeredBy?.tweetId) {
      relatedTweet = await Tweet.findOne({ 
        tweetId: alert.triggeredBy.tweetId 
      });
    }

    res.json({
      success: true,
      alert,
      relatedTweet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateAlertStatus = async (req, res) => {
  try {
    const { status, resolution, notes } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolution,
        notes,
        resolvedAt: status === 'resolved' ? new Date() : null,
        resolvedBy: status === 'resolved' ? req.user.id : null
      },
      { new: true }
    );

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getAlertStats = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate;
    
    switch(timeframe) {
      case '1h': startDate = new Date(now - 60 * 60 * 1000); break;
      case '24h': startDate = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now - 24 * 60 * 60 * 1000);
    }

    const stats = await Alert.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          high: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          },
          medium: {
            $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
          },
          low: {
            $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
          },
          open: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
          },
          investigating: {
            $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      open: 0,
      investigating: 0,
      resolved: 0
    };

    res.json({
      success: true,
      stats: result,
      timeframe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};