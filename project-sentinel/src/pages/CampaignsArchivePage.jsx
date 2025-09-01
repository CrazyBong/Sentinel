/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
// src/pages/CampaignsArchivePage.jsx
import { useMemo, useState, useCallback, useEffect } from "react"
 
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import Sidebar from "@/components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"
import axios from "axios"

// ---- API Configuration ----
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    // Try multiple token storage keys
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('accessToken') ||
                  sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Inline platform icons (avoid lucide brand exports)
const XIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" {...p}>
    <path d="M18 2H21L13.5 10.5L22.5 22H15L10 15.5L4.5 22H1.5L9.5 13L1 2H8L12.5 8L18 2Z" />
  </svg>
)
const FacebookIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" {...p}>
    <path d="M13 3h4v3h-3c-.6 0-1 .4-1 1v3h4l-1 3h-3v8h-3v-8H7v-3h3V7c0-2.2 1.8-4 4-4Z"/>
  </svg>
)
const TelegramIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" {...p}>
    <path d="M21.9 4.3c.3-.9-.6-1.7-1.5-1.4L2.2 9.7c-1 .3-1 1.7.1 2l4.7 1.3 1.8 5.9c.3.9 1.5 1.1 2.1.4l3-3.4 4.8 3.6c.8.6 2 .2 2.2-.8l1-14.4Zm-5.2 4.2-6.8 6.1-.9 3-1.1-3.6 8.8-5.5Z"/>
  </svg>
)
const RedditIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" {...p}>
    <path d="M14.5 3.5a1 1 0 0 1 1 1v1.1a7.5 7.5 0 0 1 3.9 2.2l.9-.4a1.5 1.5 0 1 1 1 2.8c-.3 0-.6-.1-.8-.3l-1 .5c.3.7.5 1.5.5 2.3 0 3.7-3.8 6.8-8.5 6.8S3.5 17.3 3.5 13.6c0-.8.2-1.6.5-2.3l-1-.5a1.5 1.5 0 1 1 0-2.5l1 .4A7.5 7.5 0 0 1 8 5.6V4.5a1 1 0 1 1 2 0v.8c.5-.1 1-.1 1.5-.1.5 0 1 0 1.5.1V4.5a1 1 0 0 1 1-1Z"/>
  </svg>
)
const TikTokIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" {...p}>
    <path d="M14 3h3.1c.3 2 1.6 3.8 3.4 4.8v3.2c-1.9-.4-3.6-1.4-5-2.8v6.8A6 6 0 1 1 10 9.3v3.3a3 3 0 1 0 3 3V3Z"/>
  </svg>
)

const PlatformIcon = ({ name }) => {
  const n = (name || "").toLowerCase()
  if (n.includes("facebook")) return <FacebookIcon />
  if (n.includes("telegram")) return <TelegramIcon />
  if (n.includes("reddit")) return <RedditIcon />
  if (n.includes("tiktok")) return <TikTokIcon />
  return <XIcon />
}

const severityStyles = {
  critical: "text-[#b91c1c]",
  high: "text-red-600",
  medium: "text-orange-500",
  low: "text-green-600",
}

const SeverityBadge = ({ level }) => {
  const l = (level || "low").toLowerCase()
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${l==="critical"?"bg-[#b91c1c]":l==="high"?"bg-red-500":l==="medium"?"bg-orange-400":"bg-green-500"}`} />
      <span className={severityStyles[l]}>{l[0].toUpperCase()+l.slice(1)}</span>
    </span>
  )
}

// ---- Transform API campaign data to UI format ----
function transformCampaign(campaign) {
  return {
    id: campaign._id,
    title: campaign.name,
    subtitle: campaign.description || "No description available",
    severity: campaign.priority || "medium",
    detected: new Date(campaign.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    platforms: campaign.platforms || ["x"],
    status: getStatusDisplay(campaign.status),
    recency: Math.floor((Date.now() - new Date(campaign.createdAt).getTime()) / (1000 * 60 * 60 * 24)), // days ago
    category: campaign.category,
    tags: campaign.tags || [],
    rawStatus: campaign.status,
    activityScore: campaign.activityScore || 0,
    totalTweets: campaign.stats?.totalTweets || 0,
    lastCrawled: campaign.stats?.lastCrawled
  }
}

// ---- Status display mapping ----
function getStatusDisplay(status) {
  switch (status) {
    case "active": return "Active";
    case "paused": return "Paused";
    case "archived": return "Archived";
    case "completed": return "Completed";
    default: return "Unknown";
  }
}

// ---- Time helper ----
function timeAgo(dateStr) {
  if (!dateStr) return "Unknown"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

export default function CampaignsArchivePage() {
  const navigate = useNavigate()

  // ---- filters state ----
  const [timeRange, setTimeRange] = useState("90") // Show more campaigns by default
  const [severity, setSeverity] = useState({ critical: true, high: true, medium: true, low: true })
  const [platforms, setPlatforms] = useState({ x: true, facebook: true, telegram: true, reddit: true, tiktok: true })
  const [status, setStatus] = useState({ active: true, paused: true, archived: false, completed: false }) // ✅ Include paused
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState("")
  const [query, setQuery] = useState("")

  // ---- data state ----
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRows, setTotalRows] = useState(0)
  const [error, setError] = useState(null)

  // ---- pagination ----
  const [page, setPage] = useState(1)
  const pageSize = 10 // Increased to show more campaigns

  // ---- Fetch campaigns from API ----
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters - include both active and paused
      const activeStatuses = Object.keys(status).filter(k => status[k])
      const activeSeverities = Object.keys(severity).filter(k => severity[k])
      const activePlatforms = Object.keys(platforms).filter(k => platforms[k])

      const params = {
        page,
        limit: pageSize,
        search: query || undefined,
        status: activeStatuses.length > 0 ? activeStatuses.join(',') : 'active,paused', // ✅ Default to both
        priority: activeSeverities.length > 0 ? activeSeverities.join(',') : undefined,
        platforms: activePlatforms.length > 0 ? activePlatforms.join(',') : undefined,
        timeRange: timeRange !== "custom" ? timeRange : undefined,
      }

      // Remove undefined params
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === '') {
          delete params[key]
        }
      })

      console.log('Fetching campaigns with params:', params)

      const response = await api.get('/campaigns', { params })
      
      console.log('API Response:', response.data)

      if (response.data.success) {
        const campaignsData = response.data.data.campaigns || response.data.data || []
        const transformedCampaigns = campaignsData.map(transformCampaign)
        
        setRows(transformedCampaigns)
        setTotalRows(response.data.data.pagination?.total || campaignsData.length)
        
        console.log('Transformed campaigns:', transformedCampaigns)
      } else {
        console.error('API returned error:', response.data)
        setError('Failed to load campaigns')
        setRows([])
        setTotalRows(0)
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      setError(error.message || 'Failed to load campaigns')
      setRows([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [page, query, severity, platforms, status, timeRange])

  // ---- Apply filters ----
  const applyFilters = useCallback(() => {
    setPage(1)
    fetchCampaigns()
  }, [fetchCampaigns])

  const resetFilters = useCallback(() => {
    setTimeRange("90")
    setSeverity({ critical: true, high: true, medium: true, low: true })
    setPlatforms({ x: true, facebook: true, telegram: true, reddit: true, tiktok: true })
    setStatus({ active: true, paused: true, archived: false, completed: false })
    setTags([])
    setNewTag("")
    setQuery("")
    setPage(1)
  }, [])

  // ---- Initial fetch ----
  useEffect(() => {
    fetchCampaigns()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]) // Fetch when page changes

  // ---- Tag management ----
  const addTag = useCallback(() => {
    const t = newTag.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setNewTag("")
  }, [newTag, tags])

  const removeTag = useCallback((t) => setTags(prev => prev.filter(x => x !== t)), [])

  // ---- Pagination calculations ----
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const visible = rows // API already returns paginated results

  // ---- Header counts ----
  const shownText = loading 
    ? "Loading campaigns..."
    : `Showing ${visible.length ? ((page-1)*pageSize+1) : 0}-${Math.min(page*pageSize, totalRows)} of ${totalRows} campaigns`

  // ---- helpers to toggle checkboxes ----
  const toggle = (setter, key) => setter(prev => ({ ...prev, [key]: !prev[key] }))

  // ---- Status counts for display ----
  const statusCounts = useMemo(() => {
    const counts = { active: 0, paused: 0, archived: 0, completed: 0 }
    rows.forEach(campaign => {
      const status = campaign.rawStatus || 'unknown'
      if (counts.hasOwnProperty(status)) {
        counts[status]++
      }
    })
    return counts
  }, [rows])

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] bg-gray-50">
      {/* Top header */}
      <header className="row-start-1 flex items-center justify-between gap-4 border-b bg-white px-5 py-3">
        <div className="flex w-[48%] items-center gap-4">
          <div className="whitespace-nowrap text-lg font-bold text-purple-700">Project Sentinel</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
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
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="row-start-2 grid grid-cols-[auto_1fr] gap-4 p-4">
        {/* Left sidebar nav */}
        <Sidebar/>
        
        {/* Main content grid */}
        <div className="grid h-[calc(100vh-96px)] grid-cols-[300px_1fr] gap-4">
          {/* Filters panel */}
          <section className="min-h-0 overflow-auto rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-4">Filter Campaigns</div>

            <FilterGroup title="Time Range">
              {[
                { id: "30", label: "Last 30 days" },
                { id: "90", label: "Last 90 days" },
                { id: "180", label: "Last 180 days" },
                { id: "365", label: "Last year" },
                { id: "custom", label: "Custom range" },
              ].map(opt => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="time"
                    checked={timeRange === opt.id}
                    onChange={() => setTimeRange(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Campaign Status">
              {[
                { id: "active", label: "Active", count: statusCounts.active },
                { id: "paused", label: "Paused", count: statusCounts.paused },
                { id: "archived", label: "Archived", count: statusCounts.archived },
                { id: "completed", label: "Completed", count: statusCounts.completed },
              ].map(s => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!status[s.id]}
                    onChange={() => toggle(setStatus, s.id)}
                  />
                  <span className="flex-1">{s.label}</span>
                  <span className="text-xs text-gray-500">({s.count})</span>
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Priority Level">
              {["critical", "high", "medium", "low"].map(s => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!severity[s]}
                    onChange={() => toggle(setSeverity, s)}
                  />
                  <SeverityBadge level={s} />
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Platform">
              {[
                { id: "x", label: "Twitter/X" },
                { id: "facebook", label: "Facebook" },
                { id: "telegram", label: "Telegram" },
                { id: "reddit", label: "Reddit" },
                { id: "tiktok", label: "TikTok" },
              ].map(p => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!platforms[p.id]}
                    onChange={() => toggle(setPlatforms, p.id)}
                  />
                  <div className="flex items-center gap-2">
                    <PlatformIcon name={p.id} />
                    {p.label}
                  </div>
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Tags">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence initial={false}>
                  {tags.map(t => (
                    <motion.span
                      key={t}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
                    >
                      {t}
                      <button onClick={() => removeTag(t)} className="text-purple-600 hover:text-purple-800">×</button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add tag..."
                  className="flex-1 rounded-xl border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                />
                <button 
                  onClick={addTag} 
                  className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </FilterGroup>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={applyFilters}
                className="w-full rounded-xl bg-purple-500 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Loading..." : "Apply Filters"}
              </button>
              <button
                onClick={resetFilters}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                Reset All
              </button>
            </div>
          </section>

          {/* Campaigns table */}
          <section className="min-h-0 overflow-auto rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Campaigns Archive</div>
                <div className="text-xs text-gray-500">
                  Browse and analyze active and paused campaigns
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/campaigns/new")}
                  className="rounded-xl bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
                >
                  New Campaign
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-3">
              {shownText}
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="divide-y">
              {loading ? (
                <div className="py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                  Loading campaigns...
                </div>
              ) : visible.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <div className="text-lg mb-2">No campaigns found</div>
                  <div className="text-sm">Try adjusting your filters or search terms</div>
                </div>
              ) : (
                visible.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-4 hover:bg-gray-50">
                    {/* title + subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">{c.title}</div>
                      <div className="truncate text-xs text-gray-500 mt-1">{c.subtitle}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <SeverityBadge level={c.severity} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.rawStatus === 'active' ? 'bg-green-100 text-green-700' :
                          c.rawStatus === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    {/* metrics */}
                    <div className="flex flex-col items-end text-sm text-gray-600 min-w-0">
                      <div>Created: {c.detected}</div>
                      <div className="text-xs text-gray-500">
                        {c.totalTweets} posts • Activity: {c.activityScore}%
                      </div>
                    </div>

                    {/* platforms */}
                    <div className="flex w-20 shrink-0 items-center gap-1 text-gray-500">
                      {c.platforms.slice(0, 3).map((p) => (
                        <span key={p} title={p}><PlatformIcon name={p} /></span>
                      ))}
                      {c.platforms.length > 3 && (
                        <span className="text-xs text-gray-400">+{c.platforms.length - 3}</span>
                      )}
                    </div>

                    {/* action */}
                    <div className="w-20 shrink-0 text-right">
                      <button
                        onClick={() => navigate(`/campaigns/${c.id}`)}
                        className="rounded-xl bg-purple-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-600 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages, page - 2 + i))
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className={`h-8 w-8 rounded-lg text-sm transition-colors ${
                        pageNum === page 
                          ? "bg-purple-500 text-white border-purple-500" 
                          : "border hover:bg-gray-50"
                      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {pageNum}
                    </button>
                  )
                }).filter((_, i, arr) => arr.findIndex(el => el.key === arr[i].key) === i)}
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers & small components ---------- */

function FilterGroup({ title, children }) {
  return (
    <div className="mb-6">
      <div className="mb-3 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}