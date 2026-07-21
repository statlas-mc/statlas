import React, { useMemo, useRef, useState } from 'react'
import { computeWrapped, DEFAULT_AWARDS, METRIC_OPTIONS } from '../engine/engine.js'
import { THEMES, resolveTheme, themeToVars } from '../renderer/themes.js'
import Wrapped, { SECTIONS } from '../renderer/Wrapped.jsx'
import { Icon } from '../renderer/ui.jsx'
import { parseFiles, resolveNamesOnline } from './parse.js'
import DeployGuide from './DeployGuide.jsx'

export const BUILD = '2026-07-21.3'
const ICON_CHOICES = ['trophy', 'skull', 'pickaxe', 'hammer', 'compass', 'bomb', 'coins', 'sword', 'swords', 'drumstick', 'wand', 'ghost', 'chest', 'sheep', 'spring', 'clock', 'flame', 'wave', 'sparkles']

export default function App() {
  const [phase, setPhase] = useState('upload') // upload | studio
  const [inputs, setInputs] = useState(null)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const [config, setConfig] = useState({
    server: 'My Server', season: 'Season 1', logoUrl: '',
    themeKey: 'ember', customAccent: null,
    sections: Object.fromEntries(SECTIONS.map((s) => [s.key, true])),
  })
  const [awardState, setAwardState] = useState({
    enabled: Object.fromEntries(DEFAULT_AWARDS.map((a) => [a.key, true])),
    custom: [],
  })

  const activeAwards = useMemo(
    () => [...DEFAULT_AWARDS.filter((a) => awardState.enabled[a.key] !== false), ...awardState.custom],
    [awardState],
  )
  const data = useMemo(
    () => (inputs ? computeWrapped({ ...inputs, awards: activeAwards }) : null),
    [inputs, activeAwards],
  )

  async function handleFiles(fileList) {
    setBusy(true); setStatus('Reading files…')
    const log = (...a) => console.info('[Statlas]', ...a)
    try {
      log(`build ${BUILD} — reading ${fileList?.length ?? 0} files`)
      const res = await parseFiles(fileList)
      log('parsed:', { stats: res?.stats, resolvedFromCache: res?.resolved, unresolved: res?.unresolved?.length, warnings: res?.warnings })
      if (!res || res.stats === 0) {
        const warn = Array.isArray(res?.warnings) ? res.warnings.join(' ') : ''
        setStatus(warn || 'No player stats found. Point at your world folder (the one containing a "stats" folder), or your whole server folder.')
        setBusy(false); return
      }
      let names = res.namesByUuid || {}
      const unresolved = Array.isArray(res.unresolved) ? res.unresolved : []
      // No usercache? Look the missing usernames up online so a world folder alone works.
      if (unresolved.length) {
        setStatus(`Looking up ${unresolved.length} usernames online…`)
        try {
          const online = await resolveNamesOnline(unresolved, (d, t) => setStatus(`Looking up usernames online… ${d}/${t}`))
          names = { ...names, ...online }
          log(`online resolved ${Object.keys(online).length}/${unresolved.length}`)
        } catch (netErr) {
          log('online name lookup failed (continuing):', netErr)
        }
      }
      const resolved = Object.keys(names).length
      if (resolved === 0) {
        setStatus(`Found ${res.stats} players' stats, but couldn't find any usernames. Add your server's usercache.json (or drop your whole server folder), then try again.`)
        setBusy(false); return
      }
      setInputs({ statsByUuid: res.statsByUuid, advByUuid: res.advByUuid, namesByUuid: names })
      const skipped = res.stats - resolved
      setStatus(`${resolved} players loaded.${skipped > 0 ? ` (${skipped} without a resolvable name were skipped.)` : ''}`)
      log(`loaded ${resolved} players`)
      setPhase('studio')
    } catch (e) {
      console.error('[Statlas] upload failed:', e)
      setStatus(`Could not read that folder: ${e?.message || e}. (Open the browser console for details; if this persists, hard-refresh to clear a cached build — this is build ${BUILD}.)`)
    }
    setBusy(false)
  }

  if (phase === 'upload') return <Upload onFiles={handleFiles} busy={busy} status={status} />

  return (
    <div className="h-screen flex studio-bg text-[#e8eaf0]">
      <Sidebar
        config={config} setConfig={setConfig}
        awardState={awardState} setAwardState={setAwardState}
        data={data}
        onExport={() => exportSite(config, data, setBusy)}
        onGuide={() => setShowGuide(true)}
        onReset={() => { setInputs(null); setPhase('upload'); setStatus(null) }}
        busy={busy}
      />
      <main className="flex-1 overflow-y-auto relative">
        {data && <Wrapped key={config.themeKey + config.customAccent} config={config} data={data} />}
      </main>
      {showGuide && <DeployGuide onClose={() => setShowGuide(false)} />}
    </div>
  )
}

/* ---------------- upload ---------------- */
function Upload({ onFiles, busy, status }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const onDrop = async (e) => {
    e.preventDefault(); setDrag(false)
    const items = e.dataTransfer.items
    if (items && items.length && items[0].webkitGetAsEntry) {
      const files = []
      await Promise.all(Array.from(items).map((it) => walkEntry(it.webkitGetAsEntry(), files)))
      onFiles(files)
    } else onFiles(e.dataTransfer.files)
  }
  return (
    <div className="studio-bg min-h-screen grid place-items-center px-5" style={themeToVars(THEMES.ember)}>
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-accent mb-6" style={{ background: 'color-mix(in srgb, var(--a5) 12%, transparent)' }}>
          <Icon name="trophy" className="w-4 h-4" /> Statlas
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-heat">Make a season recap for your server</h1>
        <p className="mt-4 text-[#aab] leading-relaxed">
          Drop your server's world folder below. Everything is read <b className="text-white">in your browser</b> —
          your world never leaves your computer. You'll customize it, preview it live, then download a ready-to-host site.
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition ${drag ? 'border-[color:var(--a5)] bg-white/5' : 'border-[#333] hover:border-[#555]'}`}
        >
          <Icon name="compass" className="w-10 h-10 mx-auto text-accent" />
          <div className="mt-3 font-semibold text-white">{busy ? 'Reading…' : 'Drop your world folder here'}</div>
          <div className="text-sm text-[#889] mt-1">or click to choose a folder</div>
          <input ref={inputRef} type="file" webkitdirectory="" directory="" multiple hidden
            onChange={(e) => onFiles(e.target.files)} />
        </div>
        <p className="text-xs text-[#778] mt-4 leading-relaxed">
          Needs the <code className="text-accent-soft">stats</code> folder and <code className="text-accent-soft">usercache.json</code>
          (both are in a standard server folder). <code className="text-accent-soft">advancements</code> is optional.
        </p>
        {status && <p className="mt-5 text-sm text-[#cbd]">{status}</p>}
      </div>
    </div>
  )
}

async function walkEntry(entry, out, path = '') {
  if (!entry) return
  if (entry.isFile) {
    await new Promise((res) => entry.file((f) => {
      // preserve relative path for the parser
      try { Object.defineProperty(f, 'webkitRelativePath', { value: path + entry.name }) } catch {}
      out.push(f); res()
    }, res))
  } else if (entry.isDirectory) {
    const reader = entry.createReader()
    await new Promise((res) => {
      const readAll = () => reader.readEntries(async (ents) => {
        if (!ents.length) return res()
        await Promise.all(ents.map((e) => walkEntry(e, out, path + entry.name + '/')))
        readAll()
      }, res)
      readAll()
    })
  }
}

/* ---------------- sidebar controls ---------------- */
function Sidebar({ config, setConfig, awardState, setAwardState, data, onExport, onGuide, onReset, busy }) {
  const set = (patch) => setConfig((c) => ({ ...c, ...patch }))
  const setSection = (key, v) => setConfig((c) => ({ ...c, sections: { ...c.sections, [key]: v } }))
  const onLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = () => set({ logoUrl: r.result }); r.readAsDataURL(f)
  }
  return (
    <aside className="w-[340px] shrink-0 h-screen overflow-y-auto border-r border-[#20222a] p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="font-display font-bold text-lg text-white flex items-center gap-2"><Icon name="trophy" className="w-5 h-5 text-accent" /> Statlas</div>
        <button onClick={onReset} className="text-xs text-[#889] hover:text-white">↺ new</button>
      </div>

      <Group title="Branding">
        <Label>Server name</Label>
        <input className="field" value={config.server} onChange={(e) => set({ server: e.target.value })} />
        <Label>Season / subtitle</Label>
        <input className="field" value={config.season} onChange={(e) => set({ season: e.target.value })} />
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {config.logoUrl
            ? <img src={config.logoUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
            : <div className="w-12 h-12 rounded-lg bg-[#1c1f27] grid place-items-center text-[#556]"><Icon name="trophy" className="w-5 h-5" /></div>}
          <label className="btn btn-ghost text-sm cursor-pointer">Upload<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
          {config.logoUrl && <button className="text-xs text-[#889] hover:text-white" onClick={() => set({ logoUrl: '' })}>remove</button>}
        </div>
      </Group>

      <Group title="Theme">
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(THEMES).map(([key, t]) => {
            const active = config.themeKey === key && !config.customAccent
            return (
              <button key={key} title={t.name} onClick={() => set({ themeKey: key, customAccent: null })}
                className={`h-9 rounded-lg border ${active ? 'border-white' : 'border-transparent'}`}
                style={{ background: `linear-gradient(135deg, ${t.a4}, ${t.a6})` }} />
            )
          })}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Label className="!mt-0 flex-1">Custom accent</Label>
          <input type="color" value={config.customAccent || '#ff6a1f'}
            onChange={(e) => set({ customAccent: e.target.value })}
            className="w-9 h-9 rounded bg-transparent border border-[#2a2d36] cursor-pointer" />
          {config.customAccent && <button className="text-xs text-[#889] hover:text-white" onClick={() => set({ customAccent: null })}>clear</button>}
        </div>
      </Group>

      <Group title="Sections">
        {SECTIONS.map((s) => (
          <Toggle key={s.key} label={s.label} checked={config.sections[s.key] !== false} onChange={(v) => setSection(s.key, v)} />
        ))}
      </Group>

      <AwardsPanel awardState={awardState} setAwardState={setAwardState} />

      <div className="pt-2 space-y-2">
        <button className="btn btn-primary w-full justify-center" disabled={busy || !data} onClick={onExport}>
          <Icon name="share" className="w-4 h-4" /> {busy ? 'Building…' : 'Download my site'}
        </button>
        <button className="btn btn-ghost w-full justify-center" onClick={onGuide}>How to deploy / custom domain</button>
        <p className="text-[11px] text-[#667] text-center">{data ? `${data.players.length} players · ${data.superlatives.length} awards` : ''}</p>
      </div>
    </aside>
  )
}

function AwardsPanel({ awardState, setAwardState }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', metric: METRIC_OPTIONS[3][0], unit: '', icon: 'trophy' })
  const toggle = (key) => setAwardState((s) => ({ ...s, enabled: { ...s.enabled, [key]: s.enabled[key] === false } }))
  const addCustom = () => {
    if (!form.title.trim()) return
    const label = METRIC_OPTIONS.find((m) => m[0] === form.metric)?.[1] || form.metric
    setAwardState((s) => ({
      ...s,
      custom: [...s.custom, { key: 'custom-' + Date.now(), title: form.title.trim(), desc: 'Most ' + label.toLowerCase(), unit: form.unit || label.toLowerCase(), icon: form.icon, metric: form.metric }],
    }))
    setForm({ title: '', metric: METRIC_OPTIONS[3][0], unit: '', icon: 'trophy' })
    setOpen(false)
  }
  const removeCustom = (key) => setAwardState((s) => ({ ...s, custom: s.custom.filter((c) => c.key !== key) }))
  return (
    <Group title="Awards">
      {DEFAULT_AWARDS.map((a) => (
        <Toggle key={a.key} label={a.title} sub={a.desc} checked={awardState.enabled[a.key] !== false} onChange={() => toggle(a.key)} />
      ))}
      {awardState.custom.map((a) => (
        <div key={a.key} className="flex items-center justify-between py-1">
          <div className="min-w-0"><div className="text-sm text-white truncate">{a.title} <span className="text-[10px] text-accent-soft">custom</span></div><div className="text-[11px] text-[#778] truncate">{a.desc}</div></div>
          <button className="text-xs text-[#889] hover:text-red-400" onClick={() => removeCustom(a.key)}>remove</button>
        </div>
      ))}
      {open ? (
        <div className="mt-2 p-3 rounded-lg bg-[#14161c] border border-[#24272f] space-y-2">
          <input className="field" placeholder="Award title (e.g. The Pyromaniac)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="field" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
            {METRIC_OPTIONS.map(([k, l]) => <option key={k} value={k}>Most {l.toLowerCase()}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="field flex-1" placeholder="unit (optional)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <select className="field w-24" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary text-sm flex-1 justify-center" onClick={addCustom}>Add</button>
            <button className="btn btn-ghost text-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="text-sm text-accent mt-2 hover:underline" onClick={() => setOpen(true)}>+ Add custom award</button>
      )}
    </Group>
  )
}

/* ---- small ui ---- */
function Group({ title, children }) {
  return <div><div className="text-[11px] uppercase tracking-widest text-[#778] font-bold mb-2">{title}</div><div className="space-y-2">{children}</div></div>
}
function Label({ children, className = '' }) {
  return <div className={`text-xs text-[#99a] mt-2 mb-1 ${className}`}>{children}</div>
}
function Toggle({ label, sub, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-center justify-between py-1 text-left group">
      <div className="min-w-0"><div className="text-sm text-[#dde] truncate">{label}</div>{sub && <div className="text-[11px] text-[#778] truncate">{sub}</div>}</div>
      <span className={`w-9 h-5 rounded-full shrink-0 relative transition ${checked ? 'bg-accent' : 'bg-[#2c2f38]'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

/* ---------------- export ---------------- */
async function exportSite(config, data, setBusy) {
  setBusy(true)
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}viewer-template.txt`)
    let template = await res.text()
    const payload = JSON.stringify({ config, data }).replace(/</g, '\\u003c')
    const html = template.replace('"__MC_WRAPPED_PAYLOAD__"', payload)
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'index.html'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  } catch (e) {
    alert('Export failed: ' + e.message)
  }
  setBusy(false)
}
