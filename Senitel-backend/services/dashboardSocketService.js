import socketService from './socketService.js';
import analyticsDataService from './analyticsDataService.js';

class DashboardSocketService {
  constructor() {
    this.subscribers = new Map(); // userId -> subscription preferences
    this.startDashboardUpdates();
  }

  startDashboardUpdates() {
    // Send dashboard updates every 30 seconds
    setInterval(() => {
      this.broadcastDashboardUpdates();
    }, 30000);

    // Send real-time alerts immediately
    setInterval(() => {
      this.broadcastRealtimeAlerts();
    }, 5000);

    console.log('📊 Dashboard real-time updates started');
  }

  async broadcastDashboardUpdates() {
    try {
      for (const [userId, preferences] of this.subscribers.entries()) {
        if (preferences.dashboard) {
          const overview = await analyticsDataService.getDashboardOverview(userId, 1); // Last hour
          
          socketService.sendNotification(userId, {
            type: 'dashboard_update',
            title: 'Dashboard Update',
            data: {
              summary: overview.summary,
              realTime: overview.realTime,
              timestamp: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Dashboard updates broadcast error:', error);
    }
  }

  async broadcastRealtimeAlerts() {
    try {
      const liveAlerts = await analyticsDataService.getRealtimeData('live_alerts', { limit: 5 });
      
      if (liveAlerts && liveAlerts.alerts.length > 0) {
        // Broadcast to all subscribed users
        for (const [userId, preferences] of this.subscribers.entries()) {
          if (preferences.alerts) {
            socketService.sendNotification(userId, {
              type: 'live_alerts_update',
              title: 'New Alerts Detected',
              data: liveAlerts,
              urgent: liveAlerts.alerts.some(alert => alert.severity === 'critical')
            });
          }
        }
      }
    } catch (error) {
      console.error('Realtime alerts broadcast error:', error);
    }
  }

  subscribeToDashboardUpdates(userId, preferences = {}) {
    this.subscribers.set(userId, {
      dashboard: true,
      alerts: true,
      campaigns: true,
      system: false,
      ...preferences
    });

    console.log(`📊 User ${userId} subscribed to dashboard updates`);
  }

  unsubscribeFromDashboardUpdates(userId) {
    this.subscribers.delete(userId);
    console.log(`📊 User ${userId} unsubscribed from dashboard updates`);
  }

  updateSubscriptionPreferences(userId, preferences) {
    const current = this.subscribers.get(userId) || {};
    this.subscribers.set(userId, { ...current, ...preferences });
  }

  // Send immediate dashboard refresh
  async sendDashboardRefresh(userId, campaignId = null) {
    try {
      const overview = await analyticsDataService.getDashboardOverview(userId, 24);
      
      socketService.sendNotification(userId, {
        type: 'dashboard_refresh',
        title: 'Dashboard Refreshed',
        data: overview,
        campaignId
      });

    } catch (error) {
      console.error('Dashboard refresh error:', error);
    }
  }

  // Send campaign-specific updates
  async sendCampaignUpdate(campaignId, updateType, data) {
    try {
      const campaignData = await analyticsDataService.getRealtimeData('live_tweets', { 
        campaignId, 
        limit: 10 
      });

      socketService.sendCampaignUpdate({
        campaignId,
        type: updateType,
        data: {
          ...data,
          analytics: campaignData,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Campaign update error:', error);
    }
  }
}

export default new DashboardSocketService();