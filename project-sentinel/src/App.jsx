// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import AIAssistantPage from "@/pages/AIAssistantPage"
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/assistant" element={<AIAssistantPage />} />
        {/* add other routes: /dashboard, /archive, /analytics, /settings, etc. */}
      </Routes>
    </BrowserRouter>
  )
}


