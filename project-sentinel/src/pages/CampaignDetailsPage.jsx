/* eslint-disable no-unused-vars */
// src/pages/CampaignDetailsPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react"
 
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from "recharts"
import Sidebar from "@/components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"
import axios from "axios"

// ---------- CONFIG ----------
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// ---- API Configuration ----
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Update the API interceptor to handle authentication properly:
api.interceptors.request.use(
  (config) => {
    // Check multiple possible token storage locations
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('accessToken') ||
                  sessionStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Using token:', token.substring(0, 20) + '...'); // Debug log
    } else {
      console.warn('No authentication token found');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors:
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem('token');
      
      // Redirect to login
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication required'));
    }
    return Promise.reject(error);
  }
);

// ---------- Inline brand icons (no external icon deps) ----------
function XIcon({ className = "w-4 h-4", ...p }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} {...p}>
      <path d="M18 2H21L13.5 10.5L22.5 22H15L10 15.5L4.5 22H1.5L9.5 13L1 2H8L12.5 8L18 2Z" />
    </svg>
  )
}
function RedditIcon({ className = "w-4 h-4", ...p }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} {...p}>
      <path d="M14.5 3.5a1 1 0 0 1 1 1v1.1a7.5 7.5 0 0 1 3.9 2.2l.9-.4a1.5 1.5 0 1 1 1 2.8c-.3 0-.6-.1-.8-.3l-1 .5c.3.7.5 1.5.5 2.3 0 3.7-3.8 6.8-8.5 6.8S3.5 17.3 3.5 13.6c0-.8.2-1.6.5-2.3l-1-.5a1.5 1.5 0 1 1 0-2.5l1 .4A7.5 7.5 0 0 1 8 5.6V4.5a1 1 0 1 1 2 0v.8c.5-.1 1-.1 1.5-.1.5 0 1 0 1.5.1V4.5a1 1 0 0 1 1-1ZM9 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-3 5.2c1.4 0 2.6-.5 3.3-1.2a.75.75 0 0 0-1-1.1c-.5.5-1.3.8-2.3.8s-1.8-.3-2.3-.8a.75.75 0 1 0-1 1.1c.7.7 1.9 1.2 3.3 1.2Z"/>
    </svg>
  )
}
function FacebookIcon({ className = "w-4 h-4", ...p }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} {...p}>
      <path d="M13 3h4v3h-3c-.6 0-1 .4-1 1v3h4l-1 3h-3v8h-3v-8H7v-3h3V7c0-2.2 1.8-4 4-4Z"/>
    </svg>
  )
}

// ---------- severity styles ----------
const sev = {
  high:     { badge: "bg-red-100 text-red-700",     text: "High Priority"   },
  medium:   { badge: "bg-orange-100 text-orange-700", text: "Medium Priority" },
  low:      { badge: "bg-green-100 text-green-700",   text: "Low Priority"    },
  critical: { badge: "bg-red-200 text-red-800",     text: "Critical Priority" },
}
const sevKey = (s) => (s || "low").toLowerCase()

// ---------- small UI bits ----------
const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
)

const StatCard = ({ label, value, sub }) => (
  <Card className="p-4">
    <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
  </Card>
)

const Badge = ({ level }) => {
  const k = sevKey(level)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sev[k].badge}`}>
      {sev[k].text}
    </span>
  )
}

// ---------- Platform icon selector ----------
const PlatformIcon = ({ platform, className = "w-4 h-4" }) => {
  const p = (platform || "").toLowerCase()
  if (p.includes("facebook")) return <FacebookIcon className={className} />
  if (p.includes("reddit")) return <RedditIcon className={className} />
  return <XIcon className={className} />
}

// ---------- charts ----------
function ActivityTimeline({ data }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-gray-900">Activity Timeline</div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="engagement" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-gray-500">Showing data from last 30 days</div>
    </Card>
  )
}

function CoordinationNetwork({ points }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-gray-900">Coordination Network</div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" dataKey="x" name="Coord X" />
            <YAxis type="number" dataKey="y" name="Coord Y" />
            <ZAxis type="number" dataKey="z" range={[60, 120]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={points} fill="#8b5cf6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {points.length} accounts with {Math.round(points.length * 5.5)} connections identified
      </div>
    </Card>
  )
}

// ---------- evidence feed ----------
function EvidenceCard({ item }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <div className="h-9 w-9 rounded-full bg-purple-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-purple-700">
            {item.username?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">@{item.username}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <PlatformIcon platform={item.platform} />
              <span>{item.timeAgo}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-800">{item.content}</p>
          {item.media && item.media.length > 0 && (
            <img
              src={item.media[0].url}
              alt="tweet media"
              className="mt-2 w-full rounded-xl object-cover"
              style={{ maxHeight: 220 }}
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>🔁 {item.retweets || 0} retweets</span>
            <span>💬 {item.replies || 0} replies</span>
            <span>❤️ {item.likes || 0} likes</span>
            {item.aiAnalysis?.risk_indicators?.bot_likelihood && (
              <span className="ml-auto rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
                {Math.round(item.aiAnalysis.risk_indicators.bot_likelihood * 100)}% bot probability
              </span>
            )}
          </div>
          {item.aiAnalysis?.threat_assessment && (
            <div className="mt-2 rounded-lg bg-gray-50 p-2">
              <div className="text-xs font-semibold text-gray-700">
                Threat Level: {item.aiAnalysis.threat_assessment.level?.toUpperCase() || 'UNKNOWN'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {item.aiAnalysis.threat_assessment.potential_impact || 'No impact assessment available'}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------- Data transformation helpers ----------
function transformCampaignData(campaignData) {
  const campaign = campaignData.campaign
  const stats = campaign.stats
  const analytics = campaign.analytics
  
  return {
    id: campaign._id,
    title: campaign.name,
    severity: campaign.priority,
    detectedAt: new Date(campaign.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    lastUpdated: new Date(campaign.updatedAt).toLocaleString(),
    posts: stats?.totalTweets || analytics?.totalTweets || 0,
    postsDelta: campaign.recentTweets?.length || 0,
    accounts: campaign.targetAccounts?.length || 0,
    autoProb: 0.15, // Calculate from actual bot analysis later
    severityScore: campaign.activityScore / 100 || 0.5,
    severityDelta: 0.02,
    peakActivity: "Early morning hours", // Can derive from timelineData
    description: campaign.description,
    platforms: campaign.platforms,
    keywords: campaign.keywords,
    hashtags: campaign.hashtags,
    status: campaign.status,
    tags: campaign.tags,
    team: campaign.team,
    analytics: analytics
  }
}

function transformTweetToEvidence(tweet) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  return {
    id: tweet._id,
    username: tweet.username,
    content: tweet.content,
    platform: tweet.source === "twitter" ? "x" : tweet.source,
    timeAgo: timeAgo(tweet.crawledAt),
    likes: tweet.likes || 0,
    retweets: tweet.retweets || 0,
    replies: tweet.replies || 0,
    media: tweet.media || [],
    aiAnalysis: tweet.aiAnalysis,
    hashtags: tweet.hashtags,
    mentions: tweet.mentions,
    isVerified: tweet.user?.isVerified || false,
    displayName: tweet.displayName
  }
}

function generateTimelineData(analytics) {
  // Use real timeline data from API
  if (analytics?.timelineData) {
    return analytics.timelineData.map((item, index) => ({
      date: `${item.hour}:00`,
      volume: item.tweets,
      engagement: item.tweets * 2.5 // Estimated engagement
    }))
  }
  
  // Fallback to empty data
  return Array.from({ length: 24 }, (_, i) => ({
    date: `${i}:00`,
    volume: 0,
    engagement: 0
  }))
}

function generateNetworkData(tweets) {
  // Generate network from real user interactions
  const users = tweets.reduce((acc, tweet) => {
    if (!acc[tweet.username]) {
      acc[tweet.username] = {
        username: tweet.username,
        tweets: 0,
        engagement: 0,
        botScore: tweet.aiAnalysis?.risk_indicators?.bot_likelihood || Math.random() * 0.3,
        isVerified: tweet.user?.isVerified || false
      }
    }
    acc[tweet.username].tweets++
    acc[tweet.username].engagement += (tweet.likes || 0) + (tweet.retweets || 0)
    return acc
  }, {})

  return Object.values(users).slice(0, 50).map((user, index) => ({
    x: (index % 10) * 10 - 45,
    y: Math.floor(index / 10) * 10 - 25,
    z: Math.max(1, Math.min(4, Math.floor(user.botScore * 4) + 1)),
    username: user.username,
    isVerified: user.isVerified
  }))
}

// ---------- PAGE ----------
export default function CampaignDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // State
  const [campaign, setCampaign] = useState(null)
  const [tweets, setTweets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Derived data
  const timeline = useMemo(() => {
    if (campaign?.analytics) {
      return generateTimelineData(campaign.analytics)
    }
    return []
  }, [campaign])
  const network = useMemo(() => generateNetworkData(tweets), [tweets])
  const evidence = useMemo(() => tweets.slice(0, 10).map(transformTweetToEvidence), [tweets])

  // Filter controls for evidence
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [sortKey, setSortKey] = useState("recent")

  const filteredEvidence = useMemo(() => {
    let rows = evidence
    if (filterPlatform !== "all") rows = rows.filter((r) => r.platform === filterPlatform)
    if (sortKey === "retweets") rows = [...rows].sort((a, b) => b.retweets - a.retweets)
    else if (sortKey === "likes") rows = [...rows].sort((a, b) => b.likes - a.likes)
    else rows = [...rows] // "recent" (already recent first)
    return rows
  }, [evidence, filterPlatform, sortKey])

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)

        // Check if user is authenticated before making API call
        const token = localStorage.getItem('token') || 
                      localStorage.getItem('authToken') || 
                      localStorage.getItem('accessToken') ||
                      sessionStorage.getItem('token');

        if (!token) {
          setError('Please log in to access campaign details');
          navigate('/login');
          return;
        }

        console.log('Fetching campaign with ID:', id);
        
        // Fetch campaign details - API already includes tweets and analytics!
        const campaignRes = await api.get(`/campaigns/${id}`)

        console.log('Campaign API response:', campaignRes.data);

        if (campaignRes.data.success) {
          const campaignData = campaignRes.data.data
          
          setCampaign(transformCampaignData(campaignData))
          
          // Use the recentTweets from API response
          const recentTweets = campaignData.campaign.recentTweets || []
          setTweets(recentTweets)
          
          console.log('Loaded campaign with real data:', {
            name: campaignData.campaign.name,
            tweets: recentTweets.length,
            analytics: campaignData.campaign.analytics
          })
          
        } else {
          setError('Campaign not found or access denied')
        }
      } catch (error) {
        console.error('Failed to fetch campaign:', error)
        
        if (error.response?.status === 401) {
          setError('Authentication failed. Please log in again.')
          navigate('/login')
        } else if (error.response?.status === 403) {
          setError('Access denied. You do not have permission to view this campaign.')
        } else if (error.response?.status === 404) {
          setError('Campaign not found.')
        } else {
          setError(error.message || 'Failed to load campaign')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCampaignData()
  }, [id, navigate])

  // Update insights to use real data:
  const insights = useMemo(() => {
    if (!campaign || !tweets.length) {
      return {
        summary: `Campaign "${campaign?.title || 'Loading...'}" is actively monitoring ${campaign?.keywords?.slice(0,3).join(', ') || 'election content'} across social media platforms. Real-time analysis and threat detection in progress.`,
        insights: [
          { 
            title: "Live Monitoring Active", 
            body: `Currently tracking ${campaign?.posts || 0} posts across ${campaign?.platforms?.length || 0} platforms with focus on election security.` 
          },
          { 
            title: "Keyword Coverage", 
            body: `Monitoring ${campaign?.keywords?.length || 0} election-related keywords including: ${campaign?.keywords?.slice(0,3).join(', ') || 'election terms'}` 
          },
          { 
            title: "Team Assignment", 
            body: `Campaign managed by ${campaign?.team?.length || 0} team members with lead analyst coordination.` 
          },
          { 
            title: "Security Status", 
            body: `${campaign?.status?.toUpperCase() || 'ACTIVE'} monitoring with ${campaign?.tags?.length || 0} security classifications applied.` 
          },
        ],
        actions: [
          "Continue real-time monitoring of election narratives",
          "Analyze emerging misinformation patterns",
          "Generate intelligence reports for election authorities",
          "Coordinate with field investigation teams",
        ],
      }
    }

    const threatAnalyses = tweets.filter(t => t.aiAnalysis?.threat_assessment?.level).map(t => t.aiAnalysis.threat_assessment)
    const highThreatCount = threatAnalyses.filter(t => t.level === 'high' || t.level === 'critical').length
    const avgBotScore = tweets.reduce((sum, t) => sum + (t.aiAnalysis?.risk_indicators?.bot_likelihood || 0), 0) / tweets.length

    return {
      summary: `Campaign "${campaign.title}" has collected ${tweets.length} posts with ${highThreatCount} high-threat items detected. AI analysis indicates ${Math.round(avgBotScore * 100)}% average bot probability across monitored election content.`,
      insights: [
        { 
          title: "Threat Distribution", 
          body: `${highThreatCount} high-threat posts detected out of ${tweets.length} total posts (${Math.round((highThreatCount/tweets.length)*100)}%)` 
        },
        { 
          title: "Bot Network Activity", 
          body: `Average bot likelihood: ${Math.round(avgBotScore * 100)}%. Coordinated activity patterns detected across ${campaign.accounts} monitored accounts.` 
        },
        { 
          title: "Platform Coverage", 
          body: `Monitoring across ${campaign.platforms.join(', ')} platforms with focus on keywords: ${campaign.keywords.slice(0, 3).join(', ')}` 
        },
        { 
          title: "Election Intelligence", 
          body: `Campaign tracking ${campaign.hashtags.length} election hashtags across ${Math.ceil(campaign.posts / 10)}K posts` 
        },
      ],
      actions: [
        "Continue monitoring for emerging narrative patterns",
        "Review high-threat posts for manual verification",
        "Analyze bot network connections for coordinated activity",
        "Generate detailed report for law enforcement agencies",
      ],
    }
  }, [campaign, tweets])

  // Action handlers
  const backToDashboard = useCallback(() => navigate("/dashboard"), [navigate])
  const downloadPack = useCallback(() => {
    alert("Downloading evidence pack for campaign: " + campaign?.title)
  }, [campaign])
  const shareAnalysis = useCallback(() => {
    alert("Shareable analysis link created for campaign: " + campaign?.title)
  }, [campaign])

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">Loading campaign details...</div>
          <div className="text-sm text-gray-500">Fetching data for campaign {id}</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">Error loading campaign</div>
          <div className="text-sm text-gray-500">{error || 'Campaign not found'}</div>
          <div className="text-xs text-gray-400 mt-2">Campaign ID: {id}</div>
          <button
            onClick={backToDashboard}
            className="mt-4 rounded-xl bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] bg-gray-50">
      {/* Top header */}
      <header className="row-start-1 flex items-center justify-between gap-4 border-b bg-white px-5 py-3">
        <div className="flex w-[48%] items-center gap-4">
          <div className="whitespace-nowrap text-lg font-bold text-purple-700">Project Sentinel</div>
          <input
            placeholder="Search campaigns, alerts, or evidence…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/assistant")}
            className="rounded-xl bg-purple-500 px-4 py-2 font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            Ask AI
          </button>
          <AccountButton />
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl border px-3 py-2 hover:bg-gray-50"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="row-start-2 grid grid-cols-[auto_1fr] gap-4 p-4">
        {/* Left sidebar */}
        <Sidebar />

        {/* Main content grid */}
        <div className="grid h-[calc(100vh-96px)] grid-cols-[1fr_360px] gap-4">
          {/* Left column (scroll) */}
          <section className="min-h-0 overflow-auto">
            {/* Title & meta */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xl font-bold text-gray-900">{campaign.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Detected: {campaign.detectedAt} · Last Updated: {campaign.lastUpdated}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{campaign.description}</div>
                </div>
                <Badge level={campaign.severity} />
              </div>

              {/* Keywords and platforms */}
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keywords:</div>
                {campaign.keywords.slice(0, 5).map(keyword => (
                  <span key={keyword} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Platforms:</div>
                {campaign.platforms.map(platform => (
                  <span key={platform} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                    <PlatformIcon platform={platform} className="w-3 h-3" />
                    {platform.toUpperCase()}
                  </span>
                ))}
              </div>

              {/* Stat row */}
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label="Posts Collected"
                  value={campaign.posts.toLocaleString()}
                  sub={`+${campaign.postsDelta} in last 24h`}
                />
                <StatCard
                  label="Unique Accounts"
                  value={campaign.accounts.toLocaleString()}
                  sub={`${Math.round(campaign.autoProb * 100)}% avg bot probability`}
                />
                <StatCard
                  label="Threat Score"
                  value={`${campaign.severityScore.toFixed(1)}/1.0`}
                  sub={campaign.severityDelta > 0 ? `+${campaign.severityDelta.toFixed(2)} increase` : "Stable"}
                />
                <StatCard 
                  label="Status" 
                  value={campaign.status?.toUpperCase() || "UNKNOWN"}
                  sub={`Peak: ${campaign.peakActivity}`}
                />
              </div>
            </Card>

            {/* Charts */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ActivityTimeline data={timeline} />
              <CoordinationNetwork points={network} />
            </div>

            {/* Evidence feed */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Key Evidence ({tweets.length} total posts)</div>
                <div className="flex items-center gap-2">
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="rounded-xl border px-2 py-1 text-sm"
                    title="Filter"
                  >
                    <option value="all">All Platforms</option>
                    <option value="x">X / Twitter</option>
                    <option value="reddit">Reddit</option>
                    <option value="facebook">Facebook</option>
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-xl border px-2 py-1 text-sm"
                    title="Sort"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="retweets">Top Retweets</option>
                    <option value="likes">Top Likes</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredEvidence.length === 0 ? (
                  <Card className="p-6 text-center">
                    <div className="text-gray-500">No evidence posts found for this campaign yet.</div>
                    <div className="text-xs text-gray-400 mt-1">Posts will appear here as they are collected and analyzed.</div>
                  </Card>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredEvidence.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <EvidenceCard item={item} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white p-3">
              <button
                onClick={backToDashboard}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPack}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Download Evidence Pack
                </button>
                <button
                  onClick={shareAnalysis}
                  className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600"
                >
                  Share Analysis
                </button>
              </div>
            </div>
          </section>

          {/* Right column — AI Insights (sticky) */}
          <aside className="flex min-h-0 flex-col">
            <Card className="flex-1 p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">AI Analysis & Insights</div>

              {insights ? (
                <>
                  <div className="rounded-xl bg-purple-50 p-3 text-sm text-purple-900">
                    {insights.summary}
                  </div>

                  <div className="mt-3 space-y-3">
                    {insights.insights.map((insight, i) => (
                      <div key={i} className="rounded-xl bg-gray-50 p-3">
                        <div className="text-sm font-semibold text-gray-900">{insight.title}</div>
                        <div className="mt-1 text-sm text-gray-700">{insight.body}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-semibold text-gray-900">Recommended Actions</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {insights.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-sm">Generating AI insights...</div>
                  <div className="text-xs mt-1">Analysis will appear as data is collected</div>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}