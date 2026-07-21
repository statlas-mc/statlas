// Parse an uploaded server/world folder entirely in the browser.
// Nothing is uploaded anywhere — all reading happens on the user's machine.
export async function parseFiles(fileList) {
  const files = Array.from(fileList)
  const statsByUuid = {}
  const advByUuid = {}
  const namesByUuid = {}
  const warnings = []
  const UUID_RE = /^[0-9a-fA-F-]{32,36}$/

  const pathOf = (f) => (f.webkitRelativePath || f.name || '').replace(/\\/g, '/')
  const readJson = async (f) => {
    try { return JSON.parse(await f.text()) } catch { return null }
  }

  let statCount = 0
  for (const f of files) {
    const path = pathOf(f)
    const lower = path.toLowerCase()
    const base = path.split('/').pop()

    if (/\/stats\/[^/]+\.json$/.test('/' + lower) || (lower.endsWith('.json') && lower.includes('stats'))) {
      const uuid = base.replace(/\.json$/i, '')
      if (UUID_RE.test(uuid)) {
        const j = await readJson(f)
        if (j && j.stats) { statsByUuid[uuid] = j; statCount++ }
      }
    }
    if (lower.includes('advancements') && lower.endsWith('.json')) {
      const uuid = base.replace(/\.json$/i, '')
      if (UUID_RE.test(uuid)) {
        const j = await readJson(f)
        if (j) advByUuid[uuid] = j
      }
    }
    if (base.toLowerCase() === 'usercache.json' || base.toLowerCase() === 'whitelist.json') {
      const j = await readJson(f)
      if (Array.isArray(j)) for (const e of j) if (e && e.uuid && e.name) namesByUuid[e.uuid.toLowerCase()] = e.name
    }
  }

  // normalize name keys to match stat uuids (case-insensitive)
  const names = {}
  const unresolved = []
  for (const uuid of Object.keys(statsByUuid)) {
    const hit = namesByUuid[uuid.toLowerCase()]
    if (hit) names[uuid] = hit
    else if (!uuid.startsWith('00000000')) unresolved.push(uuid) // real (online) UUID we can look up
  }

  if (statCount === 0) warnings.push('No stats/*.json files found. Point at your world folder (the one containing a "stats" folder), or your whole server folder.')

  return { statsByUuid, advByUuid, namesByUuid: names, stats: statCount, resolved: Object.keys(names).length, unresolved, warnings }
}

/* Resolve usernames from UUIDs online (CORS-friendly), so users can drop just
   the world folder without a usercache.json. Best-effort: failures are skipped. */
export async function resolveNamesOnline(uuids, onProgress) {
  const out = {}
  const list = [...uuids]
  const total = list.length
  let done = 0
  const CONCURRENCY = 6
  const fetchName = async (uuid) => {
    const raw = uuid.replace(/-/g, '')
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 9000)
      const r = await fetch(`https://api.ashcon.app/mojang/v2/user/${raw}`, { signal: c.signal })
      clearTimeout(t)
      if (r.ok) { const d = await r.json(); if (d && d.username) out[uuid] = d.username }
    } catch {
      try {
        const r2 = await fetch(`https://playerdb.co/api/player/minecraft/${raw}`)
        if (r2.ok) { const d = await r2.json(); const n = d?.data?.player?.username; if (n) out[uuid] = n }
      } catch {}
    }
    done++
    onProgress && onProgress(done, total)
  }
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    await Promise.all(list.slice(i, i + CONCURRENCY).map(fetchName))
  }
  return out
}
