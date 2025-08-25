import { motion } from "framer-motion"
import LoginForm from "@/components/LoginForm"
import Logo from "@/assets/logo.png"
import Pinn from "@/assets/pur1.jpeg"

export default function LoginPage() {
  return (
    <div className="h-screen flex">
      {/* Left side 65% */}
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
        {/* Centered enlarged logo */}
        <img
          src={Logo}
          alt="Logo"
          className="h-[600px] w-[600px] object-contain drop-shadow-xl"
        />
      </motion.div>

      {/* Right side 35% */}
      <div className="flex basis-[35%] items-center justify-center p-6 bg-gray-50">
        <LoginForm />
      </div>
    </div>
  )
}
