import React, { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'

/* ---------- skins (current skin via mc-heads.net, keyed by UUID) ---------- */
export const headUrl = (uuid, size = 128) => `https://mc-heads.net/avatar/${uuid}/${size}`
export const bodyUrl = (uuid, size = 340) => `https://mc-heads.net/body/${uuid}/${size}`

/* ---------- formatting ---------- */
export const fmt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'))
export const fmt1 = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 }))
export function hoursToHuman(h) {
  const d = Math.floor(h / 24), r = Math.round(h % 24)
  return d <= 0 ? `${Math.round(h)}h` : `${d}d ${r}h`
}
export function ticksToDuration(ticks) {
  const sec = ticks / 20, d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/* ---------- scroll-based reveal (works in scroll-snap containers & hidden-tab reload) ---------- */
export function useReveal({ once = true, amount = 0.12 } = {}) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let sc = el.parentElement
    while (sc && sc !== document.body) {
      const oy = getComputedStyle(sc).overflowY
      if (oy === 'auto' || oy === 'scroll') break
      sc = sc.parentElement
    }
    const target = sc && sc !== document.body ? sc : window
    let done = false
    const check = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const visible = r.top < vh * (1 - amount) && r.bottom > vh * amount
      if (visible) { setShown(true); if (once) cleanup() }
      else if (!once) setShown(false)
    }
    const onVis = () => document.visibilityState === 'visible' && check()
    const cleanup = () => {
      if (done) return
      done = true
      target.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      document.removeEventListener('visibilitychange', onVis)
    }
    target.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    document.addEventListener('visibilitychange', onVis)
    const raf = requestAnimationFrame(check)
    const t = setTimeout(check, 250)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); cleanup() }
  }, [once, amount])
  return [ref, shown]
}

export function Reveal({ children, className = '', y = 28, delay = 0 }) {
  const [ref, shown] = useReveal({ amount: 0.12 })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y }} animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}>
      {children}
    </motion.div>
  )
}

const fmtLocale = (v, decimals) =>
  v.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })

export function Counter({ value, decimals = 0, className = '', prefix = '', suffix = '' }) {
  const [ref, shown] = useReveal({ amount: 0.05 })
  const started = useRef(false)
  const [txt, setTxt] = useState(() => fmtLocale(0, decimals))
  useEffect(() => {
    if (!shown || started.current) return
    started.current = true
    const controls = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setTxt(fmtLocale(v, decimals)) })
    return controls.stop
  }, [shown, value, decimals])
  return <span ref={ref} className={`stat-num ${className}`}>{prefix}{txt}{suffix}</span>
}

/* ---------- block/item textures from the vanilla-asset CDN ----------
   Try blocks/ then items/ (with a small alias map for texture-file mismatches),
   and clip to the top square frame so animated strips render as one frame.    */
const TEX = 'https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets/data/1.21.1'
const ALIAS = {
  grass_block: 'blocks/grass_block_side', magma_block: 'blocks/magma', melon: 'blocks/melon_side',
  smooth_sandstone: 'blocks/sandstone_top', spruce_slab: 'blocks/spruce_planks', spruce_stairs: 'blocks/spruce_planks',
  tall_grass: 'blocks/tall_grass_top', carrots: 'blocks/carrots_stage3', potatoes: 'blocks/potatoes_stage3',
  beetroots: 'blocks/beetroots_stage3', fire: 'blocks/fire_0', bee_nest: 'blocks/bee_nest_front',
  waxed_copper_block: 'blocks/copper_block', cherry_stairs: 'blocks/cherry_planks', cobblestone_slab: 'blocks/cobblestone',
  oak_fence: 'blocks/oak_planks', oak_slab: 'blocks/oak_planks', oak_stairs: 'blocks/oak_planks',
  stone_brick_slab: 'blocks/stone_bricks', stone_slab: 'blocks/stone', smooth_stone_slab: 'blocks/smooth_stone',
  polished_deepslate_slab: 'blocks/polished_deepslate', bone_block: 'blocks/bone_block_side', snow_block: 'blocks/snow',
  crafting_table: 'blocks/crafting_table_top', white_bed: 'blocks/white_wool', scaffolding: 'blocks/scaffolding_top',
  ender_chest: 'blocks/obsidian', cherry_fence: 'blocks/cherry_planks', deepslate_tile_wall: 'blocks/deepslate_tiles',
  polished_tuff_wall: 'blocks/polished_tuff', chest: 'blocks/oak_planks', lectern: 'blocks/oak_planks',
}
export function BlockIcon({ id, size = 40, className = '' }) {
  const name = (id || '').split(':').pop()
  const [stage, setStage] = useState(0) // 0=alias/block, 1=block, 2=item, 3=hide
  if (!name || stage === 3) return null
  const candidates = [ALIAS[name], `blocks/${name}`, `items/${name}`].filter(Boolean)
  const idx = ALIAS[name] ? stage : stage + 1 // skip alias slot when none
  const path = candidates[idx] || candidates[candidates.length - 1]
  return (
    <span className={`tex-clip pixelated inline-block ${className}`} style={{ width: size, height: size }}>
      <img key={path} src={`${TEX}/${path}.png`} onError={() => setStage((s) => s + 1)} alt={name} />
    </span>
  )
}

/* ---------- SVG icons (no emoji) ---------- */
export function Icon({ name, className = 'w-5 h-5', stroke = 2 }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const P = (d, extra) => <path d={d} {...extra} />
  const paths = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    skull: <><path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14Z" /><circle cx="9" cy="12" r="1.6" fill="currentColor" /><circle cx="15" cy="12" r="1.6" fill="currentColor" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    pickaxe: <><path d="M3 21 12 12" /><path d="M4 9c4-4 10-5 16-4-4-2-9-2-13 1" /><path d="M9 4c4 4 5 10 4 16 2-4 2-9-1-13" /></>,
    sword: <><path d="M14.5 3.5 21 4l-.5 6.5L9 22l-3-3L17.5 7.5Z" /><path d="m6 19-3 2 1-4" /></>,
    hammer: <><path d="M14 6l4 4" /><path d="M17 3l4 4-3 3-4-4 3-3Z" /><path d="M14.5 9.5 4 20l-1-1L13.5 8.5" /></>,
    drumstick: <><path d="M15 5a4 4 0 0 0-6 5l-1 1a2.5 2.5 0 1 0 3 3l1-1a4 4 0 0 0 5-6" /><path d="m5 19 2-2" /></>,
    bomb: <><circle cx="11" cy="14" r="7" /><path d="m16 9 2-2" /><path d="M18 7c0-1 .8-2 2-2" /></>,
    coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3" /><path d="M9 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /><ellipse cx="15" cy="12" rx="6" ry="3" /></>,
    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M16 5h3v1a3 3 0 0 1-3 3M8 5H5v1a3 3 0 0 0 3 3" /><path d="M12 12v4M9 20h6M10 20v-2h4v2" /></>,
    wand: <><path d="m4 20 10-10" /><path d="M14 4v2M18 6v2M20 10h-2M16 8h-2" /><path d="m15 5 2 2" /></>,
    ghost: <><path d="M5 21v-9a7 7 0 0 1 14 0v9l-2.3-1.6L14 21l-2-1.6L10 21l-2.7-1.6L5 21Z" /><circle cx="9.5" cy="11" r="1" fill="currentColor" /><circle cx="14.5" cy="11" r="1" fill="currentColor" /></>,
    chest: <><rect x="3" y="8" width="18" height="12" rx="1.5" /><path d="M3 12h18M11 8V6a1 1 0 0 1 1-1 1 1 0 0 1 1 1v2" /><rect x="10.5" y="11" width="3" height="3" rx="0.5" fill="currentColor" /></>,
    sheep: <><path d="M7 13a4 4 0 1 1 3-7 4 4 0 0 1 5 1 3 3 0 0 1 1 6c0 2-2 3-5 3s-5-1-5-3Z" /><path d="M9 16v3M15 16v3" /></>,
    swords: <><path d="M14.5 3.5 21 4l-.5 6.5L14 17l-3-3 3.5-10.5Z" /><path d="M9.5 3.5 3 4l.5 6.5L10 17l3-3L9.5 3.5Z" /></>,
    spring: <><path d="M6 20h12" /><path d="M8 20c0-3 8-3 8-6s-8-3-8-6 8-3 8-4" /></>,
    boot: <path d="M6 4h4v9l6 3a3 3 0 0 1 2 3v1H4v-6" />,
    flame: <path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5-.5-2 2 1 3.5 3 3.5 6a5 5 0 0 1-10 0c0-4 4-6 5-11Z" />,
    wings: <><path d="M12 4v14" /><path d="M12 6C9 4 5 4 3 6c0 5 3 8 9 9 6-1 9-4 9-9-2-2-6-2-9 0" /></>,
    wave: <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />,
    boat: <><path d="M3 14h18l-2 5H5l-2-5Z" /><path d="M6 14V8l5-2 5 4v4" /></>,
    cart: <><rect x="4" y="9" width="16" height="7" rx="1" /><circle cx="8" cy="19" r="1.6" /><circle cx="16" cy="19" r="1.6" /></>,
    horse: <path d="M5 21c0-6 3-9 6-9l-1-3 3 1 2-3 1 4c2 1 3 3 3 6M5 21h4M15 21h4" />,
    pig: <><circle cx="12" cy="13" r="7" /><ellipse cx="12" cy="14" rx="3" ry="2" /><circle cx="10.5" cy="14" r=".7" fill="currentColor" /><circle cx="13.5" cy="14" r=".7" fill="currentColor" /></>,
    cloud: <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A3.5 3.5 0 0 1 17 18H7Z" />,
    dolphin: <path d="M4 12c6-8 16-6 16-6-2 4-1 8-6 10-4 1.6-8 0-10-2 2 0 3 0 4-1" />,
    lava: <path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 1 3.5 3 3.5 6a5 5 0 0 1-10 0c0-4 4-6 5-11Z" />,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    tnt: <><rect x="4" y="9" width="16" height="10" rx="1" /><path d="M4 12h16M12 9V6l2-2" /></>,
    bed: <><path d="M3 18v-6a2 2 0 0 1 2-2h9a4 4 0 0 1 4 4v4" /><path d="M3 14h18M3 18v-2M21 18v-4" /><circle cx="7" cy="12" r="1.4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    sparkles: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" /><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /></>,
    'arrow-up': <><path d="M12 20V5" /><path d="m6 11 6-6 6 6" /></>,
    'arrow-down': <><path d="M12 4v15" /><path d="m6 13 6 6 6-6" /></>,
    'arrow-left': <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  }
  return <svg {...common} aria-hidden="true">{paths[name] || paths.sparkles}</svg>
}
