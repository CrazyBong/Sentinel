import React from "react"

export default class ErrorOverlay extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null, expanded: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Log to console (or send to your logging service)
    console.error("💥 Uncaught error:", error, info)
    this.setState({ info })
  }

  render() {
    const { error, info, expanded } = this.state
    if (!error) return this.props.children

    // Simple full-screen overlay
    return (
      <div
        role="alert"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
        style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
      >
        <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
          <div className="mb-2 text-lg font-bold text-red-700">Something went wrong</div>

          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {String(error?.message || error)}
          </div>

          <button
            onClick={() => this.setState({ expanded: !expanded })}
            className="mt-3 rounded-md border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>

          {expanded && (
            <pre className="mt-3 max-h-[40vh] overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
{(error && error.stack) || "No error stack available."}

{info && info.componentStack ? `\n\nComponent stack:\n${info.componentStack}` : ""}
            </pre>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Reload App
            </button>
            {this.props.onReset && (
              <button
                onClick={this.props.onReset}
                className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Reset Boundary
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
