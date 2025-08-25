import React from "react"

export const Input = React.forwardRef(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={
        "w-full rounded-xl border border-gray-300 px-3 py-2 outline-none " +
        "focus:ring-4 focus:ring-purple-200 " +
        className
      }
      {...props}
    />
  )
)
Input.displayName = "Input"
