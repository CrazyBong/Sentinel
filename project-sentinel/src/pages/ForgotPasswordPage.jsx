// src/pages/ForgotPasswordPage.jsx
import { motion } from "framer-motion"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1) // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const navigate = useNavigate()

  const handleSendResetCode = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // TODO: Replace with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess("Reset code sent to your email!")
      setStep(2)
    } catch (err) {
      setError(err.message || "Failed to send reset code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // TODO: Replace with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setStep(3)
    } catch (err) {
      setError(err.message || "Invalid reset code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      // TODO: Replace with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess("Password reset successfully! Redirecting to login...")
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <motion.form
      onSubmit={handleSendResetCode}
      className="space-y-5 w-full max-w-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
        Forgot Password
      </h2>
      <p className="text-gray-600 text-center mb-6">
        Enter your email address and we'll send you a reset code.
      </p>

      {error && (
        <div className="p-3 text-red-500 bg-red-50 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="email" className="text-xl font-medium text-gray-700">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-lg h-14"
          autoComplete="email"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-xl h-14 mt-6"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Reset Code"}
      </Button>

      <div className="text-center mt-6">
        <Link to="/login" className="text-purple-500 hover:underline text-lg">
          Back to Login
        </Link>
      </div>
    </motion.form>
  )

  const renderStep2 = () => (
    <motion.form
      onSubmit={handleVerifyCode}
      className="space-y-5 w-full max-w-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
        Enter Reset Code
      </h2>
      <p className="text-gray-600 text-center mb-6">
        We've sent a 6-digit code to {email}
      </p>

      {success && (
        <div className="p-3 text-green-500 bg-green-50 rounded-lg text-sm" role="alert">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 text-red-500 bg-red-50 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="code" className="text-xl font-medium text-gray-700">
          Reset Code
        </label>
        <Input
          id="code"
          type="text"
          placeholder="Enter 6-digit code"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value)}
          required
          className="text-lg h-14 text-center tracking-widest"
          maxLength={6}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-xl h-14 mt-6"
        disabled={loading || resetCode.length !== 6}
      >
        {loading ? "Verifying..." : "Verify Code"}
      </Button>

      <div className="text-center mt-6 space-y-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-purple-500 hover:underline text-lg block"
        >
          Use different email
        </button>
        <Link to="/login" className="text-purple-500 hover:underline text-lg block">
          Back to Login
        </Link>
      </div>
    </motion.form>
  )

  const renderStep3 = () => (
    <motion.form
      onSubmit={handleResetPassword}
      className="space-y-5 w-full max-w-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
        Set New Password
      </h2>
      <p className="text-gray-600 text-center mb-6">
        Create a new password for your account
      </p>

      {error && (
        <div className="p-3 text-red-500 bg-red-50 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-green-500 bg-green-50 rounded-lg text-sm" role="alert">
          {success}
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="newPassword" className="text-xl font-medium text-gray-700">
          New Password
        </label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="text-lg h-14"
          autoComplete="new-password"
        />
        <p className="text-sm text-gray-500">
          Password must be at least 8 characters long
        </p>
      </div>

      <div className="space-y-3">
        <label htmlFor="confirmPassword" className="text-xl font-medium text-gray-700">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="text-lg h-14"
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-xl h-14 mt-6"
        disabled={loading || !newPassword || !confirmPassword}
      >
        {loading ? "Resetting..." : "Reset Password"}
      </Button>

      <div className="text-center mt-6">
        <Link to="/login" className="text-purple-500 hover:underline text-lg">
          Back to Login
        </Link>
      </div>
    </motion.form>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  )
}
