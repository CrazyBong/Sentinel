// src/context/UserContext.jsx
import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"

const UserContext = createContext()

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/auth/me')
      
      if (response.data.success && response.data.data.user) {
        const apiUser = response.data.data.user
        setUser({
          name: apiUser.username,
          email: apiUser.email
        })
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <UserContext.Provider value={{ user, loading }}>
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