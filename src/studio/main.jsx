import React from 'react'
import ReactDOM from 'react-dom/client'
import '../index.css'
import App, { BUILD } from './App.jsx'

console.log(`%cStatlas%c ${BUILD}`, 'font-weight:bold;color:#ff8a3d', 'color:#888',
  '\nIf you hit an upload error, hard-refresh (Ctrl/Cmd+Shift+R) to clear a cached old build.')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
