// src/pages/HelpPage.jsx
import { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import Sidebar from "@/components/ui/Sidebar"
import AccountButton from "@/components/AccountButton"
import { Button } from "@/components/ui/button"

export default function HelpPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState("getting-started")
  const [expandedFaq, setExpandedFaq] = useState(null)

  const helpSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: "🚀",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Welcome to Sentinel!</h3>
            <p className="text-blue-700 text-sm">
              Sentinel is an AI-powered platform designed to monitor campaigns, detect disinformation, 
              and provide actionable insights for analysts. This guide will help you navigate and use all features effectively.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Start Guide</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <h4 className="font-medium text-gray-800">Complete Your Profile</h4>
                  <p className="text-gray-600 text-sm">Go to Settings to upload your profile picture and update your information.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <h4 className="font-medium text-gray-800">Explore the Dashboard</h4>
                  <p className="text-gray-600 text-sm">Start with the Dashboard to get an overview of your campaigns and metrics.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <h4 className="font-medium text-gray-800">Use AI Assistant</h4>
                  <p className="text-gray-600 text-sm">Leverage the AI Assistant for campaign analysis and insights.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "navigation",
      title: "Navigation Guide",
      icon: "🧭",
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Main Navigation</h3>
            <div className="grid gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    📊
                  </div>
                  <h4 className="font-medium text-gray-800">Dashboard</h4>
                </div>
                <p className="text-gray-600 text-sm">Your main overview page showing key metrics, recent activity, and quick access to important features.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    🤖
                  </div>
                  <h4 className="font-medium text-gray-800">AI Assistant</h4>
                </div>
                <p className="text-gray-600 text-sm">Interactive AI tool for campaign analysis, threat detection, and generating insights.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    📈
                  </div>
                  <h4 className="font-medium text-gray-800">Analytics & Trends</h4>
                </div>
                <p className="text-gray-600 text-sm">Detailed analytics, trend analysis, and performance metrics for your campaigns.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    📁
                  </div>
                  <h4 className="font-medium text-gray-800">Campaigns Archive</h4>
                </div>
                <p className="text-gray-600 text-sm">Access to historical campaigns, completed analyses, and archived data.</p>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    ⚙️
                  </div>
                  <h4 className="font-medium text-gray-800">Settings</h4>
                </div>
                <p className="text-gray-600 text-sm">Manage your profile, preferences, notifications, and account settings.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "features",
      title: "Features Guide",
      icon: "✨",
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Features Explained</h3>
            
            <div className="space-y-6">
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-800 mb-2">Real-time Monitoring</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Monitor campaigns and social media activity in real-time with live updates and alerts.
                </p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600">
                    <strong>How to use:</strong> Navigate to the Dashboard to see live metrics and recent activity. 
                    Set up notifications in Settings to receive alerts for important events.
                  </p>
                </div>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-800 mb-2">AI-Powered Analysis</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Leverage artificial intelligence for automated threat detection and campaign analysis.
                </p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600">
                    <strong>How to use:</strong> Visit the AI Assistant page to interact with the AI. 
                    Ask questions about campaigns, request analysis, or get insights on specific topics.
                  </p>
                </div>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-gray-800 mb-2">Analytics & Reporting</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Generate comprehensive reports and analyze trends with detailed analytics.
                </p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600">
                    <strong>How to use:</strong> Go to Analytics & Trends to view detailed metrics, 
                    create custom reports, and analyze historical data patterns.
                  </p>
                </div>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-800 mb-2">Campaign Management</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Organize and manage multiple campaigns with detailed tracking and archiving.
                </p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600">
                    <strong>How to use:</strong> Access Campaigns Archive to view all campaigns, 
                    their status, and detailed information. Create new campaigns and track their progress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "faq",
      title: "Frequently Asked Questions",
      icon: "❓",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Common Questions</h3>
          
          {[
            {
              question: "How do I reset my password?",
              answer: "Go to the login page and click 'Forgot Password?'. Follow the steps to receive a reset code via email and create a new password."
            },
            {
              question: "How do I upload a profile picture?",
              answer: "Navigate to Settings → Profile Information. Click 'Upload Photo' and select an image file (JPG, PNG, or GIF, max 5MB)."
            },
            {
              question: "How do I enable notifications?",
              answer: "Go to Settings → Notifications & Preferences. Toggle the switches for Email Notifications, Email Alerts, and Push Notifications as needed."
            },
            {
              question: "How do I use the AI Assistant?",
              answer: "Visit the AI Assistant page and type your questions or requests in the chat interface. The AI can help with campaign analysis, threat detection, and generating insights."
            },
            {
              question: "How do I view campaign analytics?",
              answer: "Go to Analytics & Trends to see detailed metrics, charts, and performance data for your campaigns. You can filter by date range and specific campaigns."
            },
            {
              question: "How do I archive a campaign?",
              answer: "Navigate to Campaigns Archive and find the campaign you want to archive. Click on the campaign details and use the archive option."
            },
            {
              question: "How do I change the theme?",
              answer: "Go to Settings → Appearance & Language. Select your preferred theme from the dropdown (Light Mode, Dark Mode, or Auto)."
            },
            {
              question: "How do I export data?",
              answer: "Currently, data export features are being developed. Contact support for specific data export requests."
            }
          ].map((faq, index) => (
            <div key={index} className="border rounded-lg">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium text-gray-800">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-3">
                  <p className="text-gray-600 text-sm">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      id: "support",
      title: "Support & Contact",
      icon: "📞",
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Need Help?</h3>
            <p className="text-green-700 text-sm">
              Our support team is here to help you with any questions or issues you may have.
            </p>
          </div>
          
          <div className="grid gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  📧
                </div>
                <h4 className="font-medium text-gray-800">Email Support</h4>
              </div>
              <p className="text-gray-600 text-sm mb-2">Get help via email</p>
              <a href="mailto:support@sentinel.com" className="text-blue-600 text-sm hover:underline">
                support@sentinel.com
              </a>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  💬
                </div>
                <h4 className="font-medium text-gray-800">Live Chat</h4>
              </div>
              <p className="text-gray-600 text-sm mb-2">Chat with our support team</p>
              <Button variant="outline" size="sm" className="text-sm">
                Start Chat
              </Button>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  📚
                </div>
                <h4 className="font-medium text-gray-800">Documentation</h4>
              </div>
              <p className="text-gray-600 text-sm mb-2">Detailed technical documentation</p>
              <a href="#" className="text-purple-600 text-sm hover:underline">
                View Documentation
              </a>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  🎥
                </div>
                <h4 className="font-medium text-gray-800">Video Tutorials</h4>
              </div>
              <p className="text-gray-600 text-sm mb-2">Step-by-step video guides</p>
              <a href="#" className="text-orange-600 text-sm hover:underline">
                Watch Tutorials
              </a>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Response Times</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Email Support: Within 24 hours</p>
              <p>• Live Chat: Immediate response during business hours</p>
              <p>• Urgent Issues: Escalated within 4 hours</p>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Shared Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b bg-white px-5 py-4">
          <h1 className="text-2xl font-bold text-purple-700">Help & Support</h1>
          <AccountButton />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border shadow-sm p-4 sticky top-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Help Topics</h2>
                  <nav className="space-y-2">
                    {helpSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeSection === section.id
                            ? "bg-purple-100 text-purple-700 font-medium"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{section.icon}</span>
                          <span>{section.title}</span>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl border shadow-sm p-6"
                >
                  {helpSections.find(section => section.id === activeSection)?.content}
                </motion.div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
