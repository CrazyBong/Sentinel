// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react"
import { Bell } from "lucide-react"
import { Archive } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Clock } from "lucide-react"               // keep lucide only for neutral icons
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { io } from "socket.io-client"
import Sidebar from "../components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"
import ShieldLogo from "@/assets/shield.png"
import CampArchieve from "@/assets/archive.png"


// --- CONFIG: set your Socket.IO endpoint here ---
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

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

// ---------- live alert ----------
function LiveAlert({ item }) {
  const k = sevKey(item.severity)
  const Icon = item.platform === "reddit" ? RedditIcon : XIcon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-gray-900">{item.title}</div>
          <SeverityBadge level={item.severity} />
        </div>
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <p className="mt-2 text-sm text-gray-700 line-clamp-3">{item.description}</p>
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" /> {item.timeAgo || "just now"}
      </div>
    </motion.div>
  )
}

// ---------- campaign card ----------
function CampaignCard({ c, onView }) {
  const k = sevKey(c.severity)
  const pct = Math.max(0, Math.min(100, c.activity || 0))

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
        stiffness: 120, // kam stiffness
        damping: 12,    // jyada damping for smoothness
      }}
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <SeverityBadge level={c.severity} />
          <div className="text-lg font-semibold text-gray-900">{c.title}</div>
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

      {/* Lead / reposts / sparkline */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-200" />
          <div className="text-xs text-gray-600">
            <span className="font-medium">Lead:</span> {c.lead?.name || "—"}
          </div>
        </div>
        <div className="text-xs text-gray-500">{c.reposts || 0} reposts</div>
      </div>

      <div className="mt-2">
        <Sparkline data={c.spark || sampleSpark()} />
      </div>

      <button
        onClick={() => onView?.(c)}
        className="mt-4 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
      >
        View Details
      </button>
    </motion.div>
  );
}
// ---------- sample spark data ----------
const sampleSpark = () =>
  Array.from({ length: 12 }, () => ({ v: 20 + Math.round(Math.random() * 60) }))

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

  // Alerts (right column, real-time)
  const [alerts, setAlerts] = useState(() => demoAlerts())

  // Campaigns (left cards, real-time)
  const [campaigns, setCampaigns] = useState(() => demoCampaigns())

  // Socket wiring
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    })

    const onConnectError = (err) => console.error("Socket connection error:", err)
    const onLiveAlert = (payload) => setAlerts((curr) => [formatAlert(payload), ...curr].slice(0, 30))
    const onCampaignUpdate = (payload) => {
      setCampaigns((curr) => {
        const idx = curr.findIndex((x) => x.id === payload.id)
        const incoming = normalizeCampaign(payload)
        if (idx >= 0) {
          const clone = curr.slice()
          clone[idx] = { ...clone[idx], ...incoming }
          return clone
        }
        return [incoming, ...curr]
      })
    }

    socket.on("connect_error", onConnectError)
    socket.on("live_alert", onLiveAlert)
    socket.on("campaign_update", onCampaignUpdate)

    return () => {
      socket.off("connect_error", onConnectError)
      socket.off("live_alert", onLiveAlert)
      socket.off("campaign_update", onCampaignUpdate)
      socket.disconnect()
    }
  }, [])

  // Suggested topics
  const suggestions = useMemo(
    () => ["Campaign Analysis", "Threat Intelligence", "Narrative Tracking", "Evidence Collection"],
    []
  )

  const viewCampaign = useCallback((c) => navigate(`/campaigns/${c.id}`), [navigate])

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
      onClick={() => navigate("/assistant")}
      className="rounded-full bg-purple-500 p-1.5 shadow-sm hover:bg-purple-600 transition"
      aria-label="Ask AI"
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
  {open && (
  <img
    src={ShieldLogo}
    alt="Sentinel Logo"
    className="h-8 w-8 object-contain"
  />
)
}
<span>SentinelAI</span>
</h2>
  
  <div className="relative flex gap-3">
    <input
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
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

  {/* Active Campaigns */}
  <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-1 text-xl font-semibold text-gray-900">
        <Archive className="h-5 w-5 text-gray-600 fill-green-500" /> 
        <span>Active Campaigns</span>
        </h2>
      <button
        onClick={() => navigate("/campaigns/new")}
        className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
      >
        New Campaign
      </button>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {campaigns.map((c) => (
          <CampaignCard key={c.id} c={c} onView={viewCampaign} />
        ))}
      </AnimatePresence>
    </div>
  </div>
</section>



  {/* RIGHT COLUMN — LIVE ALERTS */}
<aside className="flex min-h-0 flex-col rounded-2xl bg-purple-50 shadow-lg border border-gray-200 p-4">
  <div className="flex items-center gap-2 text-base font-semibold text-gray-900 pb-2 mb-3">

   <Bell className="h-5 w-5 text-gray-600 fill-red-500" /> 
    <span>Live Alerts</span>
  </div>

  <div className="flex-1 min-h-0 space-y-3 overflow-auto pr-1">
    <AnimatePresence initial={false}>
      {alerts.map((a) => (
        <LiveAlert key={a.id} item={a} />
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
    platform: (a.platform || "x").toLowerCase(), // "x" or "reddit"
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
