/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react"
import { Bell } from "lucide-react"
import { Archive } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Clock } from "lucide-react"               // keep lucide only for neutral icons
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { io } from "socket.io-client"
import axios from "axios"
import Sidebar from "../components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"
import ShieldLogo from "@/assets/shield.png"
import CampArchieve from "@/assets/archive.png"


// --- CONFIG: set your Socket.IO endpoint here ---
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// ---------- Axios configuration ----------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle responses
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ---------- inline brand icons (no runtime import issues) ----------
function XIcon({ className = "w-4 h-4", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M18 2H21L13.5 10.5L22.5 22H15L10 15.5L4.5 22H1.5L9.5 13L1 2H8L12.5 8L18 2Z" />
    </svg>
  )
}
function RedditIcon({ className = "w-4 h-4", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M14.5 3.5a1 1 0 0 1 1 1v1.1a7.5 7.5 0 0 1 3.9 2.2l.9-.4a1.5 1.5 0 1 1 1 2.8c-.3 0-.6-.1-.8-.3l-1 .5c.3.7.5 1.5.5 2.3 0 3.7-3.8 6.8-8.5 6.8S3.5 17.3 3.5 13.6c0-.8.2-1.6.5-2.3l-1-.5a1.5 1.5 0 1 1 0-2.5l1 .4A7.5 7.5 0 0 1 8 5.6V4.5a1 1 0 1 1 2 0v.8c.5-.1 1-.1 1.5-.1.5 0 1 0 1.5.1V4.5a1 1 0 0 1 1-1ZM9 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-3 5.2c1.4 0 2.6-.5 3.3-1.2a.75.75 0 0 0-1-1.1c-.5.5-1.3.8-2.3.8s-1.8-.3-2.3-.8a.75.75 0 1 0-1 1.1c.7.7 1.9 1.2 3.3 1.2Z"/>
    </svg>
  )
}

// ---------- severity styles ----------
const sev = {
  high:   { badge: "bg-red-100 text-red-700",     bar: "bg-red-500"    },
  medium: { badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
  low:    { badge: "bg-green-100 text-green-700",   bar: "bg-green-500"  },
}
const sevKey = (s) => (s || "low").toLowerCase()

// ---------- Status styles ----------
const statusStyles = {
  active: { 
    badge: "bg-green-100 text-green-700 border-green-300",
    icon: "🟢"
  },
  paused: { 
    badge: "bg-yellow-100 text-yellow-700 border-yellow-300",
    icon: "⏸️"
  },
  completed: { 
    badge: "bg-blue-100 text-blue-700 border-blue-300",
    icon: "✅"
  },
  archived: { 
    badge: "bg-gray-100 text-gray-700 border-gray-300",
    icon: "📦"
  }
}

// ---------- tiny sparkline ----------
function Sparkline({ data }) {
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- badges ----------
function SeverityBadge({ level }) {
  const k = sevKey(level)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sev[k].badge}`}>
      {k === "high" ? "High Severity" : k === "medium" ? "Medium Severity" : "Low Severity"}
    </span>
  )
}

// ---------- Status Badge ----------
function StatusBadge({ status }) {
  const statusKey = (status || "active").toLowerCase()
  const style = statusStyles[statusKey] || statusStyles.active
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${style.badge}`}>
      <span>{style.icon}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ---------- live alert with enhanced animations ----------
function LiveAlert({ item, isNew = false }) {
  const k = sevKey(item.severity)
  const Icon = item.platform === "reddit" ? RedditIcon : XIcon
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        // ✅ Pulse effect for new alerts
        ...(isNew && { 
          boxShadow: [
            "0px 0px 0px rgba(239, 68, 68, 0.0)",
            "0px 0px 20px rgba(239, 68, 68, 0.3)", 
            "0px 0px 0px rgba(239, 68, 68, 0.0)"
          ]
        })
      }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        // ✅ Staggered animation
        delay: isNew ? 0.1 : 0
      }}
      className={`rounded-xl border bg-white p-3 shadow-sm ${
        isNew ? 'border-red-300 bg-red-50' : 'border-gray-200'
      } ${k === 'high' ? 'border-l-4 border-l-red-500' : 
           k === 'medium' ? 'border-l-4 border-l-orange-500' : 
           'border-l-4 border-l-green-500'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {item.title}
            {/* ✅ Indian flag emoji for regional content */}
            {item.isIndian && <span>🇮🇳</span>}
            {/* ✅ Real-time indicator */}
            {isNew && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-red-500 rounded-full"
              />
            )}
          </div>
          <SeverityBadge level={item.severity} />
          {/* ✅ Location badge for Indian alerts */}
          {item.location && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
              📍 {item.location}
            </span>
          )}
        </div>
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <p className="mt-2 text-sm text-gray-700 line-clamp-3">{item.description}</p>
      
      {/* ✅ Engagement metrics for realistic feel */}
      {item.engagement && (
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span>🔄</span> {item.engagement.shares} shares
          </span>
          <span className="flex items-center gap-1">
            <span>👁️</span> {item.engagement.views} views
          </span>
        </div>
      )}
      
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" /> {item.timeAgo || "just now"}
      </div>
    </motion.div>
  )
}

// ---------- campaign card ----------
function CampaignCard({ c, onView }) {
  const k = sevKey(c.severity)
  const pct = Math.max(0, Math.min(100, c.activity || c.activityScore || 0))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.03,
        boxShadow: "0px 8px 20px rgba(0,0,0,0.08)",
      }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 12,
      }}
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SeverityBadge level={c.severity} />
            <StatusBadge status={c.status} />
          </div>
          <div className="text-lg font-semibold text-gray-900">{c.name || c.title}</div>
        </div>
        <button
          onClick={() => onView?.(c)}
          className="rounded-full border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          title="Open details"
        >
          •••
        </button>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-gray-700">{c.description}</p>

      {/* Campaign stats */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          <span className="font-medium">{c.stats?.totalTweets || 0}</span> posts collected
        </div>
        {c.completedAt && (
          <div className="text-xs text-gray-500">
            Completed: {new Date(c.completedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Activity bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Activity Level</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full ${sev[k].bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Lead / team info */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center text-xs font-semibold text-purple-700">
            {(c.team?.[0]?.user?.email || c.lead?.name || "A").charAt(0).toUpperCase()}
          </div>
          <div className="text-xs text-gray-600">
            <span className="font-medium">Lead:</span> {c.team?.[0]?.user?.email?.split('@')[0] || c.lead?.name || "Analyst"}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {c.platforms?.length > 0 && (
            <span className="capitalize">{c.platforms.join(', ')}</span>
          )}
        </div>
      </div>

      <div className="mt-2">
        <Sparkline data={c.spark || sampleSpark()} />
      </div>

      <button
        onClick={() => onView?.(c)}
        className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-[0.98] ${
          c.status === 'completed' 
            ? 'bg-blue-500 hover:bg-blue-600' 
            : c.status === 'paused'
            ? 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-purple-500 hover:bg-purple-600'
        }`}
      >
        {c.status === 'completed' ? 'View Results' : 'View Details'}
      </button>
    </motion.div>
  );
}

// ---------- sample spark data ----------
const sampleSpark = () =>
  Array.from({ length: 12 }, () => ({ v: 20 + Math.round(Math.random() * 60) }))

// ---------- data transformation helpers ----------
function transformAlert(alert) {
  return {
    id: alert._id,
    title: alert.title,
    description: alert.description,
    severity: alert.severity,
    platform: alert.metadata?.platform || "x",
    timeAgo: timeAgo(alert.createdAt),
  }
}

function transformCampaign(campaign) {
  return {
    id: campaign._id,
    title: campaign.name,
    name: campaign.name,
    status: campaign.status,
    severity: campaign.severity || calculateSeverity(campaign),
    description: campaign.description,
    activity: campaign.activityScore,
    activityScore: campaign.activityScore,
    reposts: campaign.stats?.totalTweets || 0,
    stats: campaign.stats,
    team: campaign.team,
    lead: campaign.team?.[0]?.user || { name: "Analyst" },
    spark: campaign.sparkData || generateSparkFromStats(campaign.stats),
    updatedAgo: timeAgo(campaign.updatedAt),
    completedAt: campaign.completedAt,
    completedReason: campaign.completedReason,
    platforms: campaign.platforms || ['x'],
  }
}

function calculateSeverity(campaign) {
  if (!campaign.stats) return "low";
  
  const { fakePosts = 0, totalTweets = 0, alertsGenerated = 0 } = campaign.stats;
  const fakeRatio = totalTweets > 0 ? fakePosts / totalTweets : 0;
  
  if (alertsGenerated > 10 || fakeRatio > 0.7) return "high";
  if (alertsGenerated > 5 || fakeRatio > 0.4) return "medium";
  return "low";
}

function generateSparkFromStats(stats) {
  if (!stats) return sampleSpark();
  
  // Generate sparkline based on activity pattern
  const base = stats.totalTweets || 50;
  return Array.from({ length: 12 }, (_, i) => ({
    v: Math.max(10, base + Math.sin(i * 0.5) * 20 + Math.random() * 15)
  }));
}

// ✅ Dynamic Indian-themed alerts pool
const INDIAN_ALERTS_POOL = [
  {
    id: "alert_001",
    title: "EVM Tampering Claims Viral in Uttar Pradesh",
    description: "Coordinated disinformation campaign claiming electronic voting machines were hacked in 47 constituencies across UP. Videos showing 'proof' spreading rapidly on WhatsApp groups.",
    severity: "high",
    platform: "x",
    isIndian: true,
    location: "Uttar Pradesh",
    engagement: { shares: 2847, views: 89420 },
    timestamp: Date.now() - 5 * 60 * 1000
  },
  {
    id: "alert_002", 
    title: "Fake Exit Poll Data Circulating",
    description: "Fabricated exit poll results showing dramatic swings in Maharashtra constituencies. Created to influence last-minute voter sentiment in ongoing elections.",
    severity: "medium",
    platform: "x",
    isIndian: true,
    location: "Maharashtra",
    engagement: { shares: 1203, views: 34560 },
    timestamp: Date.now() - 12 * 60 * 1000
  },
  {
    id: "alert_003",
    title: "Communal Violence Misinformation in West Bengal",
    description: "Doctored images from 2019 riots being shared as 'current' violence to inflame tensions ahead of by-elections. 156 Twitter accounts amplifying false narrative.",
    severity: "high", 
    platform: "x",
    isIndian: true,
    location: "West Bengal",
    engagement: { shares: 3421, views: 127840 },
    timestamp: Date.now() - 18 * 60 * 1000
  },
  {
    id: "alert_004",
    title: "Booth Capturing Videos Go Viral",
    description: "Old footage from 2017 Kerala elections being circulated as evidence of current booth capturing in Rajasthan. 23 WhatsApp groups identified spreading content.",
    severity: "medium",
    platform: "reddit",
    isIndian: true, 
    location: "Rajasthan",
    engagement: { shares: 867, views: 23140 },
    timestamp: Date.now() - 25 * 60 * 1000
  },
  {
    id: "alert_005",
    title: "Voter ID Fraud Instructions Spreading", 
    description: "Step-by-step guides on creating fake voter IDs circulating in Telegram channels. Election Commission coordination protocols compromised in 12 districts.",
    severity: "high",
    platform: "x",
    isIndian: true,
    location: "Bihar", 
    engagement: { shares: 934, views: 45670 },
    timestamp: Date.now() - 33 * 60 * 1000
  },
  {
    id: "alert_006",
    title: "AI-Generated Politician Speeches Detected",
    description: "Deep fake videos of opposition leaders making inflammatory statements detected across social platforms. Professional production quality suggests state-level actor involvement.",
    severity: "high",
    platform: "x",
    isIndian: true,
    location: "Tamil Nadu",
    engagement: { shares: 1876, views: 67230 },
    timestamp: Date.now() - 7 * 60 * 1000
  },
  {
    id: "alert_007",
    title: "Minority Community Voter Suppression",
    description: "False information about changed polling dates targeting Muslim-majority areas in Old City Hyderabad. SMS campaigns coordinated to cause confusion on election day.",
    severity: "medium",
    platform: "reddit",
    isIndian: true,
    location: "Telangana",
    engagement: { shares: 567, views: 19850 },
    timestamp: Date.now() - 41 * 60 * 1000
  }
];

// ---------- page ----------
export default function DashboardPage() {
  const navigate = useNavigate()

  // Header search & prompt-to-assistant
  const [globalSearch, setGlobalSearch] = useState("")
  const [prompt, setPrompt] = useState("")
  const askAI = useCallback(() => {
    const q = prompt.trim()
    if (q) navigate(`/assistant?q=${encodeURIComponent(q)}`)
    else navigate("/assistant")
  }, [prompt, navigate])

  // Data states
  const [alerts, setAlerts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  
  // ✅ Live alerts animation state
  const [newAlertIds, setNewAlertIds] = useState(new Set())

  // ✅ Dynamic alerts system - cycles through Indian alerts every 8-15 seconds
  useEffect(() => {
    // Start with initial alerts
    const initialAlerts = INDIAN_ALERTS_POOL.slice(0, 3).map(alert => ({
      ...alert,
      timeAgo: timeAgo(alert.timestamp)
    }));
    setAlerts(initialAlerts);
    
    // Set up dynamic alert rotation
    const alertInterval = setInterval(() => {
      const randomAlert = INDIAN_ALERTS_POOL[Math.floor(Math.random() * INDIAN_ALERTS_POOL.length)];
      const newAlert = {
        ...randomAlert,
        id: `${randomAlert.id}_${Date.now()}`, // Unique ID for each appearance
        timeAgo: "just now",
        timestamp: Date.now()
      };
      
      setAlerts(current => {
        // Mark as new for animation
        setNewAlertIds(prev => new Set([...prev, newAlert.id]));
        
        // Remove new status after animation
        setTimeout(() => {
          setNewAlertIds(prev => {
            const next = new Set(prev);
            next.delete(newAlert.id);
            return next;
          });
        }, 3000);
        
        // Add new alert and keep only last 5
        return [newAlert, ...current].slice(0, 5);
      });
      
      console.log(`🚨 New live alert: ${newAlert.title}`);
    }, Math.random() * 7000 + 8000); // 8-15 seconds randomly
    
    return () => clearInterval(alertInterval);
  }, []);

  // ✅ Update time stamps for alerts every minute
  useEffect(() => {
    const timeUpdateInterval = setInterval(() => {
      setAlerts(current => 
        current.map(alert => ({
          ...alert,
          timeAgo: timeAgo(alert.timestamp)
        }))
      );
    }, 60000); // Update every minute
    
    return () => clearInterval(timeUpdateInterval);
  }, []);

  // Fetch initial data using axios
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      console.log('🔄 Starting dashboard data fetch...');
      
      try {
        console.log('🌐 API Base URL:', API_BASE_URL);
        console.log('🔑 Auth Token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
        
        // ✅ Fetch campaigns first - this is the main issue
        console.log('📊 Fetching campaigns...');
        const campaignsRes = await api.get('/campaigns', { 
          params: { 
            limit: 20
            // Remove status filter for now to get all campaigns
          } 
        });

        console.log('📊 Campaigns API Response:', {
          success: campaignsRes.success,
          dataExists: !!campaignsRes.data,
          campaignsCount: campaignsRes.data?.campaigns?.length || 0,
          campaigns: campaignsRes.data?.campaigns?.map(c => ({ name: c.name, status: c.status })) || []
        });

        // ✅ Handle campaigns data properly
        if (campaignsRes && campaignsRes.success && campaignsRes.data?.campaigns) {
          const transformedCampaigns = campaignsRes.data.campaigns.map(transformCampaign);
          setCampaigns(transformedCampaigns);
          console.log('✅ Transformed campaigns:', transformedCampaigns.map(c => `${c.name} (${c.status})`));
        } else {
          console.warn('⚠️ No campaigns data, using demo data');
          setCampaigns(demoCampaigns());
        }

        // ✅ Try to fetch real alerts but don't override the live demo alerts
        try {
          console.log('🚨 Fetching real alerts...');
          const alertsRes = await api.get('/alerts', { params: { status: 'open', limit: 10 } });
          if (alertsRes && alertsRes.success && alertsRes.data?.alerts && alertsRes.data.alerts.length > 0) {
            const transformedAlerts = alertsRes.data.alerts.map(transformAlert);
            // ✅ Mix real alerts with live demo alerts
            setAlerts(current => {
              const mixed = [...transformedAlerts, ...current].slice(0, 6);
              return mixed;
            });
            console.log('✅ Mixed real and demo alerts:', transformedAlerts.length);
          }
        } catch (alertError) {
          console.warn('⚠️ Real alerts API failed, continuing with demo alerts:', alertError.message);
        }

        // ✅ Fetch dashboard overview separately
        try {
          console.log('📈 Fetching dashboard overview...');
          const dashboardRes = await api.get('/dashboard/overview');
          if (dashboardRes && dashboardRes.success && dashboardRes.data) {
            setDashboardData(dashboardRes.data);
            console.log('✅ Dashboard data loaded');
          }
        } catch (dashError) {
          console.warn('⚠️ Dashboard API failed:', dashError.message);
        }

      } catch (error) {
        console.error('❌ Main API call failed:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        
        // ✅ Fallback to demo data
        console.log('📋 Loading demo data as fallback');
        setCampaigns(demoCampaigns());
        // Keep the live alerts running even if API fails
      } finally {
        setLoading(false);
        console.log('✅ Dashboard fetch completed');
      }
    };

    fetchDashboardData();
  }, []);

  // Socket wiring with real-time updates
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      auth: {
        token: localStorage.getItem('authToken')
      }
    })

    const onConnectError = (err) => console.error("Socket connection error:", err)
    
    const onLiveAlert = (payload) => {
      const transformedAlert = transformAlert(payload);
      setAlerts((curr) => [transformedAlert, ...curr].slice(0, 30));
    }
    
    const onCampaignUpdate = (payload) => {
      setCampaigns((curr) => {
        const idx = curr.findIndex((x) => x.id === payload.campaignId || payload._id)
        const incoming = transformCampaign(payload)
        if (idx >= 0) {
          const clone = curr.slice()
          clone[idx] = { ...clone[idx], ...incoming }
          return clone
        }
        return [incoming, ...curr]
      })
    }

    const onCampaignCompleted = (payload) => {
      console.log('🎯 Campaign completed:', payload);
      setCampaigns((curr) => {
        const idx = curr.findIndex((x) => x.id === payload.campaignId)
        if (idx >= 0) {
          const clone = curr.slice()
          clone[idx] = { 
            ...clone[idx], 
            status: 'completed',
            completedAt: payload.completedAt,
            completedReason: payload.reason,
            stats: { ...clone[idx].stats, totalTweets: payload.totalTweets }
          }
          return clone
        }
        return curr
      })
    }

    const onDashboardUpdate = (payload) => {
      if (payload.data) {
        setDashboardData(prev => ({ ...prev, ...payload.data }));
      }
    }

    // Socket event listeners
    socket.on("connect_error", onConnectError)
    socket.on("live_alerts_update", (data) => {
      if (data.alerts) {
        data.alerts.forEach(onLiveAlert);
      }
    })
    socket.on("campaign_update", onCampaignUpdate)
    socket.on("campaign_completed", onCampaignCompleted) // ✅ Listen for campaign completions
    socket.on("dashboard_update", onDashboardUpdate)

    // Subscribe to dashboard updates
    socket.emit('subscribe_dashboard', {
      preferences: {
        alerts: true,
        campaigns: true,
        system: true
      }
    });

    return () => {
      socket.off("connect_error", onConnectError)
      socket.off("live_alerts_update")
      socket.off("campaign_update", onCampaignUpdate)
      socket.off("campaign_completed", onCampaignCompleted)
      socket.off("dashboard_update", onDashboardUpdate)
      socket.disconnect()
    }
  }, [])

  // Global search functionality using axios
  const handleGlobalSearch = useCallback(async () => {
    if (!globalSearch.trim()) return;
    
    try {
      const response = await api.post('/search/universal', {
        query: globalSearch,
        contentTypes: ['campaigns', 'alerts', 'evidence'],
        limit: 10
      });
      
      if (response.success) {
        // Navigate to search results page or handle results
        navigate(`/search?q=${encodeURIComponent(globalSearch)}`);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [globalSearch, navigate]);

  // Suggested topics
  const suggestions = useMemo(
    () => ["Campaign Analysis", "Threat Intelligence", "Narrative Tracking", "Evidence Collection"],
    []
  )

  const viewCampaign = useCallback((c) => navigate(`/campaigns/${c.id}`), [navigate])

  // ✅ Calculate campaign stats by status
  const campaignStats = useMemo(() => {
    const stats = { active: 0, paused: 0, completed: 0, total: campaigns.length }
    campaigns.forEach(campaign => {
      if (stats.hasOwnProperty(campaign.status)) {
        stats[campaign.status]++
      }
    })
    return stats
  }, [campaigns])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className=" min-h-screen bg-slate-100">
      {/* TOP BAR / HERO */}
      <header className="flex items-center justify-between gap-4 bg-white shadow-md px-5 py-3 rounded-b-2xl">
  {/* Logo on the left */}
  <div className="whitespace-nowrap text-lg font-bold text-purple-700">
    Project Sentinel
  </div>
  {/* Centered search bar + search icon button */}
  <div className="flex flex-1 justify-center items-center gap-3">
    <div className="relative w-full max-w-xl">
      <input
        value={globalSearch}
        onChange={(e) => setGlobalSearch(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleGlobalSearch()}
        placeholder="Search campaigns, alerts, or evidence…"
        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 bg-gray-50 shadow-sm outline-none focus:ring-4 focus:ring-purple-200 transition"
      />
      {/* Search icon inside input */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
    {/* Purple search icon button (replacing Ask AI) */}
    <button
      onClick={handleGlobalSearch}
      className="rounded-full bg-purple-500 p-1.5 shadow-sm hover:bg-purple-600 transition"
      aria-label="Search"
    >
      <svg
        className="h-4 w-4 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </button>
  </div>
  {/* Account button on the right */}
  <div className="flex items-center gap-2 ml-6">
    <AccountButton />
  </div>
</header>

    {/* BODY GRID */}
<main className="grid h-[calc(100vh-64px)] min-h-0 grid-cols-[240px_1fr_320px] gap-4 p-4">
  
  {/* SIDEBAR */}
  <Sidebar />

  {/* MAIN CONTENT */}
<section className="min-h-0 overflow-auto space-y-6">
  
  {/* SentinelAI box */}
  <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-6 mb-6 flex flex-col gap-4">
  <h2 className="flex items-center gap-1 text-2xl font-bold text-gray-900">
  <img
    src={ShieldLogo}
    alt="Sentinel Logo"
    className="h-8 w-8 object-contain"
  />
<span>SentinelAI</span>
</h2>
  
  <div className="relative flex gap-3">
    <input
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && askAI()}
      placeholder="e.g., Analyze recent disinformation trends in Eastern Europe…" 
      className="flex-1 pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-gray-50 shadow-sm outline-none focus:ring-4 focus:ring-purple-200 text-base transition"
    />
    {/* Search icon (SVG) */}
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <button
      onClick={askAI}
      className="rounded-xl bg-purple-500 px-6 py-3 font-semibold text-white hover:bg-purple-600 active:scale-[0.98] text-base transition"
    >
      Ask
    </button>
  </div>
  <div className="flex flex-wrap gap-2 mt-2">
    {suggestions.map((s) => (
      <button
        key={s}
        onClick={() => navigate(`/assistant?q=${encodeURIComponent(s)}`)}
        className="rounded-full border px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
      >
        {s}
      </button>
    ))}
  </div>
</div>

  {/* All Campaigns */}
  <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-1 text-xl font-semibold text-gray-900">
        <Archive className="h-5 w-5 text-gray-600 fill-green-500" /> 
        <span>Campaign Overview</span>
        <div className="flex items-center gap-3 ml-4 text-sm">
          <span className="text-green-600 font-medium">
            🟢 {campaignStats.active} Active
          </span>
          <span className="text-yellow-600 font-medium">
            ⏸️ {campaignStats.paused} Paused
          </span>
          <span className="text-blue-600 font-medium">
            ✅ {campaignStats.completed} Completed
          </span>
          <span className="text-gray-500">
            ({campaignStats.total} Total)
          </span>
        </div>
        </h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/campaigns")}
          className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          View All
        </button>
        <button
          onClick={() => navigate("/campaigns/new")}
          className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
        >
          New Campaign
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {campaigns.map((c) => (
          <CampaignCard key={c.id} c={c} onView={viewCampaign} />
        ))}
      </AnimatePresence>
    </div>

    {campaigns.length === 0 && (
      <div className="text-center py-8 text-gray-500">
        <div className="text-lg mb-2">No campaigns found</div>
        <div className="text-sm">Create your first campaign to start monitoring</div>
      </div>
    )}
  </div>
</section>



  {/* RIGHT COLUMN — LIVE ALERTS with enhanced header */}
<aside className="flex min-h-0 flex-col rounded-2xl bg-purple-50 shadow-lg border border-gray-200 p-4">
  <div className="flex items-center gap-2 text-base font-semibold text-gray-900 pb-2 mb-3">
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity,
        repeatDelay: 3
      }}
    >
      <Bell className="h-5 w-5 text-gray-600 fill-red-500" />
    </motion.div>
    <span>Live Alerts</span>
    <motion.span 
      className="text-sm text-gray-500 ml-2"
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      ({alerts.length}) 🇮🇳 LIVE
    </motion.span>
  </div>

  <div className="flex-1 min-h-0 space-y-3 overflow-auto pr-1">
    <AnimatePresence initial={false}>
      {alerts.map((a) => (
        <LiveAlert 
          key={a.id} 
          item={a} 
          isNew={newAlertIds.has(a.id)}
        />
      ))}
    </AnimatePresence>
  </div>

  <button
    onClick={() => navigate("/alerts")}
    className="mt-4 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
  >
    View All Alerts
  </button>
</aside>
</main>
    </div>
    )
}

// ---------- helpers ----------
function timeAgo(ts) {
  if (!ts) return "just now"
  const diff = Math.max(0, Date.now() - new Date(ts).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`
  const h = Math.floor(m / 60)
  return `${h} hour${h > 1 ? "s" : ""} ago`
}

function formatAlert(a) {
  return {
    id: a.id || crypto.randomUUID(),
    title: a.title || "New Alert",
    description: a.description || "Incoming event detected by the monitoring pipeline.",
    severity: (a.severity || "low").toLowerCase(),
    platform: (a.platform || "x").toLowerCase(),
    timeAgo: timeAgo(a.timestamp),
  }
}

function normalizeCampaign(c) {
  return {
    id: c.id || crypto.randomUUID(),
    title: c.title || "Untitled Campaign",
    severity: (c.severity || "low").toLowerCase(),
    description: c.description || "No description provided.",
    activity: typeof c.activity === "number" ? c.activity : Math.round(Math.random() * 100),
    reposts: c.reposts ?? Math.floor(Math.random() * 20),
    updatedAgo: timeAgo(c.updatedAt || Date.now()),
    lead: c.lead || { name: "Analyst" },
    spark: c.spark || sampleSpark(),
  }
}

function demoAlerts() {
  const base = [
    {
      title: "Coordinated Bot Activity",
      description: "Sudden spike in bot accounts spreading identical messaging.",
      severity: "high",
      platform: "x",
      timestamp: Date.now() - 15 * 60 * 1000,
    },
    {
      title: "New Narrative Detected",
      description: "Emerging narrative linking health topics to prior network.",
      severity: "medium",
      platform: "reddit",
      timestamp: Date.now() - 42 * 60 * 1000,
    },
    {
      title: "Evidence Match Found",
      description: "Assets matched to previously identified operation.",
      severity: "high",
      platform: "x",
      timestamp: Date.now() - 60 * 60 * 1000,
    },
  ]
  return base.map(formatAlert)
}

function demoCampaigns() {
  const rows = [
    { id: "c1", title: "Operation Shadow Whisper", severity: "high",   description: "Coordinated disinformation targeting election integrity.",  activity: 78, lead: { name: "Alex Morgan" },   reposts: 12 },
    { id: "c2", title: "Cerberus Network",         severity: "medium", description: "Multi-platform influence operation around health narratives.", activity: 52, lead: { name: "Sarah Kim" },     reposts: 8  },
    { id: "c3", title: "Phoenix Rising",           severity: "medium", description: "Network spreading misinformation in financial markets.",       activity: 45, lead: { name: "Marcus Johnson" }, reposts: 5  },
    { id: "c4", title: "Midnight Vanguard",        severity: "high",   description: "State-sponsored campaign targeting critical infrastructure.", activity: 83, lead: { name: "Emma Chen" },     reposts: 15 },
    { id: "c5", title: "Echo Chamber",             severity: "low",    description: "Hashtag campaign spreading polarization through coordination.", activity: 28, lead: { name: "David Park" },     reposts: 3  },
    { id: "c6", title: "Truth Distortion",         severity: "medium", description: "Network of fake news sites in multiple languages.",           activity: 61, lead: { name: "Priya Singh" },    reposts: 9  },
  ]
  return rows.map(normalizeCampaign)
}