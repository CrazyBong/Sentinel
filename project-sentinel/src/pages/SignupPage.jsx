// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import { useState } from "react"
import Logo from "@/assets/logo.png"
import Pinn from "@/assets/rust.jpeg"

export default function SignupPage() {
  // State for form fields
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    repassword: "",
    dob: "",
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Signup data:", formData)
    // TODO: hook with backend API
  }

  return (
    <div className="h-screen flex">
      {/* Left side (Signup Form) - 35% */}
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

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
            />
          </div>

          {/* Re-enter Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Re-enter Password</label>
            <input
              type="password"
              name="repassword"
              placeholder="Re-enter password"
              value={formData.repassword}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-purple-200"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-purple-500 px-4 py-2 font-semibold text-white transition hover:bg-purple-600 active:scale-[0.98]"
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

      {/* Right side (Background + Logo) - 65% */}
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
        {/* Enlarged logo */}
        <img
          src={Logo}
          alt="Logo"
          className="object-contain"
          style={{ width: "600px", height: "600px" }}
        />
      </motion.div>
    </div>
  )
}
