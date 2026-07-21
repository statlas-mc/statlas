#!/usr/bin/env node
// ---------------------------------------------------------------------------
// MC Wrapped — command-line generator (the "kit").
// Reads a world folder + a config file, computes the Wrapped, and writes a
// single self-contained index.html you can host anywhere.
//
//   1. npm install          (once, in the project root)
//   2. npm run build:viewer (once, builds the renderer template)
//   3. cp kit/config.example.json kit/config.json  &&  edit it
//   4. node kit/generate.mjs kit/config.json
//
// Output: dist-site/index.html  (deploy this one file — see README)
// ---------------------------------------------------------------------------
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { computeWrapped, DEFAULT_AWARDS } from '../src/engine/engine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const cfgPath = process.argv[2] || path.join(__dirname, 'config.json')
if (!fs.existsSync(cfgPath)) {
  console.error(`Config not found: ${cfgPath}\nCopy kit/config.example.json to kit/config.json and edit it.`)
  process.exit(1)
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))

const world = path.resolve(cfg.worldPath || '.')
const statsDir = path.join(world, 'stats')
const advDir = path.join(world, 'advancements')
if (!fs.existsSync(statsDir)) {
  console.error(`No "stats" folder in ${world}. Point "worldPath" at your world folder.`)
  process.exit(1)
}

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }

// ---- usernames -------------------------------------------------------------
const namesByUuid = {}
const cachePaths = [
  cfg.usercachePath && path.resolve(cfg.usercachePath),
  path.join(world, '..', 'usercache.json'),
  path.join(world, '..', 'whitelist.json'),
  path.join(world, 'usercache.json'),
].filter(Boolean)
for (const p of cachePaths) {
  const j = readJson(p)
  if (Array.isArray(j)) for (const e of j) if (e && e.uuid && e.name) namesByUuid[e.uuid.toLowerCase()] = e.name
}

// ---- load stats ------------------------------------------------------------
const statsByUuid = {}, advByUuid = {}, names = {}
const unresolved = []
for (const f of fs.readdirSync(statsDir)) {
  if (!f.endsWith('.json')) continue
  const uuid = f.slice(0, -5)
  const j = readJson(path.join(statsDir, f))
  if (!j || !j.stats) continue
  statsByUuid[uuid] = j
  const a = readJson(path.join(advDir, f))
  if (a) advByUuid[uuid] = a
  const hit = namesByUuid[uuid.toLowerCase()]
  if (hit) names[uuid] = hit
  else if (!uuid.startsWith('00000000')) unresolved.push(uuid)
}

// ---- optional Mojang name resolution --------------------------------------
if (cfg.resolveNames && unresolved.length) {
  console.log(`Resolving ${unresolved.length} usernames from Mojang…`)
  for (const uuid of unresolved) {
    try {
      const r = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replace(/-/g, '')}`)
      if (r.ok) { const d = await r.json(); if (d.name) names[uuid] = d.name }
    } catch {}
    await new Promise((s) => setTimeout(s, 1100))
  }
}

// ---- awards ----------------------------------------------------------------
let awards = DEFAULT_AWARDS
if (cfg.awards) {
  const disabled = new Set(cfg.awards.disable || [])
  awards = DEFAULT_AWARDS.filter((a) => !disabled.has(a.key)).concat(cfg.awards.custom || [])
}

// ---- compute ---------------------------------------------------------------
const data = computeWrapped({ statsByUuid, advByUuid, namesByUuid: names, awards })
console.log(`Built ${data.players.length} players, ${data.superlatives.length} awards.`)
if (data.players.length === 0) {
  console.error('No players resolved. Add usercache.json / whitelist.json, or set "resolveNames": true in config.')
  process.exit(1)
}

// ---- branding / theme config ----------------------------------------------
let logoUrl = ''
if (cfg.logo) {
  const lp = path.resolve(cfg.logo)
  if (fs.existsSync(lp)) {
    const ext = path.extname(lp).slice(1).toLowerCase() || 'png'
    logoUrl = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(lp).toString('base64')}`
  }
}
const SECTION_KEYS = ['playtime', 'deaths', 'grind', 'palette', 'combat', 'movement', 'life', 'awards']
const sections = {}
for (const k of SECTION_KEYS) sections[k] = cfg.sections ? cfg.sections[k] !== false : true

const viewerConfig = {
  server: cfg.server || 'My Server',
  season: cfg.season || 'Season 1',
  logoUrl,
  themeKey: cfg.theme || 'ember',
  customAccent: cfg.customAccent || null,
  sections,
}

// ---- inject into the single-file template ---------------------------------
const templatePath = path.join(ROOT, 'public', 'viewer-template.txt')
if (!fs.existsSync(templatePath)) {
  console.error('Missing renderer template. Run "npm run build:viewer" first.')
  process.exit(1)
}
const template = fs.readFileSync(templatePath, 'utf8')
const payload = JSON.stringify({ config: viewerConfig, data }).replace(/</g, '\\u003c')
const html = template.replace('"__MC_WRAPPED_PAYLOAD__"', payload)

const outDir = path.resolve(cfg.output || path.join(ROOT, 'dist-site'))
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'index.html')
fs.writeFileSync(outFile, html)
console.log(`\n✅  Wrote ${outFile}  (${Math.round(html.length / 1024)} KB)`)
console.log('   Deploy this single file — drag it onto https://app.netlify.com/drop, or see the README.')
