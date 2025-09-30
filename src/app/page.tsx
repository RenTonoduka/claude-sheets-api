export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <main className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Claude Sheets API
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            Beautiful and simple API for Claude to interact with Google Sheets
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="glass glass-hover rounded-2xl p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Fast & Simple</h3>
            <p className="text-gray-400 text-sm">
              Streamlined API design for quick integration with Claude
            </p>
          </div>

          <div className="glass glass-hover rounded-2xl p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure</h3>
            <p className="text-gray-400 text-sm">
              Built with security best practices and rate limiting
            </p>
          </div>

          <div className="glass glass-hover rounded-2xl p-6">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Powerful</h3>
            <p className="text-gray-400 text-sm">
              Full CRUD operations with Google Sheets integration
            </p>
          </div>
        </div>

        {/* API Status */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">API Status</h2>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold">Online</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Endpoint</span>
              <code className="text-blue-400">/api/sheets</code>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Version</span>
              <span className="text-purple-400">v1.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Rate Limit</span>
              <span className="text-pink-400">100 req/min</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-700">
              <span className="text-gray-400">Response Time</span>
              <span className="text-green-400">&lt; 200ms</span>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
          <div className="bg-black/40 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <div className="text-gray-500">// Example API Call</div>
            <div className="text-blue-400">POST <span className="text-white">/api/sheets</span></div>
            <div className="text-gray-500 mt-2">{'{'}</div>
            <div className="ml-4 text-purple-400">"spreadsheetId"<span className="text-white">:</span> <span className="text-green-400">"your-sheet-id"</span>,</div>
            <div className="ml-4 text-purple-400">"range"<span className="text-white">:</span> <span className="text-green-400">"Sheet1!A1:B2"</span>,</div>
            <div className="ml-4 text-purple-400">"values"<span className="text-white">:</span> <span className="text-yellow-400">[[</span><span className="text-green-400">"Name"</span>, <span className="text-green-400">"Email"</span><span className="text-yellow-400">]]</span></div>
            <div className="text-gray-500">{'}'}</div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Built with Next.js & Tailwind CSS</p>
        </footer>
      </main>
    </div>
  );
}
