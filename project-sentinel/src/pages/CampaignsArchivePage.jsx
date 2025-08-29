// src/pages/CampaignsArchivePage.jsx
import { useMemo, useState, useCallback, useEffect } from "react"
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import Sidebar from "@/components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"


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

// const SidebarLink = ({ text, onClick, danger }) => (
//   <button
//     onClick={onClick}
//     className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
//   >
//     {text}
//   </button>
// )

export default function CampaignsArchivePage() {
  const navigate = useNavigate()

  // ---- filters state
  const [timeRange, setTimeRange] = useState("30") // 30/90/180/custom
  const [severity, setSeverity] = useState({ critical: false, high: true, medium: true, low: true })
  const [platforms, setPlatforms] = useState({ x: true, facebook: true, telegram: false, reddit: true, tiktok: false })
  const [tags, setTags] = useState(["Misinformation", "Health"])
  const [newTag, setNewTag] = useState("")
  const [query, setQuery] = useState("")

  // ---- data (stubbed; replace with API)
  const [rows, setRows] = useState(() => seedData())

  // simulated fetch on filter apply
  const applyFilters = useCallback(() => {
    // In prod: call API with { timeRange, severity, platforms, tags, query, page }
    // Here: filter locally
    const filtered = seedData()
      .filter(r => {
        const sevOK =
          (severity.critical && r.severity==="critical") ||
          (severity.high && r.severity==="high") ||
          (severity.medium && r.severity==="medium") ||
          (severity.low && r.severity==="low")
        const platOK = Object.entries(platforms).some(([k, v]) => v && r.platforms.includes(k))
        const qOK = query ? (r.title.toLowerCase().includes(query.toLowerCase()) || r.subtitle.toLowerCase().includes(query.toLowerCase())) : true
        // naive time filter: newer dates for shorter ranges
        const dayWeight = timeRange==="30" ? 30 : timeRange==="90" ? 90 : 180
        const recencyOK = r.recency <= dayWeight
        return sevOK && platOK && qOK && recencyOK
      })
    setPage(1)
    setRows(filtered)
  }, [timeRange, severity, platforms, query])

  const resetFilters = useCallback(() => {
    setTimeRange("30")
    setSeverity({ critical: false, high: true, medium: true, low: true })
    setPlatforms({ x: true, facebook: true, telegram: false, reddit: true, tiktok: false })
    setTags(["Misinformation", "Health"])
    setNewTag("")
    setQuery("")
    setRows(seedData())
    setPage(1)
  }, [])

  const addTag = useCallback(() => {
    const t = newTag.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setNewTag("")
  }, [newTag, tags])

  const removeTag = useCallback((t) => setTags(prev => prev.filter(x => x !== t)), [])

  // ---- pagination
  const [page, setPage] = useState(1)
  const pageSize = 5
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const visible = useMemo(() => rows.slice((page-1)*pageSize, page*pageSize), [rows, page])

  // ---- top header counts
  const shownText = `Showing ${visible.length ? ((page-1)*pageSize+1) : 0}-${Math.min(page*pageSize, total)} campaigns`
  const filteredFrom = ` (Filtered from ${seedData().length})`

  // ---- helpers to toggle checkboxes
  const toggle = (setter, key) => setter(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    // whenever tag list changes, you might re-query — here we keep it manual via Apply
  }, [tags])

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] bg-gray-50">
      {/* Top header */}
      <header className="row-start-1 flex items-center justify-between gap-4 border-b bg-white px-5 py-3">
        <div className="flex w-[48%] items-center gap-4">
          <div className="whitespace-nowrap text-lg font-bold text-purple-700">Project Sentinel</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        {/* Left sidebar nav */}
        <Sidebar/>
        {/* Main content grid */}
        <div className="grid h-[calc(100vh-96px)] grid-cols-[300px_1fr] gap-4">
          {/* Filters panel */}
          <section className="min-h-0 overflow-auto rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Filter Campaigns</div>

            <FilterGroup title="Time Range">
              {[
                { id: "30", label: "Last 30 days" },
                { id: "90", label: "Last 90 days" },
                { id: "180", label: "Last 180 days" },
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

            <FilterGroup title="Severity">
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
                  {p.label}
                </label>
              ))}
            </FilterGroup>

            <FilterGroup title="Narrative Tags">
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
                      <button onClick={() => removeTag(t)} className="text-purple-600">×</button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="flex-1 rounded-xl border px-2 py-1 text-sm"
                />
                <button onClick={addTag} className="rounded-xl border px-2 py-1 text-sm hover:bg-gray-50">+</button>
              </div>
            </FilterGroup>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 rounded-xl bg-purple-500 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-600"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="flex-1 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </section>

          {/* Campaigns table */}
          <section className="min-h-0 overflow-auto rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">Campaigns Archive</div>
                <div className="text-xs text-gray-500">
                  Browse and analyze past disinformation campaigns
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search campaigns..."
                  className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-purple-200"
                />
                <button
                  onClick={applyFilters}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {shownText}{filteredFrom}
            </div>

            <div className="mt-3 divide-y">
              {visible.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                  {/* title + subtitle */}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{c.title}</div>
                    <div className="truncate text-xs text-gray-500">{c.subtitle}</div>
                  </div>

                  {/* severity */}
                  <div className="w-28 shrink-0">
                    <SeverityBadge level={c.severity} />
                  </div>

                  {/* detected date */}
                  <div className="w-32 shrink-0 text-sm text-gray-700">{c.detected}</div>

                  {/* platforms */}
                  <div className="flex w-28 shrink-0 items-center gap-2 text-gray-500">
                    {c.platforms.map((p) => (
                      <span key={p} title={p}><PlatformIcon name={p} /></span>
                    ))}
                  </div>

                  {/* status */}
                  <div className={`w-28 shrink-0 text-sm ${statusColor(c.status)}`}>
                    {c.status}
                  </div>

                  {/* action */}
                  <div className="w-20 shrink-0 text-right">
                    <button
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                      className="rounded-xl bg-purple-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-600"
                    >
                      view
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* pagination */}
            <div className="mt-4 flex items-center justify-end gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-8 w-8 rounded-lg border text-sm ${n===page ? "bg-purple-500 text-white border-purple-500" : "hover:bg-gray-50"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers & small components ---------- */

function FilterGroup({ title, children }) {
  return (
    <div className="mt-4">
      <div className="mb-2 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function statusColor(s) {
  const t = (s || "").toLowerCase()
  if (t === "resolved") return "text-green-600"
  if (t === "monitoring") return "text-blue-600"
  if (t === "active") return "text-red-600"
  return "text-gray-600"
}

// Demo dataset. Replace with API results.
function seedData() {
  return [
    {
      id: "c1",
      title: "Operation Shadow Whisper",
      subtitle: "Election interference campaign",
      severity: "critical",
      detected: "Oct 12, 2023",
      platforms: ["x", "facebook"],
      status: "Monitoring",
      recency: 10,
    },
    {
      id: "c2",
      title: "Pandemic Panic Network",
      subtitle: "Health misinformation campaign",
      severity: "high",
      detected: "Sep 28, 2023",
      platforms: ["facebook", "reddit"],
      status: "Resolved",
      recency: 40,
    },
    {
      id: "c3",
      title: "Financial Chaos Initiative",
      subtitle: "Economic destabilization campaign",
      severity: "medium",
      detected: "Sep 15, 2023",
      platforms: ["x"],
      status: "Active",
      recency: 55,
    },
    {
      id: "c4",
      title: "Sovereign Defense Network",
      subtitle: "Military misinformation campaign",
      severity: "high",
      detected: "Aug 30, 2023",
      platforms: ["x", "reddit"],
      status: "Monitoring",
      recency: 75,
    },
    {
      id: "c5",
      title: "Energy Crisis Fabrication",
      subtitle: "Infrastructure misinformation",
      severity: "medium",
      detected: "Aug 17, 2023",
      platforms: ["x", "facebook", "reddit"],
      status: "Resolved",
      recency: 100,
    },
    // add more to simulate pagination
    ...Array.from({ length: 23 }, (_, i) => ({
      id: `c${i + 6}`,
      title: `Synthetic Campaign ${i + 6}`,
      subtitle: "Auto-generated sample",
      severity: ["low", "medium", "high"][i % 3],
      detected: "Jul 2023",
      platforms: ["x", "facebook", "reddit", "telegram", "tiktok"].filter((_, j) => (i + j) % 2 === 0),
      status: ["Monitoring", "Active", "Resolved"][i % 3],
      recency: 30 + (i % 150),
    })),
  ]
}
