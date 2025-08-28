// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

// Pages
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import DashboardPage from "@/pages/DashboardPage"
import AIAssistantPage from "@/pages/AIAssistantPage"
import CampaignDetailsPage from "@/pages/CampaignDetailsPage"
import CampaignsArchivePage from "@/pages/CampaignsArchivePage"
import AnalyticsTrendsPage from "@/pages/AnalyticsTrendsPage"
import SettingsPage from "@/pages/SettingsPage"

// Minimal no-op boundary so the app never breaks if you don't have a custom one
function ErrorOverlay({ children }) {
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorOverlay>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* App routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AIAssistantPage />} />
          <Route path="/archive" element={<CampaignsArchivePage />} />
          <Route path="/analytics" element={<AnalyticsTrendsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorOverlay>
    </BrowserRouter>
  )
}
