import { motion } from "framer-motion"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log({ email, password })
    // TODO: call API / handle auth
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5 w-full max-w-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-5xl font-bold text-center text-gray-900 mb-12">
        Welcome Back
      </h2>

      <div className="space-y-3">
        <label className="text-2xl font-medium text-gray-700">Email</label>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-xl h-16 mt-3 text-2xl"
        />
      </div>

      <div className="space-y-3">
        <label className="text-2xl font-medium text-gray-700">Password</label>
        <Input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="text-xl h-16 mt-3 text-2xl"
        />
      </div>

      <Button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-2xl h-16 mt-6">
        Login
      </Button>

      <div className="flex justify-between mt-6">
        <a href="/forgot-password" className="text-purple-500 hover:underline text-xl">
          Forgot Password?
        </a>
        <a href="/signup" className="text-purple-500 hover:underline text-xl">
          New user? Sign Up
        </a>
      </div>
    </motion.form>
  )
}
