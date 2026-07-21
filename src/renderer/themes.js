// Color themes. Each drives a set of CSS variables consumed by the renderer.
// Shared dark neutral surfaces keep every theme legible; the accent/gold/danger
// and background glows carry the identity.
export const THEMES = {
  ember: {
    name: 'Ember', a3: '#ffab6b', a4: '#ff8a3d', a5: '#ff6a1f', a6: '#f04d0a', a7: '#c5350a',
    danger: '#ff4d3d', gold: '#ffc24b',
    glow1: 'rgba(255,106,31,.22)', glow2: 'rgba(225,29,15,.20)',
    bg1: '#150705', bg2: '#0b0402', bg3: '#070302',
  },
  ocean: {
    name: 'Ocean', a3: '#7cd4ff', a4: '#38bdf8', a5: '#0ea5e9', a6: '#0284c7', a7: '#0369a1',
    danger: '#fb7185', gold: '#facc15',
    glow1: 'rgba(14,165,233,.22)', glow2: 'rgba(2,132,199,.18)',
    bg1: '#04121b', bg2: '#020a12', bg3: '#01060b',
  },
  amethyst: {
    name: 'Amethyst', a3: '#c4b5fd', a4: '#a78bfa', a5: '#8b5cf6', a6: '#7c3aed', a7: '#6d28d9',
    danger: '#fb7185', gold: '#fbbf24',
    glow1: 'rgba(139,92,246,.22)', glow2: 'rgba(124,58,237,.18)',
    bg1: '#120a1f', bg2: '#0a0614', bg3: '#06030d',
  },
  forest: {
    name: 'Forest', a3: '#86efac', a4: '#4ade80', a5: '#22c55e', a6: '#16a34a', a7: '#15803d',
    danger: '#f87171', gold: '#fbbf24',
    glow1: 'rgba(34,197,94,.20)', glow2: 'rgba(21,128,61,.16)',
    bg1: '#04160c', bg2: '#020c07', bg3: '#010704',
  },
  rose: {
    name: 'Rose', a3: '#fda4af', a4: '#fb7185', a5: '#f43f5e', a6: '#e11d48', a7: '#be123c',
    danger: '#fb7185', gold: '#fbbf24',
    glow1: 'rgba(244,63,94,.22)', glow2: 'rgba(190,18,60,.18)',
    bg1: '#1a0810', bg2: '#0f0409', bg3: '#080205',
  },
  amber: {
    name: 'Amber', a3: '#fcd34d', a4: '#fbbf24', a5: '#f59e0b', a6: '#d97706', a7: '#b45309',
    danger: '#ef4444', gold: '#fde68a',
    glow1: 'rgba(245,158,11,.22)', glow2: 'rgba(217,119,6,.18)',
    bg1: '#161003', bg2: '#0c0802', bg3: '#070501',
  },
  slate: {
    name: 'Slate', a3: '#cbd5e1', a4: '#94a3b8', a5: '#64748b', a6: '#475569', a7: '#334155',
    danger: '#f87171', gold: '#e2b04a',
    glow1: 'rgba(148,163,184,.16)', glow2: 'rgba(71,85,105,.14)',
    bg1: '#0d1017', bg2: '#070a0f', bg3: '#04060a',
  },
}

// Build a theme from a preset key + optional custom accent hex override.
export function resolveTheme(themeKey = 'ember', customAccent = null) {
  const base = THEMES[themeKey] || THEMES.ember
  if (!customAccent) return base
  return { ...base, ...shadesFromHex(customAccent) }
}

// Derive a 5-step accent scale + glows from a single hex.
export function shadesFromHex(hex) {
  const { r, g, b } = hexToRgb(hex)
  const mix = (t) => {
    // t<0 lighten toward white, t>0 darken toward black
    const to = t < 0 ? 255 : 0
    const amt = Math.abs(t)
    return rgbToHex(r + (to - r) * amt, g + (to - g) * amt, b + (to - b) * amt)
  }
  return {
    a3: mix(-0.35), a4: mix(-0.15), a5: hex, a6: mix(0.18), a7: mix(0.34),
    glow1: `rgba(${r},${g},${b},.22)`, glow2: `rgba(${Math.round(r * 0.8)},${Math.round(g * 0.8)},${Math.round(b * 0.8)},.18)`,
  }
}

export function themeToVars(t) {
  return {
    '--a3': t.a3, '--a4': t.a4, '--a5': t.a5, '--a6': t.a6, '--a7': t.a7,
    '--danger': t.danger, '--gold': t.gold,
    '--glow1': t.glow1, '--glow2': t.glow2,
    '--bg1': t.bg1, '--bg2': t.bg2, '--bg3': t.bg3,
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) }
}
function rgbToHex(r, g, b) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
