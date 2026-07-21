import React, { useState } from 'react'
import { Icon } from '../renderer/ui.jsx'

const TABS = [
  {
    id: 'netlify', label: 'Netlify Drop', badge: 'Easiest · ~1 min',
    steps: [
      ['Go to the drop page', <>Open <A href="https://app.netlify.com/drop">app.netlify.com/drop</A> in your browser. No account needed to start.</>],
      ['Drag your file in', <>Drag the <code>index.html</code> you just downloaded onto the page.</>],
      ['You’re live', <>Netlify gives you a public URL instantly (like <code>your-name.netlify.app</code>). Share it with your players.</>],
      ['Keep the link (optional)', <>Make a free Netlify account to claim the site so the URL stays permanent and you can re-drop updates.</>],
    ],
  },
  {
    id: 'pages', label: 'GitHub Pages', badge: 'Free forever',
    steps: [
      ['Create a repo', <>On <A href="https://github.com/new">github.com/new</A>, make a new <b>public</b> repo (e.g. <code>server-recap</code>).</>],
      ['Upload the file', <>Click <b>Add file → Upload files</b> and drop your <code>index.html</code>. Commit.</>],
      ['Turn on Pages', <>Repo <b>Settings → Pages</b> → Source: <b>Deploy from a branch</b> → <code>main</code> / <code>root</code> → Save.</>],
      ['Visit your site', <>After a minute it’s live at <code>your-name.github.io/server-recap/</code>.</>],
    ],
  },
  {
    id: 'vercel', label: 'Vercel', badge: 'Clean URL',
    steps: [
      ['Make a project folder', <>Put your <code>index.html</code> in an empty folder on your computer.</>],
      ['Import to Vercel', <>At <A href="https://vercel.com/new">vercel.com/new</A>, drag the folder in (or connect a GitHub repo containing it).</>],
      ['Deploy', <>Vercel builds instantly and gives you <code>your-project.vercel.app</code>.</>],
    ],
  },
]

export default function DeployGuide({ onClose }) {
  const [tab, setTab] = useState('netlify')
  const active = TABS.find((t) => t.id === tab)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div className="max-w-2xl w-full max-h-[88vh] overflow-y-auto rounded-2xl bg-[#12141a] border border-[#262a33] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl text-white">Put your recap online</h2>
            <p className="text-sm text-[#99a] mt-1">You downloaded a single <code className="text-accent-soft">index.html</code> — it runs on any static host, for free.</p>
          </div>
          <button onClick={onClose} className="text-[#889] hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex gap-2 mt-5 flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${tab === t.id ? 'bg-accent text-black' : 'bg-[#1a1d24] text-[#cbd] hover:text-white'}`}>
              {t.label}<span className={`text-[10px] px-1.5 py-0.5 rounded ${tab === t.id ? 'bg-black/20' : 'bg-[#262a33] text-[#889]'}`}>{t.badge}</span>
            </button>
          ))}
        </div>

        <ol className="mt-5 space-y-4">
          {active.steps.map(([title, body], i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-accent text-black text-sm font-bold grid place-items-center">{i + 1}</span>
              <div><div className="font-semibold text-white">{title}</div><div className="text-sm text-[#aab] mt-0.5 leading-relaxed">{body}</div></div>
            </li>
          ))}
        </ol>

        <div className="mt-6 p-4 rounded-xl bg-[#0e1015] border border-[#22252d]">
          <div className="flex items-center gap-2 text-white font-semibold"><Icon name="compass" className="w-4 h-4 text-accent" /> Using your own domain</div>
          <p className="text-sm text-[#aab] mt-2 leading-relaxed">
            All three hosts let you attach a custom domain like <code className="text-accent-soft">recap.yourserver.net</code> for free.
            In the host’s dashboard open <b>Domain settings</b>, add your domain, then at your domain registrar add the
            <b> CNAME</b> record they show you (pointing your subdomain at the host). It goes live once DNS updates (usually minutes).
          </p>
        </div>

        <div className="mt-5 text-xs text-[#778] leading-relaxed">
          Note: player skins and block textures load live from the internet when the page is viewed — so keep it hosted online rather than sending the file around.
        </div>
      </div>
    </div>
  )
}

function A({ href, children }) {
  return <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">{children}</a>
}
