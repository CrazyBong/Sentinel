// eslint-disable-next-line no-unused-vars
import { useState } from "react"
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import LoginForm from "@/components/LoginForm"
import Logo from "@/assets/logo.png"
import Pinn from "@/assets/pur1.jpeg"


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
          {/* Inputs here (email, username, etc.) */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-purple-500 px-4 py-2 font-semibold text-white hover:bg-purple-600 active:scale-[0.98]"
          >
            Sign Up
          </button>
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