// src/components/AccountButton.jsx
import { useNavigate } from "react-router-dom"
import { useUser } from "@/context/UserContext"

export default function AccountButton({ className = "" }) {
  const navigate = useNavigate()
  const { user } = useUser()

  // ✅ Provide fallback data if user is null/undefined
  const userData = user || {
    name: "Analyst",
    jobTitle: "Security Analyst", 
    photo: null
  }

  return (
    <button
      onClick={() => navigate("/settings")}
      className={`flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-gray-50 rounded-lg transition-colors ${className}`}
      title="Account Settings"
    >
      <div className="h-7 w-7 rounded-full bg-purple-200 flex items-center justify-center">
        {userData.photo ? (
          <img src={userData.photo} alt="Profile" className="h-full w-full object-cover rounded-full" />
        ) : (
          <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
      <div className="leading-tight text-left">
        <div className="text-sm font-semibold">{userData.name}</div>
        <div className="text-xs text-gray-500">{userData.jobTitle}</div>
      </div>
    </button>
  )
}
