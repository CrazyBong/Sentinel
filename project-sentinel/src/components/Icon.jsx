// src/components/Icons.jsx
export function XIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M18 2H21L13.5 10.5L22.5 22H15L10 15.5L4.5 22H1.5L9.5 13L1 2H8L12.5 8L18 2Z" />
    </svg>
  )
}

export function RedditIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M14.5 3.5a1 1 0 0 1 1 1v1.1a7.5 7.5 0 0 1 3.9 2.2l.9-.4a1.5 1.5 0 1 1 1 2.8c-.3 0-.6-.1-.8-.3l-1 .5c.3.7.5 1.5.5 2.3 0 3.7-3.8 6.8-8.5 6.8S3.5 17.3 3.5 13.6c0-.8.2-1.6.5-2.3l-1-.5a1.5 1.5 0 1 1 0-2.5l1 .4A7.5 7.5 0 0 1 8 5.6V4.5a1 1 0 1 1 2 0v.8c.5-.1 1-.1 1.5-.1.5 0 1 0 1.5.1V4.5a1 1 0 0 1 1-1ZM9 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-3 5.2c1.4 0 2.6-.5 3.3-1.2a.75.75 0 0 0-1-1.1c-.5.5-1.3.8-2.3.8s-1.8-.3-2.3-.8a.75.75 0 1 0-1 1.1c.7.7 1.9 1.2 3.3 1.2Z"/>
    </svg>
  )
}
