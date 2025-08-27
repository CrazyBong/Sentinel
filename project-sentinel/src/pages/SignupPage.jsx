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
    dob: "",
  })
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Signup data:", formData)
    // TODO: hook with backend API
    navigate("/dashboard")   // ✅ redirect after signup success
  }

  return (
    <div className="h-screen flex">
      {/* Left form */}
      <div className="flex basis-[35%] items-center justify-center p-8 bg-gray-50">
        <motion.form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Create Account
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                name="repassword"
                value={formData.repassword}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-200"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-purple-500 px-4 py-2 font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            Sign Up
          </button>

          {/* Redirect link */}
          <p className="text-sm text-center text-gray-600">
            Already have an account?{" "}
            <a href="/" className="text-purple-600 hover:underline">
              Login
            </a>
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
