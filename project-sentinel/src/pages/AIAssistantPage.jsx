import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import logo from "@/assets/logo.png"

const now = () => new Date().toLocaleString()
const fakeLLMReply = async (prompt) => {
  await new Promise((r) => setTimeout(r, 600))
  return `Here’s an initial analysis for: **${prompt.slice(0, 64)}** …\n\n(Replace this with your real LLM API response.)`
}
const cx = (...c) => c.filter(Boolean).join(" ")

function SidebarLink({ to = "#", active = false, children }) {
  return (
    <Link
      to={to}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-purple-100 text-purple-700" : "text-gray-700 hover:bg-gray-100"
      )}
    >
      {children}
    </Link>
  )
}
function SavedQueryItem({ title, lastAccessed, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="text-xs text-gray-500">Last accessed: {lastAccessed}</div>
    </button>
  )
}
function RecentItem({ title, started, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="text-xs text-gray-500">Started: {started}</div>
    </button>
  )
}
function ChatMessage({ role, content }) {
  const isUser = role === "user"
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "rounded-2xl px-4 py-3 shadow-sm border",
        isUser ? "self-end bg-white border-purple-200" : "self-start bg-purple-50 border-purple-200"
      )}
    >
      <div className={cx("text-xs mb-1", isUser ? "text-purple-600" : "text-purple-700")}>
        {isUser ? "You" : "AI Assistant"}
      </div>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap">{content}</div>
    </motion.div>
  )
}

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const [globalSearch, setGlobalSearch] = useState("")
  const [savedQuerySearch, setSavedQuerySearch] = useState("")
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! Ask me about campaigns, trends, or evidence." },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const [savedQueries, setSavedQueries] = useState([
    { id: "q1", title: "Campaign effectiveness comparison", lastAccessed: now(), payload: [] },
    { id: "q2", title: "Disinformation trends Q3 2023", lastAccessed: now(), payload: [] },
  ])
  const [recent, setRecent] = useState([
    { id: "r1", title: "Misinformation detection strategies", started: now(), messages: [] },
    { id: "r2", title: "Campaign performance metrics", started: now(), messages: [] },
  ])

  const chatEndRef = useRef(null)
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  const filteredSaved = useMemo(() => {
    if (!savedQuerySearch.trim()) return savedQueries
    return savedQueries.filter((s) => s.title.toLowerCase().includes(savedQuerySearch.toLowerCase()))
  }, [savedQuerySearch, savedQueries])

  const sendPrompt = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setMessages((m) => [...m, { role: "user", content: prompt }])
    setInput("")
    setLoading(true)
    try {
      const reply = await fakeLLMReply(prompt)
      setMessages((m) => [...m, { role: "assistant", content: reply }])
    } finally { setLoading(false) }
  }
  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt() } }
  const saveConversation = () => {
    if (messages.length <= 1) return
    const title = messages.find((m) => m.role === "user")?.content?.slice(0, 48) || "Conversation"
    setSavedQueries((s) => [{ id: crypto.randomUUID(), title, lastAccessed: now(), payload: messages }, ...s])
  }
  const clearChat = () => setMessages([{ role: "assistant", content: "Chat cleared. Start a new query." }])
  const openSaved = (item) =>
    setMessages(item.payload?.length ? item.payload : [{ role: "assistant", content: `Loaded: **${item.title}**.` }])
  const openRecent = (item) =>
    setMessages(item.messages?.length ? item.messages : [{ role: "assistant", content: `Resuming: **${item.title}**.` }])

  return (
    // change overflow if you prefer page scroll: overflow-auto
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b bg-white px-5 py-10 mt-4">
        {/* Left: Project name + search */}
        <div className="flex items-center gap-6 w-[48%]">
          <div className="text-2xl font-bold text-purple-700 whitespace-nowrap">
            Project Sentinel
          </div>
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search campaigns, alerts, or evidence…"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-4 focus:ring-purple-200"
          />
        </div>

        {/* Right: Ask AI + user account */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => document.getElementById("promptBox")?.focus()}
            className="rounded-xl bg-purple-500 px-6 py-3 text-base font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            Ask AI
          </button>
          <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-purple-200" />
            <div className="leading-tight">
              <div className="text-base font-semibold">Emma Chen</div>
              <div className="text-sm text-gray-500">Senior Analyst</div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT GRID — min-h-0 lets children scroll */}
      <div className="grid h-[calc(100vh-64px)] min-h-0 grid-cols-[240px_300px_1fr] gap-4 p-4">
        {/* Left nav */}
        <nav className="flex min-h-0 flex-col gap-2 rounded-2xl border bg-white p-3">
          <div className="text-xs font-semibold text-gray-500 px-1 mb-1">Navigation</div>
          <SidebarLink to="/dashboard">Dashboard</SidebarLink>
          <SidebarLink to="/archive">Campaigns Archive</SidebarLink>
          <SidebarLink to="/analytics">Analytics & Trends</SidebarLink>
          <SidebarLink to="/assistant" active>AI Assistant</SidebarLink>
          <SidebarLink to="/settings">Settings</SidebarLink>
          <SidebarLink to="/logout">Logout</SidebarLink>
          <div className="mt-auto">
            <button
              className="w-full rounded-xl bg-purple-100 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-200"
              onClick={() => navigate("/help")}
            >
              Get Help
            </button>
          </div>
        </nav>

        {/* Saved queries + recent — overflow-hidden around inner scrollers */}
        <aside className="flex min-h-0 flex-col gap-3 rounded-2xl border bg-white p-3 overflow-hidden">
          <div className="text-xs font-semibold text-gray-500 px-1">Saved Queries</div>
          <input
            value={savedQuerySearch}
            onChange={(e) => setSavedQuerySearch(e.target.value)}
            placeholder="Search saved queries"
            className="mb-2 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
          />
          {/* scrollable list */}
          <div className="flex-1 min-h-0 space-y-2 overflow-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredSaved.map((s) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <SavedQueryItem title={s.title} lastAccessed={s.lastAccessed} onClick={() => openSaved(s)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-2 border-t pt-3 min-h-0">
            <div className="text-xs font-semibold text-gray-500 px-1 mb-2">Recent Conversations</div>
            <div className="space-y-2 max-h-48 overflow-auto pr-1">
              {recent.map((r) => (
                <RecentItem key={r.id} title={r.title} started={r.started} onClick={() => openRecent(r)} />
              ))}
            </div>
          </div>
        </aside>

        {/* Chat column — critical: min-h-0 + inner flex-1 min-h-0 overflow-auto */}
        <section className="flex min-h-0 flex-col rounded-2xl border bg-white">
          {/* actions */}
          <div className="flex items-center justify-end gap-2 border-b p-3">
            <button
              onClick={saveConversation}
              className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Save Conversation
            </button>
            <button
              onClick={clearChat}
              className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Clear Chat
            </button>
          </div>

          {/* messages scroller */}
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} />
              ))}
              {loading && (
                <div className="self-start rounded-xl bg-purple-50 px-4 py-2 text-sm text-purple-700 border border-purple-200">
                  Thinking…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* input */}
          <div className="border-t p-3">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <textarea
                id="promptBox"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your campaigns, data analysis, or misinformation trends…"
                className="min-h-[44px] max-h-40 flex-1 resize-y rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
              />
              <button
                onClick={sendPrompt}
                disabled={loading || !input.trim()}
                className="h-[44px] shrink-0 rounded-xl bg-purple-500 px-4 text-sm font-semibold text-white hover:bg-purple-600 active:scale-[0.98] disabled:opacity-60"
              >
                Submit
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
