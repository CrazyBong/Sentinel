import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // socketId -> user data
    this.userSockets = new Map();    // userId -> Set of socketIds
    this.rooms = new Map();          // roomId -> Set of socketIds
    this.campaignSubscriptions = new Map(); // campaignId -> Set of socketIds
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('🚀 Socket.IO service initialized successfully');
    return this;
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.userData = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      // Real-time event handlers
      socket.on('join_campaign', (data) => this.handleJoinCampaign(socket, data));
      socket.on('leave_campaign', (data) => this.handleLeaveCampaign(socket, data));
      socket.on('subscribe_alerts', (data) => this.handleSubscribeAlerts(socket, data));
      socket.on('user_activity', (data) => this.handleUserActivity(socket, data));
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
      socket.on('request_status', () => this.handleStatusRequest(socket));
      
      // Disconnect handler
      socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));
    });
  }

  handleConnection(socket) {
    const { userId, userData } = socket;
    
    // Track user connection
    this.connectedUsers.set(socket.id, {
      userId,
      userData,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Track user's multiple sockets (multiple tabs/devices)
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: new Date(),
      activeUsers: this.getActiveUsersCount(),
      message: 'Connected to SentinelAI real-time system'
    });

    // Notify other users of new connection (for collaborative features)
    socket.broadcast.emit('user_online', {
      userId,
      userData,
      timestamp: new Date()
    });

    console.log(`✅ User connected: ${userData.name} (${userId}) - Socket: ${socket.id}`);
  }

  handleJoinCampaign(socket, data) {
    try {
      const { campaignId } = data;
      const roomName = `campaign_${campaignId}`;
      
      socket.join(roomName);
      
      // Track campaign subscriptions
      if (!this.campaignSubscriptions.has(campaignId)) {
        this.campaignSubscriptions.set(campaignId, new Set());
      }
      this.campaignSubscriptions.get(campaignId).add(socket.id);

      // Notify room of new member
      socket.to(roomName).emit('user_joined_campaign', {
        userId: socket.userId,
        userData: socket.userData,
        campaignId,
        timestamp: new Date()
      });

      socket.emit('campaign_joined', {
        campaignId,
        roomSize: this.io.sockets.adapter.rooms.get(roomName)?.size || 1,
        message: `Joined campaign ${campaignId} real-time updates`
      });

      console.log(`📊 User ${socket.userData.name} joined campaign ${campaignId}`);
    } catch (error) {
      console.error('Join campaign error:', error);
      socket.emit('error', { message: 'Failed to join campaign' });
    }
  }

  handleLeaveCampaign(socket, data) {
    try {
      const { campaignId } = data;
      const roomName = `campaign_${campaignId}`;
      
      socket.leave(roomName);
      
      // Remove from campaign subscriptions
      if (this.campaignSubscriptions.has(campaignId)) {
        this.campaignSubscriptions.get(campaignId).delete(socket.id);
      }

      socket.to(roomName).emit('user_left_campaign', {
        userId: socket.userId,
        userData: socket.userData,
        campaignId,
        timestamp: new Date()
      });

      socket.emit('campaign_left', { campaignId });
      console.log(`📊 User ${socket.userData.name} left campaign ${campaignId}`);
    } catch (error) {
      console.error('Leave campaign error:', error);
    }
  }

  handleSubscribeAlerts(socket, data) {
    const { severity = ['high', 'critical'], categories = [] } = data;
    
    socket.alertSubscription = {
      severity,
      categories,
      subscribedAt: new Date()
    };

    socket.emit('alert_subscription_updated', {
      severity,
      categories,
      message: 'Alert subscription updated successfully'
    });

    console.log(`🚨 User ${socket.userData.name} subscribed to alerts:`, { severity, categories });
  }

  handleUserActivity(socket, data) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.lastActivity = new Date();
    }

    // Broadcast user activity to relevant campaigns
    if (data.campaignId) {
      socket.to(`campaign_${data.campaignId}`).emit('user_activity', {
        userId: socket.userId,
        activity: data.activity,
        timestamp: new Date()
      });
    }
  }

  handleTypingStart(socket, data) {
    if (data.campaignId) {
      socket.to(`campaign_${data.campaignId}`).emit('user_typing', {
        userId: socket.userId,
        userData: socket.userData,
        campaignId: data.campaignId,
        isTyping: true
      });
    }
  }

  handleTypingStop(socket, data) {
    if (data.campaignId) {
      socket.to(`campaign_${data.campaignId}`).emit('user_typing', {
        userId: socket.userId,
        userData: socket.userData,
        campaignId: data.campaignId,
        isTyping: false
      });
    }
  }

  handleStatusRequest(socket) {
    socket.emit('system_status', {
      activeUsers: this.getActiveUsersCount(),
      activeCampaigns: this.campaignSubscriptions.size,
      serverUptime: process.uptime(),
      timestamp: new Date()
    });
  }

  handleDisconnection(socket, reason) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (userInfo) {
      const { userId, userData } = userInfo;
      
      // Clean up user tracking
      this.connectedUsers.delete(socket.id);
      
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // User completely disconnected (no more sockets)
          socket.broadcast.emit('user_offline', {
            userId,
            userData,
            timestamp: new Date()
          });
        }
      }

      // Clean up campaign subscriptions
      for (const [campaignId, socketSet] of this.campaignSubscriptions.entries()) {
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          this.campaignSubscriptions.delete(campaignId);
        }
      }

      console.log(`❌ User disconnected: ${userData.name} (${userId}) - Reason: ${reason}`);
    }
  }

  // Public methods for sending real-time updates
  sendLiveAlert(alert) {
    try {
      const alertData = {
        id: alert._id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        type: alert.type,
        platform: alert.platform,
        createdAt: alert.createdAt,
        createdBy: alert.createdBy,
        triggeredBy: alert.triggeredBy,
        aiAnalysis: alert.aiAnalysis
      };

      // Send to all connected users first
      this.io.emit('live_alert', {
        alert: alertData,
        timestamp: new Date(),
        urgency: alert.severity === 'critical' ? 'immediate' : 'normal'
      });

      // Send targeted alerts based on subscriptions
      for (const [socketId, userInfo] of this.connectedUsers.entries()) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket?.alertSubscription) {
          const { severity, categories } = socket.alertSubscription;
          
          // Check if alert matches user's subscription
          const severityMatch = severity.includes(alert.severity);
          const categoryMatch = categories.length === 0 || categories.includes(alert.category);
          
          if (severityMatch && categoryMatch) {
            socket.emit('targeted_alert', {
              alert: alertData,
              matchedCriteria: { severity: severityMatch, category: categoryMatch },
              timestamp: new Date()
            });
          }
        }
      }

      console.log(`🚨 Live alert sent: ${alert.title} (${alert.severity})`);
      return true;
    } catch (error) {
      console.error('Send live alert error:', error);
      return false;
    }
  }

  sendCampaignUpdate(update) {
    try {
      const { campaignId, type, data } = update;
      const roomName = `campaign_${campaignId}`;
      
      this.io.to(roomName).emit('campaign_update', {
        campaignId,
        type,
        data,
        timestamp: new Date()
      });

      console.log(`📊 Campaign update sent to ${campaignId}: ${type}`);
      return true;
    } catch (error) {
      console.error('Send campaign update error:', error);
      return false;
    }
  }

  sendCrawlerStatus(status) {
    try {
      this.io.emit('crawler_status', {
        ...status,
        timestamp: new Date()
      });

      console.log(`🕷️ Crawler status update sent: ${status.status}`);
      return true;
    } catch (error) {
      console.error('Send crawler status error:', error);
      return false;
    }
  }

  sendNotification(userId, notification) {
    try {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        for (const socketId of userSocketSet) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('notification', {
              ...notification,
              timestamp: new Date()
            });
          }
        }
        console.log(`🔔 Notification sent to ${userId}: ${notification.title}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Send notification error:', error);
      return false;
    }
  }

  broadcastMessage(event, data) {
    try {
      this.io.emit(event, {
        ...data,
        timestamp: new Date()
      });
      console.log(`📡 Broadcast sent: ${event}`);
      return true;
    } catch (error) {
      console.error('Broadcast message error:', error);
      return false;
    }
  }

  // Real-time analytics
  sendAnalyticsUpdate(campaignId, analyticsData) {
    try {
      const roomName = `campaign_${campaignId}`;
      this.io.to(roomName).emit('analytics_update', {
        campaignId,
        data: analyticsData,
        timestamp: new Date()
      });
      return true;
    } catch (error) {
      console.error('Send analytics update error:', error);
      return false;
    }
  }

  // Evidence real-time updates
  sendEvidenceUpdate(campaignId, evidenceData) {
    try {
      const roomName = `campaign_${campaignId}`;
      this.io.to(roomName).emit('evidence_update', {
        campaignId,
        evidence: evidenceData,
        timestamp: new Date()
      });
      return true;
    } catch (error) {
      console.error('Send evidence update error:', error);
      return false;
    }
  }

  // Utility methods
  getActiveUsersCount() {
    return this.userSockets.size;
  }

  getConnectedUsers() {
    return Array.from(this.userSockets.keys());
  }

  getCampaignSubscribers(campaignId) {
    const subscribers = this.campaignSubscriptions.get(campaignId);
    return subscribers ? Array.from(subscribers) : [];
  }

  getUserStatus(userId) {
    const userSocketSet = this.userSockets.get(userId);
    return {
      online: !!userSocketSet && userSocketSet.size > 0,
      socketCount: userSocketSet ? userSocketSet.size : 0,
      lastSeen: this.getLastActivity(userId)
    };
  }

  getLastActivity(userId) {
    const userSocketSet = this.userSockets.get(userId);
    if (!userSocketSet) return null;

    let lastActivity = null;
    for (const socketId of userSocketSet) {
      const userInfo = this.connectedUsers.get(socketId);
      if (userInfo && (!lastActivity || userInfo.lastActivity > lastActivity)) {
        lastActivity = userInfo.lastActivity;
      }
    }
    return lastActivity;
  }

  // Admin methods
  getSystemStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      uniqueUsers: this.userSockets.size,
      activeCampaigns: this.campaignSubscriptions.size,
      totalConnections: this.connectedUsers.size,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  kickUser(userId, reason = 'Administrative action') {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      for (const socketId of userSocketSet) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
        }
      }
      return true;
    }
    return false;
  }

  broadcastSystemMessage(message, level = 'info') {
    this.io.emit('system_message', {
      message,
      level,
      timestamp: new Date()
    });
  }
}

// Export singleton instance
export default new SocketService();