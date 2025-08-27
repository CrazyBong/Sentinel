// src/pages/AnalyticsTrendsPage.jsx
// eslint-disable-next-line no-unused-vars
import AIDetectionSummary from "../components/AIDetectionSummary";
// eslint-disable-next-line no-unused-vars
import { useEffect, useMemo, useState, useCallback } from "react"
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts"
import { io } from "socket.io-client"

// --- Config (wire to env when backend is ready)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

// --- Small helpers
const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
)
const SectionTitle = ({ children }) => (
  <div className="mb-2 text-sm font-semibold text-gray-900">{children}</div>
)

// Inline brand icon (Twitter/X) for “Most Active Platform”
const XIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18 2H21L13.5 10.5L22.5 22H15L10 15.5L4.5 22H1.5L9.5 13L1 2H8L12.5 8L18 2Z"/></svg>
)

// Colors (kept neutral to match Tailwind unless you prefer custom palette)
const PURPLE = "#8b5cf6"
const LAVENDER = "#a78bfa"
const LIME = "#84cc16"
const GREEN = "#22c55e"
const ORANGE = "#f59e0b"
const RED = "#ef4444"
const GRAY = "#e5e7eb"

// ------- Demo data builders (replace with API)
const makeSeries = (n = 28) =>
  Array.from({ length: n }, (_, i) => ({
    date: `Jan ${i + 1}`,
    detected: 20 + Math.round(Math.random() * 60),
    resolved: 10 + Math.round(Math.random() * 40),
  }))

const demoPlatformDist = () => ([
  { name: "Twitter", value: 62 },
  { name: "Facebook", value: 18 },
  { name: "Telegram", value: 12 },
  { name: "Reddit", value: 5 },
  { name: "Others", value: 3 },
])

const demoSeverityDist = () => ([
  { name: "Low", value: 18, color: GREEN },
  { name: "Medium", value: 34, color: ORANGE },
  { name: "High", value: 31, color: RED },
  { name: "Very High", value: 17, color: LAVENDER },
])

const demoNarratives = () => ([
  { title: "Election Interference", deltaPct: +12, occurrences: 42 },
  { title: "Vaccine Misinformation", deltaPct: +8, occurrences: 38 },
  { title: "Climate Change Denial", deltaPct: +5, occurrences: 27 },
  { title: "Economic Fearmongering", deltaPct: +3, occurrences: 24 },
  { title: "Military Conflict", deltaPct: +2, occurrences: 19 },
])

const demoContentTypes = () => ([
  { type: "Images", pct: 45 },
  { type: "Text Posts", pct: 32 },
  { type: "Videos", pct: 23 },
])

const demoAIDetection = () => ({
  totalAnalyzed: 124568,
  aiGenerated: 37842,
  accuracyPct: 94.7,
  breakdown: [
    { label: "Deepfakes", pct: 28 },
    { label: "Generated Text", pct: 52 },
    { label: "Manipulated Images", pct: 20 },
  ],
})

export default function AnalyticsTrendsPage() {
  const navigate = useNavigate()

  // KPI
  // eslint-disable-next-line no-unused-vars
  const [totalCampaigns, setTotalCampaigns] = useState(247)
  // eslint-disable-next-line no-unused-vars
  const [totalDelta, setTotalDelta] = useState(+12)
  // eslint-disable-next-line no-unused-vars
  const [activeToday, setActiveToday] = useState(38)
  // eslint-disable-next-line no-unused-vars
  const [activeDelta, setActiveDelta] = useState(+5)
  // eslint-disable-next-line no-unused-vars
  const [avgSeverity, setAvgSeverity] = useState(7.2)
  // eslint-disable-next-line no-unused-vars
  const [severityDelta, setSeverityDelta] = useState(-0.5)
  const [topPlatform, setTopPlatform] = useState({ name: "Twitter", share: 62 })

  // Charts/widgets
  const [bucket, setBucket] = useState("month") // week | month | year
  const [series, setSeries] = useState(makeSeries())
  // eslint-disable-next-line no-unused-vars
  const [platformDist, setPlatformDist] = useState(demoPlatformDist())
  // eslint-disable-next-line no-unused-vars
  const [severityDist, setSeverityDist] = useState(demoSeverityDist())
  // eslint-disable-next-line no-unused-vars
  const [narratives, setNarratives] = useState(demoNarratives())
  // eslint-disable-next-line no-unused-vars
  const [contentTypes, setContentTypes] = useState(demoContentTypes())
  // eslint-disable-next-line no-unused-vars
  const [aiDetection, setAiDetection] = useState(demoAIDetection())

  // Socket (demo wiring)
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    })

    socket.on("metrics:update", ({ key, payload }) => {
      if (key === "activeToday") setActiveToday((v) => v + (payload?.delta ?? 1))
      if (key === "platformShare") setTopPlatform(payload)
    })
    socket.on("campaign:new", () => {
      setActiveToday((v) => v + 1)
      setSeries((s) => s.map((p, i) => i === s.length - 1 ? { ...p, detected: p.detected + 1 } : p))
    })

    return () => socket.disconnect()
  }, [])

  // Re-mock series on bucket change (replace with API call)
  useEffect(() => {
    const len = bucket === "week" ? 7 : bucket === "month" ? 28 : 12
    setSeries(makeSeries(len))
  }, [bucket])

  const platformColors = [PURPLE, LAVENDER, LIME, "#7dd3fc", "#c4b5fd"]

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] bg-gray-50">
      {/* Header */}
      <header className="row-start-1 flex items-center justify-between gap-4 border-b bg-white px-5 py-3">
        <div className="flex w-[48%] items-center gap-4">
          <div className="text-lg font-bold text-purple-700">Project Sentinel</div>
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
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl border px-3 py-2 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body: left nav + content */}
      <div className="row-start-2 grid grid-cols-[220px_1fr] gap-4 p-4">
        {/* Left Nav (no Evidence Library / Settings) */}
        <aside className="flex h-[calc(100vh-96px)] flex-col rounded-2xl border bg-white p-3">
          <nav className="space-y-1 text-sm">
            <NavLink text="Dashboard" onClick={() => navigate("/dashboard")} />
            <NavLink text="Campaigns Archive" onClick={() => navigate("/archive")} />
            <NavLink text="Analytics & Trends" onClick={() => navigate("/analytics")} />
            <NavLink text="AI Assistant" onClick={() => navigate("/assistant")} />
            <NavLink text="Logout" danger onClick={() => navigate("/login")} />
          </nav>
          <div className="mt-auto pt-3">
            <button className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">Get Help</button>
          </div>
        </aside>

        {/* Main content (scroll) */}
        <section className="min-h-0 overflow-auto">
          {/* Hero */}
          <div className="mb-3">
            <h1 className="text-xl font-bold text-gray-900">Analytics & Trends</h1>
            <p className="text-sm text-gray-500">Campaign insights and performance metrics overview</p>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total Campaigns</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{totalCampaigns}</div>
              <div className="mt-1 text-xs text-gray-500">{totalDelta >= 0 ? "+" : ""}{totalDelta}% from last month</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Active Today</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{activeToday}</div>
              <div className="mt-1 text-xs text-gray-500">{activeDelta >= 0 ? "+" : ""}{activeDelta} since yesterday</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Avg. Severity</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{avgSeverity.toFixed(1)}</div>
              <div className="mt-1 text-xs text-gray-500">{severityDelta >= 0 ? "+" : ""}{severityDelta} from last week</div>
            </Card>

            <Card className="p-4 bg-purple-600 text-white">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide opacity-90">
                <span>Most Active Platform</span>
                <XIcon className="h-5 w-5" />
              </div>
              <div className="mt-1 text-2xl font-bold">{topPlatform.name}</div>
              <div className="mt-1 text-xs opacity-90">{topPlatform.share}% of all activity</div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Campaign Detection Over Time */}
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle>Campaign Detection Over Time</SectionTitle>
                <div className="flex items-center gap-1">
                  <ToggleButton label="Week" active={bucket==="week"} onClick={() => setBucket("week")} />
                  <ToggleButton label="Month" active={bucket==="month"} onClick={() => setBucket("month")} />
                  <ToggleButton label="Year" active={bucket==="year"} onClick={() => setBucket("year")} />
                </div>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRAY} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="detected" stroke={PURPLE} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="resolved" stroke={LIME} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Platform Distribution */}
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle>Platform Distribution</SectionTitle>
                {/* filter button placeholder */}
                <button className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">Filter</button>
              </div>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={platformDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {platformDist.map((entry, i) => (
                        <Cell key={entry.name} fill={platformColors[i % platformColors.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Heatmap/Severity + Narrative Trends */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            {/* Severity Distribution Pie (as Post Activity Heatmap proxy) */}
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <SectionTitle>Post Activity (by Severity)</SectionTitle>
                <div className="flex items-center gap-1 text-xs">
                  <span className="rounded-lg border px-2 py-1">Daily</span>
                  <span className="rounded-lg border px-2 py-1">Weekly</span>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={severityDist} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                      {severityDist.map((seg, i) => <Cell key={i} fill={seg.color} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Narrative Trends list */}
            <Card className="p-4">
              <SectionTitle>Narrative Trends</SectionTitle>
              <div className="space-y-2">
                {narratives.map((n, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                      <div className={`text-sm font-semibold ${n.deltaPct>=0 ? "text-green-600" : "text-red-600"}`}>
                        {n.deltaPct>=0 ? "+" : ""}{n.deltaPct}%
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">Recurring in {n.occurrences} campaigns</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Bottom row: Geo Impact, Content Types, AI Detection Summary */}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Geo Impact (placeholder) */}
            <Card className="p-4">
              <SectionTitle>Geographic Impact</SectionTitle>
              <div className="h-48 w-full rounded-xl bg-purple-100/70" />
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center justify-between"><span>United States</span><span>32%</span></div>
                <div className="flex items-center justify-between"><span>European Union</span><span>28%</span></div>
                <div className="flex items-center justify-between"><span>Eastern Europe</span><span>18%</span></div>
              </div>
            </Card>

            {/* Content Type Analysis */}
            <Card className="p-4">
              <SectionTitle>Content Type Analysis</SectionTitle>
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart data={contentTypes} layout="vertical" margin={{ left: 24 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="type" width={80} />
                    <Tooltip />
                    <Bar dataKey="pct" fill={PURPLE} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-xs text-gray-500">Share by media type (last 30 days)</div>
            </Card>

            {/* AI Detection Summary */}
            <AIDetectionSummary data={aiDetection} />
          </div>
        </section>
      </div>
    </div>
  )
}

/* ---------- tiny UI bits ---------- */
function NavLink({ text, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
    >
      {text}
    </button>
  )
}

function ToggleButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2 py-1 text-xs ${active ? "border-purple-500 bg-purple-50 text-purple-700" : "hover:bg-gray-50"}`}
    >
      {label}
    </button>
  )
}
