import { useEffect, useMemo, useState, useCallback } from "react"
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from "recharts"
import { io } from "socket.io-client"
import Sidebar from "@/components/ui/Sidebar"


// ---------- CONFIG ----------
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

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

// ---------- severity styles ----------
const sev = {
  high:   { badge: "bg-red-100 text-red-700",     text: "High Severity"   },
  medium: { badge: "bg-orange-100 text-orange-700", text: "Medium Severity" },
  low:    { badge: "bg-green-100 text-green-700",   text: "Low Severity"    },
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
            <Line type="monotone" dataKey="volume" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="engagement" strokeWidth={2} dot={false} />
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
            <Scatter data={points} />
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
  const PlatformIcon = item.platform === "reddit" ? RedditIcon : XIcon
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <div className="h-9 w-9 rounded-full bg-purple-200" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{item.account}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <PlatformIcon className="h-4 w-4" />
              <span>{item.timestamp}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-800">{item.text}</p>
          {item.image && (
            <img
              src={item.image}
              alt="evidence"
              className="mt-2 w-full rounded-xl object-cover"
              style={{ maxHeight: 220 }}
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>🔁 {item.shares} shares</span>
            <span>💬 {item.comments} comments</span>
            <span>❤️ {item.likes} likes</span>
            <span className="ml-auto rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
              {item.botProb}% bot probability
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------- helpers ----------
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function buildTimeline() {
  const days = 30
  const out = []
  for (let i = days; i >= 0; i--) {
    out.push({
      date: `${i}d`,
      volume: 50 + Math.round(Math.random() * 100),
      engagement: 30 + Math.round(Math.random() * 80),
    })
  }
  return out
}

function buildNetwork(n = 180) {
  return Array.from({ length: n }, () => ({
    x: randomInt(-50, 50),
    y: randomInt(-50, 50),
    z: randomInt(1, 4),
  }))
}

function buildEvidence(count = 3) {
  const now = new Date()
  const platforms = ["x", "reddit"]
  const pics = [
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    account: ["@HealthTruthSeeker", "@TruthWarrior1776", "@MedicalFreedom"][i % 3],
    timestamp: new Date(now.getTime() - (i + 1) * 60 * 60 * 1000).toLocaleString(),
    text:
      [
        "BREAKING: Scientists discover the new vaccine contains nanobots that can track your location! #VaccineDeception #WakeUp",
        "Don’t be a sheep! The vaccine alters your DNA permanently and they’re not telling you!",
        "LEAKED DOCUMENT: Severe side effects hidden from the public. #BigPharmaLies",
      ][i % 3],
    image: pics[i % pics.length],
    shares: randomInt(600, 2500),
    comments: randomInt(120, 1000),
    likes: randomInt(800, 4000),
    botProb: randomInt(80, 98),
    platform: platforms[i % platforms.length],
  }))
}

function buildInsights() {
  return {
    summary:
      "This is a coordinated disinformation campaign targeting COVID-19 vaccines with false claims about tracking technology, DNA alteration, and concealed side effects. The campaign appears to have originated from a network of 40–50 core accounts with bot amplification.",
    insights: [
      { title: "Coordinated Timing", body: "93% of high-impact posts were published within a 4-hour window. Peak between 8–10 PM EST when fact-checking resources are less active." },
      { title: "Narrative Evolution", body: "The campaign begins with general vaccine skepticism, then evolves into conspiracy-driven narratives about DNA alteration and microchips." },
      { title: "Visual Manipulation", body: "AI analysis indicates that ~87% of images were manipulated or fabricated." },
      { title: "Bot Network Structure", body: "Network analysis reveals a hierarchical structure with ~42 primary creators and ~140 amplifiers." },
    ],
    actions: [
      "Report core network accounts to platform authorities.",
      "Prepare fact-checking resources for the specific claims.",
      "Alert health authorities about potential public confusion.",
      "Monitor for narrative evolution and new hashtags.",
    ],
  }
}

// ---------- PAGE ----------
export default function CampaignDetailsPage() {
  const { id = "vaccine-deception" } = useParams()
  const navigate = useNavigate()

  // core campaign state
  const [campaign, setCampaign] = useState({
    id,
    title: "#VaccineDeception Campaign",
    severity: "high",
    detectedAt: "March 15, 2023",
    lastUpdated: "2 hours ago",
    posts: 1247,
    postsDelta: 328,
    accounts: 342,
    autoProb: 87,
    severityScore: 8.7,
    severityDelta: 12,
    peakActivity: "8–10 PM EST",
  })

  const [timeline, setTimeline] = useState(buildTimeline)
  const [network, setNetwork] = useState(buildNetwork)
  const [evidence, setEvidence] = useState(buildEvidence)
  const insights = useMemo(buildInsights, [])

  // socket wiring
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    })

    const onStats = (payload) => setCampaign((c) => ({ ...c, ...payload }))
    const onTimeline = (row) => setTimeline((curr) => [...curr.slice(-29), row])
    const onEvidence = (post) => setEvidence((curr) => [post, ...curr])
    const onNetworkPoint = (pt) => setNetwork((curr) => [...curr, pt])

    socket.on("campaign:stats", onStats)
    socket.on("campaign:timeline", onTimeline)
    socket.on("campaign:evidence", onEvidence)
    socket.on("campaign:network", onNetworkPoint)

    socket.on("connect_error", (e) => console.error("socket error:", e))
    return () => {
      socket.off("campaign:stats", onStats)
      socket.off("campaign:timeline", onTimeline)
      socket.off("campaign:evidence", onEvidence)
      socket.off("campaign:network", onNetworkPoint)
      socket.disconnect()
    }
  }, [])

  // filter/sort controls for evidence
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [sortKey, setSortKey] = useState("recent")
  const filteredEvidence = useMemo(() => {
    let rows = evidence
    if (filterPlatform !== "all") rows = rows.filter((r) => r.platform === filterPlatform)
    if (sortKey === "shares") rows = [...rows].sort((a, b) => b.shares - a.shares)
    else if (sortKey === "likes") rows = [...rows].sort((a, b) => b.likes - a.likes)
    else rows = [...rows] // "recent" (already recent first)
    return rows
  }, [evidence, filterPlatform, sortKey])

  const backToDashboard = useCallback(() => navigate("/dashboard"), [navigate])
  const downloadPack = useCallback(() => {
    // TODO: hook backend
    alert("Downloading evidence pack…")
  }, [])
  const shareAnalysis = useCallback(() => {
    // TODO: hook backend
    alert("Shareable analysis link created!")
  }, [])

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
                </div>
                <Badge level={campaign.severity} />
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
                  sub={`${campaign.autoProb}% automated probability`}
                />
                <StatCard
                  label="Severity Score"
                  value={`${campaign.severityScore.toFixed(1)}/10`}
                  sub={`Increased ${campaign.severityDelta} points`}
                />
                <StatCard label="Peak Activity" value={campaign.peakActivity} />
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
                <div className="text-sm font-semibold text-gray-900">Key Evidence</div>
                <div className="flex items-center gap-2">
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="rounded-xl border px-2 py-1 text-sm"
                    title="Filter"
                  >
                    <option value="all">All</option>
                    <option value="x">X / Twitter</option>
                    <option value="reddit">Reddit</option>
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-xl border px-2 py-1 text-sm"
                    title="Sort"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="shares">Top Shares</option>
                    <option value="likes">Top Likes</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredEvidence.map((it) => (
                    <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <EvidenceCard item={it} />
                    </motion.div>
                  ))}
                </AnimatePresence>
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

              <div className="rounded-xl bg-purple-50 p-3 text-sm text-purple-900">
                {insights.summary}
              </div>

              <div className="mt-3 space-y-3">
                {insights.insights.map((k, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 p-3">
                    <div className="text-sm font-semibold text-gray-900">{k.title}</div>
                    <div className="mt-1 text-sm text-gray-700">{k.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <div className="text-sm font-semibold text-gray-900">Recommended Actions</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {insights.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}

// ---------- small components ----------
function SidebarLink({ onClick, text, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2 text-left transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {text}
    </button>
  )
}
