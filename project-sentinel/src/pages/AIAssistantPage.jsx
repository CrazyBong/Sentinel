/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { GoogleGenerativeAI } from "@google/generative-ai"
import Sidebar from "@/components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"

// ✅ Initialize Gemini AI
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE"
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// ✅ System prompt for Indian Election Security context
const SYSTEM_PROMPT = `You are SentinelAI, an advanced AI assistant specialized in election security and misinformation detection for Indian elections. 

CONTEXT: You work for Project Sentinel, monitoring the 2024 Lok Sabha elections across social media platforms like Twitter/X, Facebook, and Reddit.

KEY AREAS OF EXPERTISE:
- Indian election security (EVM tampering, booth capturing, voter fraud)
- Misinformation detection in Hindi and English
- Social media analysis (Twitter/X, WhatsApp, Facebook, Reddit)
- Campaign monitoring and threat assessment
- Communal tension analysis
- Political disinformation patterns in India

CURRENT CAMPAIGNS:
1. "2024 Lok Sabha Election Security Monitoring" - 352 tweets collected, monitoring EVM hacking claims
2. "Election Misinformation Monitoring" - Active across X, Reddit, Facebook
3. Several paused campaigns monitoring historical elections

INSTRUCTIONS:
- Provide actionable insights for election security analysts
- Reference real Indian political context (BJP, Congress, AAP, regional parties)
- Mention specific Indian states/constituencies when relevant
- Use security/intelligence terminology
- Be concise but comprehensive
- Always maintain objectivity and professional tone

Format responses clearly with bullet points, numbered lists, or sections when appropriate.`

const now = () => new Date().toLocaleString()

// ✅ Real Gemini API call
const callGeminiAPI = async (prompt, conversationHistory = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })
    
    // Build conversation context
    let fullPrompt = SYSTEM_PROMPT + "\n\n"
    
    // Add conversation history for context
    if (conversationHistory.length > 1) {
      fullPrompt += "PREVIOUS CONVERSATION:\n"
      conversationHistory.slice(-6).forEach(msg => { // Last 6 messages for context
        if (msg.role === "user") {
          fullPrompt += `USER: ${msg.content}\n`
        } else if (msg.role === "assistant") {
          fullPrompt += `ASSISTANT: ${msg.content}\n`
        }
      })
      fullPrompt += "\n"
    }
    
    fullPrompt += `USER QUERY: ${prompt}\n\nProvide a helpful response as SentinelAI:`
    
    console.log('🤖 Sending to Gemini:', { prompt: prompt.slice(0, 100) + '...' })
    
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()
    
    console.log('✅ Gemini response received:', text.slice(0, 100) + '...')
    return text
    
  } catch (error) {
    console.error('❌ Gemini API error:', error)
    
    // ✅ Fallback responses for different error types
    if (error.message?.includes('API_KEY')) {
      return `🔑 **API Key Error**: Please add your Gemini API key to the environment variables as \`VITE_GEMINI_API_KEY\`.

To get your API key:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your \`.env\` file: \`VITE_GEMINI_API_KEY=your_key_here\`

**Demo Response for "${prompt.slice(0, 50)}...":**

Based on our 2024 Lok Sabha Election Security Monitoring campaign, here's what I can tell you:

📊 **Current Threat Landscape:**
• EVM tampering claims spreading across UP, Maharashtra, West Bengal
• Coordinated bot networks amplifying "election rigged" narratives
• Deep fake videos of political leaders detected on social platforms

🎯 **Recommended Actions:**
• Increase monitoring of Hindi/English keywords: "EVM hack", "booth capture", "voting fraud"
• Focus on WhatsApp group infiltration in key battleground states
• Deploy real-time fact-checking for viral election content

Would you like me to elaborate on any specific aspect of election security monitoring?`
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return `⚠️ **API Quota Exceeded**: The Gemini API quota has been reached. 

**Demo Response for "${prompt.slice(0, 50)}...":**

I'm analyzing this through our Project Sentinel intelligence framework...

🔍 **Analysis Results:**
Based on our monitoring of 6 active campaigns across Indian social media:

• **High Priority**: Monitor EVM-related misinformation in UP, Bihar
• **Medium Priority**: Track communal tension narratives in West Bengal  
• **Active Threats**: 352 suspicious posts detected in Lok Sabha monitoring

📈 **Trending Patterns:**
• "Election Commission corrupt" narratives up 23%
• Cross-platform coordination between X and WhatsApp
• AI-generated content detected in 30% of flagged posts

Please upgrade your API plan or try again later for real-time analysis.`
    }
    
    // Generic fallback
    return `🤖 **Connection Error**: Unable to reach Gemini AI servers.

**Demo Analysis for "${prompt.slice(0, 50)}...":**

As SentinelAI, I'm processing this query through our election security lens...

🚨 **Key Insights:**
• Our 2024 Lok Sabha monitoring shows increased activity in swing states
• Pattern recognition suggests coordinated disinformation campaigns
• Recommend immediate escalation of suspicious EVM-related content

🎯 **Next Steps:**
1. Deploy enhanced keyword monitoring for Hindi content
2. Increase human analyst verification for high-severity alerts
3. Coordinate with Election Commission for rapid response

*Note: This is a demo response. Please check your API configuration for real-time analysis.*`
  }
}

const cx = (...c) => c.filter(Boolean).join(" ")

// ✅ Enhanced UI components
function SavedQueryItem({ title, lastAccessed, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-purple-200 bg-white px-3 py-2 hover:bg-purple-50 transition-colors shadow-sm"
    >
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="text-xs text-gray-500">Last accessed: {lastAccessed}</div>
    </button>
  )
}

function RecentItem({ title, started, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-purple-200 bg-white px-3 py-2 hover:bg-purple-50 transition-colors shadow-sm"
    >
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="text-xs text-gray-500">Started: {started}</div>
    </button>
  )
}

function ChatMessage({ role, content, isLoading = false }) {
  const isUser = role === "user"
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "rounded-2xl px-4 py-3 shadow-sm border max-w-[85%]",
        isUser ? "self-end bg-white border-purple-200" : "self-start bg-purple-50 border-purple-200"
      )}
    >
      <div className={cx("text-xs mb-2 flex items-center gap-2", isUser ? "text-purple-600" : "text-purple-700")}>
        <span>{isUser ? "You" : "🤖 SentinelAI"}</span>
        {isLoading && (
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
        {content}
      </div>
    </motion.div>
  )
}

// ✅ Quick action buttons for Indian election context
function QuickActions({ onActionClick }) {
  const actions = [
    "Analyze EVM tampering claims in UP",
    "Check communal tension trends in West Bengal", 
    "Monitor booth capturing videos in Bihar",
    "Detect deep fake politician speeches",
    "Track election fraud keywords trending",
    "Assess social media coordination patterns"
  ]
  
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-purple-600 mb-2">🇮🇳 Quick Analysis</div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onActionClick(action)}
            className="text-xs px-3 py-1.5 rounded-full border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const [globalSearch, setGlobalSearch] = useState("")
  const [savedQuerySearch, setSavedQuerySearch] = useState("")
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "🤖 **SentinelAI** ready for election security analysis!\n\nI'm monitoring 6 campaigns including our active **2024 Lok Sabha Election Security** operation. Ask me about:\n\n• 🚨 Threat analysis & misinformation detection\n• 📊 Campaign performance metrics\n• 🔍 Social media pattern recognition\n• 🇮🇳 Indian election security insights\n\nWhat would you like to analyze?" 
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  // ✅ Enhanced default saved queries for Indian elections
  const [savedQueries, setSavedQueries] = useState([
    { 
      id: "q1", 
      title: "EVM Security Assessment Report", 
      lastAccessed: now(), 
      payload: [
        { role: "user", content: "Generate a security assessment for EVM tampering claims" },
        { role: "assistant", content: "Based on our monitoring of 352 posts in the Lok Sabha campaign, here's the EVM security assessment..." }
      ] 
    },
    { 
      id: "q2", 
      title: "Misinformation Trends Q3 2024", 
      lastAccessed: now(), 
      payload: [
        { role: "user", content: "Show me trending misinformation patterns in Indian elections" },
        { role: "assistant", content: "Analysis of current disinformation campaigns across Twitter, WhatsApp, and Facebook..." }
      ] 
    },
    {
      id: "q3",
      title: "Booth Capturing Verification Protocol",
      lastAccessed: now(),
      payload: []
    }
  ])

  const [recent, setRecent] = useState([
    { id: "r1", title: "Deep fake detection in political ads", started: now(), messages: [] },
    { id: "r2", title: "WhatsApp group infiltration strategy", started: now(), messages: [] },
  ])

  const chatEndRef = useRef(null)
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const filteredSaved = useMemo(() => {
    if (!savedQuerySearch.trim()) return savedQueries
    return savedQueries.filter((s) =>
      s.title.toLowerCase().includes(savedQuerySearch.toLowerCase())
    )
  }, [savedQuerySearch, savedQueries])

  // ✅ Real AI integration
  const sendPrompt = async (customPrompt = null) => {
    const prompt = customPrompt || input.trim()
    if (!prompt || loading) return
    
    const userMessage = { role: "user", content: prompt }
    setMessages((m) => [...m, userMessage])
    setInput("")
    setLoading(true)
    
    try {
      console.log('🤖 Sending query to Gemini AI...', prompt.slice(0, 50))
      
      // ✅ Pass conversation history for context
      const reply = await callGeminiAPI(prompt, messages)
      
      const assistantMessage = { role: "assistant", content: reply }
      setMessages((m) => [...m, assistantMessage])
      
      // ✅ Save to recent conversations
      setRecent((prev) => [
        {
          id: crypto.randomUUID(),
          title: prompt.slice(0, 48) + (prompt.length > 48 ? "..." : ""),
          started: now(),
          messages: [...messages, userMessage, assistantMessage],
        },
        ...prev.slice(0, 9), // Keep only 10 most recent
      ])
      
    } catch (error) {
      console.error('❌ AI Assistant error:', error)
      setMessages((m) => [...m, { 
        role: "assistant", 
        content: "⚠️ I encountered an error processing your request. Please check the API configuration and try again." 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendPrompt()
    }
  }

  const saveConversation = () => {
    if (messages.length <= 1) return
    const title = messages.find((m) => m.role === "user")?.content?.slice(0, 48) || "New Analysis"
    setSavedQueries((s) => [
      { id: crypto.randomUUID(), title, lastAccessed: now(), payload: messages },
      ...s,
    ])
  }

  const clearChat = () => {
    setMessages([{ 
      role: "assistant", 
      content: "🤖 **Chat cleared!** SentinelAI ready for new election security analysis.\n\nCurrent monitoring status:\n• 6 active campaigns\n• 352 posts analyzed\n• Real-time threat detection enabled\n\nHow can I assist with your analysis?" 
    }])
  }

  const openSaved = (item) => {
    setMessages(
      item.payload?.length
        ? item.payload
        : [{ role: "assistant", content: `📂 **Loaded Analysis**: ${item.title}\n\nThis saved analysis contains insights about election security monitoring. What would you like to explore further?` }]
    )
  }

  const openRecent = (item) => {
    setMessages(
      item.messages?.length
        ? item.messages
        : [{ role: "assistant", content: `🔄 **Resuming Analysis**: ${item.title}\n\nContinuing our previous discussion about election security monitoring...` }]
    )
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b bg-white px-6 py-4">
        <div className="flex items-center gap-6 w-[48%]">
          <div className="text-xl font-bold text-purple-700 whitespace-nowrap">
            Project Sentinel
          </div>
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search campaigns, alerts, or evidence…"
            className="w-full text-left rounded-lg border border-purple-200 bg-white px-3 py-2 hover:bg-purple-50 transition-colors shadow-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => document.getElementById("promptBox")?.focus()}
            className="rounded-xl bg-purple-500 px-6 py-3 text-base font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            Ask AI
          </button>
          <AccountButton />
        </div>      
      </header>

      {/* Layout matches Analytics */}
      <div className="row-start-2 flex h-[calc(100vh-96px)] mt-4">
        {/* Left nav */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 min-h-0 p-6 overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-[300px_1fr] gap-4">
            
            {/* Saved queries + recent */}
            <aside className="flex min-h-0 flex-col gap-4 rounded-lg border bg-white p-4 shadow-md overflow-hidden">
              <div className="text-xs font-semibold text-purple-600 px-1">🤖 SentinelAI Workspace</div>
              
              {/* API Status indicator */}
              <div className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                {GEMINI_API_KEY.startsWith('YOUR_') ? '🔑 Configure API Key' : '✅ AI Ready'}
              </div>
              
              <input
                value={savedQuerySearch}
                onChange={(e) => setSavedQuerySearch(e.target.value)}
                placeholder="Search saved queries"
                className="mb-2 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-200"
              />
              
              <div className="flex-1 min-h-0 space-y-2 overflow-auto pr-1">
                <div className="text-xs font-medium text-gray-600 mb-2">Saved Analysis</div>
                <AnimatePresence initial={false}>
                  {filteredSaved.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <SavedQueryItem
                        title={s.title}
                        lastAccessed={s.lastAccessed}
                        onClick={() => openSaved(s)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-2 border-t pt-3 min-h-0">
                <div className="text-xs font-medium text-gray-600 px-1 mb-2">
                  Recent Conversations
                </div>
                <div className="space-y-2 max-h-48 overflow-auto pr-1">
                  {recent.map((r) => (
                    <RecentItem
                      key={r.id}
                      title={r.title}
                      started={r.started}
                      onClick={() => openRecent(r)}
                    />
                  ))}
                </div>
              </div>
            </aside>

            {/* Chat column */}
            <section className="flex min-h-0 flex-col rounded-lg border bg-white shadow-md">
              <div className="flex items-center justify-between border-b p-3">
                <div className="text-sm font-semibold text-gray-900">🤖 SentinelAI • Election Security Assistant</div>
                <div className="flex gap-2">
                  <button
                    onClick={saveConversation}
                    className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    Save Analysis
                  </button>
                  <button
                    onClick={clearChat}
                    className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Clear Chat
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-4">
                <div className="mx-auto flex max-w-4xl flex-col gap-4">
                  {/* Quick actions at the top */}
                  {messages.length <= 1 && (
                    <QuickActions onActionClick={sendPrompt} />
                  )}
                  
                  {messages.map((m, i) => (
                    <ChatMessage key={i} role={m.role} content={m.content} />
                  ))}
                  
                  {loading && (
                    <ChatMessage 
                      role="assistant" 
                      content="Analyzing election security data..." 
                      isLoading={true}
                    />
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="border-t p-3">
                <div className="mx-auto flex max-w-4xl items-end gap-3">
                  <textarea
                    id="promptBox"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask SentinelAI about election security, misinformation detection, campaign analysis, or threat assessment..."
                    className="min-h-[44px] max-h-40 flex-1 resize-y rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 text-sm"
                    rows={1}
                  />
                  <button
                    onClick={() => sendPrompt()}
                    disabled={loading || !input.trim()}
                    className="h-[44px] shrink-0 rounded-xl bg-purple-500 px-6 text-sm font-semibold text-white hover:bg-purple-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "..." : "Ask AI"}
                  </button>
                </div>
                
                {/* Helpful tips */}
                <div className="mx-auto max-w-4xl mt-2 text-xs text-gray-500">
                  💡 Try: "Analyze EVM claims", "Check threat patterns", "Generate security report"
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}