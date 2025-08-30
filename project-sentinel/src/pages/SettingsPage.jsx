import { useState, useRef, useEffect } from "react"
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"
import Sidebar from "@/components/ui/Sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/context/UserContext"

export default function SettingsPage() {
  const { user, updateUser, updateUserPhoto } = useUser()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone)
  const [jobTitle, setJobTitle] = useState(user.jobTitle)
  const [department, setDepartment] = useState(user.department)
  const [bio, setBio] = useState(user.bio)
  const [photo, setPhoto] = useState(user.photo)
  const [photoFile, setPhotoFile] = useState(null)
  const [notifications, setNotifications] = useState(user.notifications)
  const [emailAlerts, setEmailAlerts] = useState(user.emailAlerts)
  const [pushNotifications, setPushNotifications] = useState(user.pushNotifications)
  const [theme, setTheme] = useState(user.theme)
  const [language, setLanguage] = useState(user.language)
  const [timezone, setTimezone] = useState(user.timezone)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  // Update local state when user context changes
  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone)
    setJobTitle(user.jobTitle)
    setDepartment(user.department)
    setBio(user.bio)
    setPhoto(user.photo)
    setNotifications(user.notifications)
    setEmailAlerts(user.emailAlerts)
    setPushNotifications(user.pushNotifications)
    setTheme(user.theme)
    setLanguage(user.language)
    setTimezone(user.timezone)
  }, [user])

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file")
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB")
        return
      }
      
      setPhotoFile(file)
      setPhoto(URL.createObjectURL(file))
      setError("")
    }
  }

  const handleRemovePhoto = () => {
    setPhoto(null)
    setPhotoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError("")
    setSaved(false)

    try {
      // TODO: Replace with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Update user context with new settings
      updateUser({
        name,
        email,
        phone,
        jobTitle,
        department,
        bio,
        notifications,
        emailAlerts,
        pushNotifications,
        theme,
        language,
        timezone
      })

      // Update photo if changed
      if (photo && photo !== user.photo) {
        updateUserPhoto(photo)
      }
      
      // Simulate API call for saving settings
      console.log("Saving settings:", {
        name,
        email,
        phone,
        jobTitle,
        department,
        bio,
        photoFile,
        notifications,
        emailAlerts,
        pushNotifications,
        theme,
        language,
        timezone
      })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError("Failed to save settings. Please try again.")
    } finally {
      setLoading(false)
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-red-600 text-sm">{error}</p>
              </motion.div>
            )}

            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <p className="text-green-600 text-sm">Settings saved successfully!</p>
              </motion.div>
            )}

            {/* Profile Section */}
            <motion.section 
              className="rounded-xl border bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
              <div className="space-y-6">
                {/* Profile Photo */}
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border-2 border-gray-300">
                      {photo ? (
                        <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs">No Photo</span>
                        </div>
                      )}
                    </div>
                    {photo && (
                      <button
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="text-sm"
                      >
                        Upload Photo
                      </Button>
                      <p className="text-xs text-gray-500 self-center">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                    <Input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Enter your job title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <Input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Enter your department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                    >
                      <option value="UTC-8">Pacific Time (UTC-8)</option>
                      <option value="UTC-7">Mountain Time (UTC-7)</option>
                      <option value="UTC-6">Central Time (UTC-6)</option>
                      <option value="UTC-5">Eastern Time (UTC-5)</option>
                      <option value="UTC+0">UTC</option>
                      <option value="UTC+1">Central European Time (UTC+1)</option>
                      <option value="UTC+2">Eastern European Time (UTC+2)</option>
                      <option value="UTC+5:30">India Standard Time (UTC+5:30)</option>
                      <option value="UTC+8">China Standard Time (UTC+8)</option>
                      <option value="UTC+9">Japan Standard Time (UTC+9)</option>
                    </select>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </motion.section>

            {/* Notifications Section */}
            <motion.section 
              className="rounded-xl border bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Notifications & Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Email Notifications</h3>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications}
                      onChange={() => setNotifications(!notifications)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Email Alerts</h3>
                    <p className="text-xs text-gray-500">Get alerts for critical campaigns</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={() => setEmailAlerts(!emailAlerts)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Push Notifications</h3>
                    <p className="text-xs text-gray-500">Receive browser notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={() => setPushNotifications(!pushNotifications)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </motion.section>

            {/* Appearance Section */}
            <motion.section 
              className="rounded-xl border bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Appearance & Language</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>
              </div>
            </motion.section>

            {/* About Section */}
            <motion.section 
              className="rounded-xl border bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-6">About</h2>
              <div className="text-sm text-gray-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Application:</span>
                  <span>Sentinel</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Company:</span>
                  <span>Vortex Technologies</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Version:</span>
                  <span>v1.0.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Last Updated:</span>
                  <span>December 2024</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-600 leading-relaxed">
                    Sentinel is an AI-powered platform designed to monitor campaigns,
                    detect disinformation, and provide actionable insights for analysts.
                    Built with cutting-edge technology to protect against information warfare.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Save Button */}
            <motion.div 
              className="flex justify-end gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
                             <Button
                 variant="outline"
                 onClick={() => {
                   // Reset all fields to original values
                   const defaultUser = {
                     name: "Emma Chen",
                     email: "emma.chen@example.com",
                     phone: "+1 555 123 4567",
                     jobTitle: "Senior Analyst",
                     department: "Intelligence",
                     bio: "Experienced analyst specializing in disinformation detection and campaign monitoring.",
                     notifications: true,
                     emailAlerts: true,
                     pushNotifications: false,
                     theme: "light",
                     language: "en",
                     timezone: "UTC-5"
                   }
                   
                   setName(defaultUser.name)
                   setEmail(defaultUser.email)
                   setPhone(defaultUser.phone)
                   setJobTitle(defaultUser.jobTitle)
                   setDepartment(defaultUser.department)
                   setBio(defaultUser.bio)
                   setPhoto(null)
                   setPhotoFile(null)
                   setNotifications(defaultUser.notifications)
                   setEmailAlerts(defaultUser.emailAlerts)
                   setPushNotifications(defaultUser.pushNotifications)
                   setTheme(defaultUser.theme)
                   setLanguage(defaultUser.language)
                   setTimezone(defaultUser.timezone)
                   setError("")
                   
                   // Update user context
                   updateUser(defaultUser)
                   updateUserPhoto(null)
                   
                   if (fileInputRef.current) {
                     fileInputRef.current.value = ""
                   }
                 }}
                 className="px-6 py-2"
               >
                 Reset
               </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="px-8 py-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
