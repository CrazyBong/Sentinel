import { useState } from "react"
import Sidebar from "@/components/ui/Sidebar"

export default function SettingsPage() {
  const [name, setName] = useState("Emma Chen")
  const [email, setEmail] = useState("emma.chen@example.com")
  const [phone, setPhone] = useState("+1 555 123 4567")
  const [photo, setPhoto] = useState(null)
  const [notifications, setNotifications] = useState(true)
  const [theme, setTheme] = useState("light")

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(URL.createObjectURL(file)) // show preview
    }
  }

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Shared Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b bg-white px-5 py-4">
          <h1 className="text-2xl font-bold text-purple-700">Settings</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Profile Section */}
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile</h2>
              <div className="space-y-4">
                {/* Upload Photo */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-sm">No Photo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-sm text-gray-600"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Notifications</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={() => setNotifications(!notifications)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Enable email notifications
              </label>
            </section>

            {/* Theme Section */}
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Appearance</h2>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </section>

            {/* About Section */}
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">About</h2>
              <div className="text-sm text-gray-700 space-y-2">
                <p><span className="font-medium">Application:</span> Sentinel</p>
                <p><span className="font-medium">Company:</span> Vortex Technologies</p>
                <p><span className="font-medium">Version:</span> v1.0.0</p>
                <p>
                  Sentinel is an AI-powered platform designed to monitor campaigns,
                  detect disinformation, and provide actionable insights for analysts.
                </p>
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
              <button className="rounded-lg bg-purple-600 px-5 py-2 text-white font-medium hover:bg-purple-700">
                Save Changes
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
