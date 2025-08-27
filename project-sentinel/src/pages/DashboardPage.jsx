// eslint-disable-next-line no-unused-vars
import { useEffect, useMemo, useRef, useState } from "react"
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Twitter, Reddit, Clock } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { io } from "socket.io-client"

// --- CONFIG: set your Socket.IO endpoint here ---
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

// map severity -> styles
const sev = {
  high:  { badge: "bg-red-100 text-red-700",    bar: "bg-red-500"    },
  medium:{ badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
  low:   { badge: "bg-green-100 text-green-700",  bar: "bg-green-500"  },
}
const sevKey = (s) => (s || "low").toLowerCase()

// small sparkline
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

// severity pill
function SeverityBadge({ level }) {
  const k = sevKey(level)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sev[k].badge}`}>
      {k === "high" ? "High Severity" : k === "medium" ? "Medium Severity" : "Low Severity"}
    </span>
  )
}

// live alert item
function LiveAlert({ item }) {
  const k = sevKey(item.severity)
  const Icon = item.platform === "reddit" ? Reddit : Twitter // fallback "X" to Twitter icon
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
        <Icon className="size-4 text-gray-500" />
      </div>
      <p className="mt-2 text-sm text-gray-700 line-clamp-3">{item.description}</p>
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Clock className="size-3" /> {item.timeAgo || "just now"}
      </div>
    </motion.div>
  )
}

// campaign card
function CampaignCard({ c, onView }) {
  const k = sevKey(c.severity)
  const pct = Math.max(0, Math.min(100, c.activity || 0))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
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
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Activity Level</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div className={`h-2 rounded-full ${sev[k].bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Lead / reposts / sparkline */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-gray-200" />
          <div className="text-xs text-gray-600">
            <span className="font-medium">Lead:</span> {c.lead?.name || "—"}
          </div>
        </div>
        <div className="text-xs text-gray-500">{c.reposts || 0} reposts</div>
      </div>

      <div className="mt-2"><Sparkline data={c.spark || sampleSpark()} /></div>

      <button
        onClick={() => onView?.(c)}
        className="mt-4 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
      >
        View Details
      </button>
    </motion.div>
  )
}

// simple spark data
const sampleSpark = () =>
  Array.from({ length: 12 }, (_, i) => ({ v: 20 + Math.round(Math.random() * 60) }))

// --- PAGE -------------------------------------------------------------------
export default function DashboardPage() {
  const navigate = useNavigate()

  // Header search & prompt-to-assistant
  const [globalSearch, setGlobalSearch] = useState("")
  const [prompt, setPrompt] = useState("")
  const askAI = () => {
    const q = prompt.trim()
    if (q) navigate(`/assistant?q=${encodeURIComponent(q)}`)
    else navigate("/assistant")
  }

  // Alerts (right column, real-time)
  const [alerts, setAlerts] = useState(() => demoAlerts())

  // Campaigns (left cards, real-time)
  const [campaigns, setCampaigns] = useState(() => demoCampaigns())

  // Socket wiring
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] })

    // Live alerts from backend
    socket.on("live_alert", (payload) => {
      setAlerts((curr) => [formatAlert(payload), ...curr].slice(0, 30))
    })

    // Campaign updates
    socket.on("campaign_update", (payload) => {
      setCampaigns((curr) => {
        const idx = curr.findIndex((x) => x.id === payload.id)
        const incoming = normalizeCampaign(payload)
        if (idx >= 0) {
          // merge
          const clone = curr.slice()
          clone[idx] = { ...clone[idx], ...incoming }
          return clone
        }
        return [incoming, ...curr]
      })
    })

    return () => socket.disconnect()
  }, [])

  // Suggested topics
  const suggestions = useMemo(
    () => [
      "Campaign Analysis",
      "Threat Intelligence",
      "Narrative Tracking",
      "Evidence Collection",
    ],
    []
  )

  const viewCampaign = (c) => navigate(`/campaigns/${c.id}`)

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      {/* TOP BAR / HERO */}
      <header className="flex items-center justify-between gap-4 border-b bg-white px-5 py-3">
        {/* Left: brand + search */}
        <div className="flex items-center gap-4 w-[48%]">
          <div className="text-lg font-bold text-purple-700 whitespace-nowrap">
            Project Sentinel
          </div>
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search campaigns, alerts, or evidence…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
          />
        </div>

        {/* Right: Ask AI + user panel */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/assistant")}
            className="rounded-xl bg-purple-500 px-4 py-2 font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            Ask AI
          </button>
          <button
            onClick={() => navigate("/account")}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50"
            title="Account"
          >
            <div className="size-8 rounded-full bg-purple-200" />
            <div className="text-left leading-tight">
              <div className="text-sm font-semibold">Emma Chen</div>
              <div className="text-xs text-gray-500">Senior Analyst</div>
            </div>
          </button>
        </div>
      </header>

      {/* BODY GRID: left content + right live alerts */}
      <main className="grid h-[calc(100vh-64px)] min-h-0 grid-cols-[1fr_320px] gap-4 p-4">
        {/* LEFT COLUMN */}
        <section className="min-h-0 overflow-auto rounded-2xl">
          {/* Ask prompt box */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">Ask Project Sentinel</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Analyze recent disinformation trends in Eastern Europe…"
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
              />
              <button
                onClick={askAI}
                className="shrink-0 rounded-xl bg-purple-500 px-4 py-2 font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
              >
                Ask
              </button>
            </div>

            {/* Suggested topics */}
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => navigate(`/assistant?q=${encodeURIComponent(s)}`)}
                  className="rounded-full border px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Active Campaigns header */}
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Active Campaigns</h2>
            <button
              onClick={() => navigate("/campaigns/new")}
              className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              New Campaign
            </button>
          </div>

          {/* Campaign cards (3-up) */}
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {campaigns.map((c) => (
                <CampaignCard key={c.id} c={c} onView={viewCampaign} />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* RIGHT COLUMN — LIVE ALERTS */}
        <aside className="flex min-h-0 flex-col rounded-2xl border bg-white p-3">
          <div className="px-1 text-sm font-semibold text-gray-900">Live Alerts</div>

          {/* Scrollable list */}
          <div className="mt-2 flex-1 min-h-0 space-y-2 overflow-auto pr-1">
            <AnimatePresence initial={false}>
              {alerts.map((a) => (
                <LiveAlert key={a.id} item={a} />
              ))}
            </AnimatePresence>
          </div>

          <button
            onClick={() => navigate("/alerts")}
            className="mt-3 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            View All Alerts
          </button>
        </aside>
      </main>
    </div>
  )
}

// --- demo / normalization helpers ------------------------------------------
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
    {
      id: "c1",
      title: "Operation Shadow Whisper",
      severity: "high",
      description: "Coordinated disinformation targeting election integrity.",
      activity: 78,
      lead: { name: "Alex Morgan" },
      reposts: 12,
    },
    {
      id: "c2",
      title: "Cerberus Network",
      severity: "medium",
      description: "Multi-platform influence operation around health narratives.",
      activity: 52,
      lead: { name: "Sarah Kim" },
      reposts: 8,
    },
    {
      id: "c3",
      title: "Phoenix Rising",
      severity: "medium",
      description: "Network spreading misinformation in financial markets.",
      activity: 45,
      lead: { name: "Marcus Johnson" },
      reposts: 5,
    },
    {
      id: "c4",
      title: "Midnight Vanguard",
      severity: "high",
      description: "State-sponsored campaign targeting critical infrastructure.",
      activity: 83,
      lead: { name: "Emma Chen" },
      reposts: 15,
    },
    {
      id: "c5",
      title: "Echo Chamber",
      severity: "low",
      description: "Hashtag campaign spreading polarization through coordination.",
      activity: 28,
      lead: { name: "David Park" },
      reposts: 3,
    },
    {
      id: "c6",
      title: "Truth Distortion",
      severity: "medium",
      description: "Network of fake news sites in multiple languages.",
      activity: 61,
      lead: { name: "Priya Singh" },
      reposts: 9,
    },
  ]
  return rows.map(normalizeCampaign)
}
