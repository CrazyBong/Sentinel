// eslint-disable-next-line no-unused-vars
import { useState } from "react" 
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import { Suspense } from "react"
// eslint-disable-next-line no-unused-vars
import { useNavigate } from "react-router-dom"
import LoginForm from "@/components/LoginForm"
import Logo from "@/assets/logo.png"
import Pinn from "@/assets/pur1.jpeg"

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="h-screen flex">
      {/* Left side (image) — hidden on mobile, 65% on md+ */}
      <motion.div
        className="hidden md:flex md:basis-[65%] items-center justify-center relative bg-gray-100"
        style={{
          backgroundImage: `url(${Pinn})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        role="img"
        aria-label="Decorative background"
      >
        <img
          src={Logo}
          alt="Project Sentinel logo"
          className="h-[600px] w-[600px] object-contain drop-shadow-xl"
          loading="eager"
          priority="high"
        />
      </motion.div>

      {/* Right side (form) — full width on mobile, 35% on md+ */}
      <div className="flex basis-full md:basis-[35%] items-center justify-center p-6 bg-gray-50">
        <Suspense fallback={<LoadingFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
