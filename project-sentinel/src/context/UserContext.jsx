// src/context/UserContext.jsx
import { createContext, useContext, useState } from "react"

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    name: "Emma Chen",
    email: "emma.chen@example.com",
    phone: "+1 555 123 4567",
    jobTitle: "Senior Analyst",
    department: "Intelligence",
    bio: "Experienced analyst specializing in disinformation detection and campaign monitoring.",
    photo: null,
    notifications: true,
    emailAlerts: true,
    pushNotifications: false,
    theme: "light",
    language: "en",
    timezone: "UTC-5"
  })

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }))
  }

  const updateUserPhoto = (photoUrl) => {
    setUser(prev => ({ ...prev, photo: photoUrl }))
  }

  return (
    <UserContext.Provider value={{ user, updateUser, updateUserPhoto }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
