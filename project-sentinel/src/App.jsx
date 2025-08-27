// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import DashboardPage from "@/pages/DashboardPage"
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import AIAssistantPage from "@/pages/AIAssistantPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/assistant" element={<AIAssistantPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* optional: /alerts, /campaigns/:id, /campaigns/new */}
      </Routes>
    </BrowserRouter>
  )
}
