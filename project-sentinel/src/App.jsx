// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import DashboardPage from "@/pages/DashboardPage"
import AIAssistantPage from "@/pages/AIAssistantPage"
import ErrorOverlay from "@/components/ErrorOverlay"

export default function App() {
  return (
    <BrowserRouter>
      <ErrorOverlay>
        <Routes>
          {/* public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* app */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assistant" element={<AIAssistantPage />} />

          {/* redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorOverlay>
    </BrowserRouter>
  )
}
