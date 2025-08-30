import { useState } from "react"
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import { useNavigate, Link } from "react-router-dom"
import Logo from "@/assets/logo.png"
import Pinn from "@/assets/rust.jpeg"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    repassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    
    // Password confirmation check
    if (formData.password !== formData.repassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      if (data.success) {
        // Store the token and user data
        localStorage.setItem("authToken", data.data.token)
        localStorage.setItem("userData", JSON.stringify(data.data.user))
        
        // Navigate to dashboard
        navigate("/dashboard")
      } else {
        throw new Error(data.message || 'Registration failed')
      }
    } catch (err) {
      setError(err.message || "Failed to register. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex">
      {/* Left form */}
      <div className="flex basis-[35%] items-center justify-center p-8 bg-gray-50">
        <motion.form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Create Account
          </h2>

          {error && (
            <div className="p-3 text-red-500 bg-red-50 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                placeholder="Enter your password"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Confirm Password</label>
              <input
                type="password"
                name="repassword"
                value={formData.repassword}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-purple-500 px-4 py-3 font-semibold text-white hover:bg-purple-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          {/* Redirect link */}
          <p className="text-sm text-center text-gray-600 mt-6">
            Already have an account?{" "}
            <Link to="/" className="text-purple-600 hover:underline font-medium">
              Login
            </Link>
          </p>
        </motion.form>
      </div>

      {/* Right background + logo */}
      <motion.div
        className="hidden md:flex basis-[65%] items-center justify-center relative"
        style={{
          backgroundImage: `url(${Pinn})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <img src={Logo} alt="Logo" className="object-contain" style={{ width: "600px", height: "600px" }} />
      </motion.div>
    </div>
  )
}