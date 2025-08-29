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
import Sidebar from "@/components/ui/Sidebar";

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
  { name: "Low", value: 18, color: "#C7D2FE" },       // light indigo
  { name: "Medium", value: 34, color: "#A78BFA" },    // lavender
  { name: "High", value: 31, color: "#8B5CF6" },      // purple
  { name: "Very High", value: 17, color: "#7C3AED" }, // deep violet
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

  // New state for severity timeframe
  const [severityTimeframe, setSeverityTimeframe] = useState('daily')

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

  // Demo data functions for severity distribution
  const getDailySeverityData = () => ([
  { name: "Low", value: 18, color: "#C7D2FE" },       // light indigo
  { name: "Medium", value: 34, color: "#A78BFA" },    // lavender
  { name: "High", value: 31, color: "#8B5CF6" },      // purple
  { name: "Very High", value: 17, color: "#7C3AED" }, // deep violet
]);

  const getWeeklySeverityData = () => ([
  { name: "Low", value: 25, color: "#C7D2FE" },
  { name: "Medium", value: 40, color: "#A78BFA" },
  { name: "High", value: 20, color: "#8B5CF6" },
  { name: "Very High", value: 15, color: "#7C3AED" },
]);
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
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-gray-50 rounded-lg transition-colors"
            title="Account Settings"
          >
            <div className="h-7 w-7 rounded-full bg-purple-200 flex items-center justify-center">
              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="leading-tight text-left">
              <div className="text-sm font-semibold">Emma Chen</div>
              <div className="text-xs text-gray-500">Senior Analyst</div>
            </div>
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
      <div className="row-start-2 flex h-[calc(100vh-96px)]">
        {/* Left Nav (no Evidence Library / Settings) */}
        <Sidebar />

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

            <Card className=" bg-purple-600 p-4 text-black">
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
  {/* Header with Filter icon */}
  <div className="mb-2 flex items-center justify-between">
    <SectionTitle>Platform Distribution</SectionTitle>
   
  </div>

  <div className="flex items-center">
    {/* Pie Chart */}
    <div className="h-56 w-1/2">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={platformDist}
            dataKey="value"
            nameKey="name"
            outerRadius={80}
            innerRadius={0}   // ✅ solid pie, not donut
            labelLine={false}
          >
            {platformDist.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={platformColors[i % platformColors.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Custom Legend */}
    <div className="w-1/2 pl-6 space-y-2">
      {platformDist.map((entry, i) => (
        <div key={entry.name} className="flex items-center space-x-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: platformColors[i % platformColors.length] }}
          ></span>
          <span className="text-sm text-gray-700">
            {entry.name} - {entry.value}%
          </span>
        </div>
      ))}
    </div>
  </div>
</Card>

          </div>

          {/* Heatmap/Severity + Narrative Trends */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            {/* Severity Distribution Pie (Post Activity) */}
            {/* Post Activity Heatmap */}
<Card className="p-4">
  <div className="flex items-center justify-between">
    <h2 className="text-base font-semibold text-gray-900">Post Activity Heatmap</h2>
    <div className="flex gap-2">
      <button
        className={`rounded-lg px-3 py-1 text-sm font-medium ${
          severityTimeframe === "daily"
            ? "bg-purple-100 text-purple-700"
            : "bg-gray-100 text-gray-600"
        }`}
        onClick={() => setSeverityTimeframe("daily")}
      >
        Daily
      </button>
      <button
        className={`rounded-lg px-3 py-1 text-sm font-medium ${
         severityTimeframe === "weekly"
            ? "bg-purple-500 text-white"
            : "bg-gray-100 text-gray-600"
        }`}
        onClick={() => setSeverityTimeframe("weekly")}
      >
        Weekly
      </button>
    </div>
  </div>

  <div className="mt-4 h-[280px] w-full rounded-xl bg-gray-50 p-4">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={severityTimeframe === "daily" ? getDailySeverityData() : getWeeklySeverityData()}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="value"
          labelLine={false}
          label={({ name, percent }) => `${name}`}
        >
          {(severityTimeframe === "daily" ? getDailySeverityData() : getWeeklySeverityData()).map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          align="center"
          layout="horizontal"
          iconType="circle"
          iconSize={10}
        />
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
