import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Wrapped from './renderer/Wrapped.jsx'

const payload = typeof window.__WRAPPED__ === 'object' && window.__WRAPPED__ ? window.__WRAPPED__ : null
if (payload?.config?.server) {
  document.title = `${payload.config.server} · ${payload.config.season || ''} In Review`.replace(/\s+/g, ' ').trim()
}

function Root() {
  if (!payload || !payload.data) {
    return (
      <div className="wr-root t-bg grid place-items-center text-center p-10" style={{ minHeight: '100vh' }}>
        <p className="text-2">No recap data found in this file.</p>
      </div>
    )
  }
  return <Wrapped config={payload.config} data={payload.data} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>,
)
