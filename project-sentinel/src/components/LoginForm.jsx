// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // TODO: Replace with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      localStorage.setItem("authToken", "dummy-token")
      navigate("/dashboard")
    } catch (err) {
      setError(err.message || "Failed to login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5 w-full max-w-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      aria-label="Login form"
    >
      <h2 className="text-5xl font-bold text-center text-gray-900 mb-12">
        Welcome Back
      </h2>

      {error && (
        <div
          className="p-3 text-red-500 bg-red-50 rounded-lg text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label
          htmlFor="email"
          className="text-2xl font-medium text-gray-700"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-xl h-16 mt-3 text-2xl"
          aria-label="Email address"
          autoComplete="email"
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="password"
          className="text-2xl font-medium text-gray-700"
        >
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="text-xl h-16 mt-3 text-2xl"
          aria-label="Password"
          autoComplete="current-password"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-2xl h-16 mt-6"
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </Button>

      <div className="flex justify-between mt-6">
        <Link
          to="/forgot-password"
          className="text-purple-500 hover:underline text-xl"
        >
          Forgot Password?
        </Link>
        <Link to="/signup" className="text-purple-500 hover:underline text-xl">
          New user? Sign Up
        </Link>
      </div>
    </motion.form>
  )
}