// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

// Pages
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import DashboardPage from "@/pages/DashboardPage"
import AIAssistantPage from "@/pages/AIAssistantPage"
import CampaignDetailsPage from "@/pages/CampaignDetailsPage"

// Optional: only include if you really made this component
// If not, comment this out and remove <ErrorOverlay>
import ErrorOverlay from "@/components/ErrorOverlay"

export default function App() {
  return (
    <BrowserRouter>
      {/* If ErrorOverlay exists, keep it. Otherwise, remove it. */}
      <ErrorOverlay>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* App routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AIAssistantPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorOverlay>
    </BrowserRouter>
  )
}
