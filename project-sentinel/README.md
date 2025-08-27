# 🚀 Project Sentinel

**Project Sentinel** is a full-stack **React + Vite + TailwindCSS** application designed to monitor, analyze, and visualize disinformation campaigns.
It includes **AI-powered dashboards**, real-time updates via **Socket.IO**, and LLM-assisted analysis.

---

## 📑 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Features](#features)
3. [Installation](#installation)
4. [Running Locally](#running-locally)
5. [Available Scripts](#available-scripts)
6. [Common Issues & Fixes](#common-issues--fixes)
7. [Contributing](#contributing)
8. [License](#license)

---

## ⚙️ Tech Stack

* **Frontend Framework**: [React.js](https://reactjs.org/) (with [Vite](https://vitejs.dev/) for fast builds)
* **Styling**:
  * [Tailwind CSS](https://tailwindcss.com/) (utility-first)
  * [shadcn/ui](https://ui.shadcn.com/) for accessible UI components
  * [Framer Motion](https://www.framer.com/motion/) for smooth animations
* **State Management**:
  * [Redux Toolkit](https://redux-toolkit.js.org/) (for complex data flows)
  * [React Query](https://tanstack.com/query/v5) (for server data caching)
* **Data Visualization**:
  * [Recharts](https://recharts.org/en-US/)
  * [D3.js](https://d3js.org/) (for advanced graphs, optional)
* **Real-Time Updates**: [Socket.IO](https://socket.io/)
* **Routing**: [React Router v7](https://reactrouter.com/)

---

## ✨ Features

* 🔐 **Authentication Pages**: Login & Signup flows
* 📊 **Dashboard**: Active campaigns, severity charts, real-time alerts
* 🤖 **AI Assistant**: Chat interface with an LLM for analyst queries
* 📂 **Campaigns Archive**: Searchable, filterable list of past disinformation campaigns
* 📈 **Analytics & Trends**: KPI flash cards, platform breakdown, geo-impact, AI detection summary
* ⚡ **Real-Time Alerts**: Streamed via **Socket.IO**
* 🎨 **Responsive UI**: Modern and consistent across devices

---

## 🛠 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/project-sentinel.git
cd project-sentinel
```

### 2. Install Dependencies

Make sure you have **Node.js >= 18** and **npm >= 9** installed. Then run:

```bash
npm install
```

### 3. Install TailwindCSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4. Install UI Libraries

```bash
npm install @radix-ui/react-icons class-variance-authority clsx tailwind-variants
npm install framer-motion recharts socket.io-client
```

---

## ▶️ Running Locally

Start the development server:

```bash
npm run dev
```

Open in browser:

```
http://localhost:5173
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 🐛 Common Issues & Fixes

### 1. **Tailwind config not found**

```
Can't resolve './tailwind.config.js'
```

✅ Ensure `tailwind.config.js` is in the project root, not inside `src/`.

### 2. **Import alias `@` not working**

```
Failed to resolve import "@/pages/LoginPage"
```

✅ Fix by editing `vite.config.js`:

```js
resolve: {
  alias: { "@": path.resolve(__dirname, "./src") }
}
```

### 3. **Lucide icon import errors**

```
does not provide an export named 'RedditLogo'
```

✅ Replace Lucide with custom inline SVG components (`XIcon`, `RedditIcon`).

### 4. **White screen after npm run dev**

* Check `App.jsx` for invalid syntax (often leftover Git conflict markers like `<<<<<<< HEAD`).
* Make sure all routes are wrapped correctly with `<Routes>` and `<Route>`.

### 5. **Motion import unused**

If not using animations, remove:

```js
import { motion } from "framer-motion"
```

to avoid linter errors.

---

## 🤝 Contributing

1. Fork this repo
2. Create a new branch (`feature/new-component`)
3. Commit changes (`git commit -m "Added new feature"`)
4. Push branch (`git push origin feature/new-component`)
5. Create a Pull Request

---

## 📜 License

This project is licensed under the **Vortex team** — free to use and modify with attribution.