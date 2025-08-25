import React from "react"

export const Button = React.forwardRef(
  ({ className = "", variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-2xl px-4 py-2 font-semibold " +
      "transition active:scale-[0.98] disabled:opacity-60"
    const variants = {
      default: "bg-purple-500 text-white hover:bg-purple-600",
      outline:
        "border border-gray-300 text-gray-900 bg-white hover:bg-gray-50",
    }
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant] || variants.default} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
