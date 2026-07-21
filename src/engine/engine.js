// ---------------------------------------------------------------------------
// MC Wrapped — stats engine (framework-agnostic; runs in the browser AND Node)
// Ports the Python pipeline: parses vanilla stats/*.json into per-player metrics,
// sections, superlatives and leaderboards.
// ---------------------------------------------------------------------------
import BLOCK_LIST from './blocks.js'

const BLOCK_NAMES = new Set(BLOCK_LIST)
const TICKS_PER_SEC = 20

export const prettyName = (id) =>
  (id || '')
    .split(':')
    .pop()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const looksLikeBlock = (id) => BLOCK_NAMES.has((id || '').split(':').pop())

export function distanceComparison(km) {
  const refs = [
    [5, 'a morning hike'],
    [21.1, 'a half marathon'],
    [42.2, 'a full marathon'],
    [100, 'a 100 km ultramarathon'],
    [343, 'the drive from London to Paris'],
    [1200, 'the length of Italy'],
    [2400, 'the length of the Mississippi River'],
    [4400, 'the width of the United States'],
    [8000, 'the flight from New York to Rome'],
    [12742, 'a straight line through the centre of the Earth'],
    [20037, 'a pole-to-pole trip across the planet'],
    [40075, 'a full lap around the equator'],
    [100000, 'two and a half laps of the planet'],
    [384400, 'the entire distance to the Moon'],
  ]
  if (km <= 0) return 'barely a step'
  let chosen = null
  for (const [refKm, phrase] of refs) if (km >= refKm * 0.9) chosen = [refKm, phrase]
  if (!chosen) {
    const [refKm, phrase] = refs[0]
    return `${Math.round((km / refKm) * 100)}% of ${phrase}`
  }
  const [refKm, phrase] = chosen
  const ratio = km / refKm
  if (ratio <= 1.15) return phrase
  let n = Math.round(ratio * 10) / 10
  n = n >= 10 ? Math.round(n) : n
  return `${n}x ${phrase}`
}

// travel modes: [statKey, label, icon]
const MOVE_MODES = [
  ['minecraft:walk_one_cm', 'Walked', 'boot'],
  ['minecraft:sprint_one_cm', 'Sprinted', 'flame'],
  ['minecraft:crouch_one_cm', 'Sneaked', 'eye'],
  ['minecraft:swim_one_cm', 'Swam', 'wave'],
  ['minecraft:walk_on_water_one_cm', 'Strode water', 'wave'],
  ['minecraft:walk_under_water_one_cm', 'Walked seabed', 'wave'],
  ['minecraft:fall_one_cm', 'Fell', 'arrow-down'],
  ['minecraft:climb_one_cm', 'Climbed', 'arrow-up'],
  ['minecraft:fly_one_cm', 'Flew', 'sparkles'],
  ['minecraft:aviate_one_cm', 'Elytra-flew', 'wings'],
  ['minecraft:boat_one_cm', 'Boated', 'boat'],
  ['minecraft:minecart_one_cm', 'Minecarted', 'cart'],
  ['minecraft:horse_one_cm', 'Rode a horse', 'horse'],
  ['minecraft:strider_one_cm', 'Rode a strider', 'lava'],
  ['minecraft:pig_one_cm', 'Rode a pig', 'pig'],
  ['minecraft:happy_ghast_one_cm', 'Rode a ghast', 'cloud'],
  ['minecraft:nautilus_one_cm', 'Dolphin-rode', 'dolphin'],
]

const FOOD_ITEMS = new Set([
  'minecraft:cooked_beef', 'minecraft:cooked_porkchop', 'minecraft:cooked_chicken',
  'minecraft:cooked_mutton', 'minecraft:cooked_rabbit', 'minecraft:cooked_cod',
  'minecraft:cooked_salmon', 'minecraft:bread', 'minecraft:golden_carrot',
  'minecraft:golden_apple', 'minecraft:enchanted_golden_apple', 'minecraft:apple',
  'minecraft:carrot', 'minecraft:potato', 'minecraft:baked_potato', 'minecraft:beetroot',
  'minecraft:melon_slice', 'minecraft:sweet_berries', 'minecraft:glow_berries',
  'minecraft:cookie', 'minecraft:pumpkin_pie', 'minecraft:cake', 'minecraft:mushroom_stew',
  'minecraft:rabbit_stew', 'minecraft:beetroot_soup', 'minecraft:suspicious_stew',
  'minecraft:dried_kelp', 'minecraft:honey_bottle', 'minecraft:chorus_fruit',
  'minecraft:tropical_fish', 'minecraft:cod', 'minecraft:salmon', 'minecraft:pufferfish',
  'minecraft:beef', 'minecraft:porkchop', 'minecraft:chicken', 'minecraft:mutton',
  'minecraft:rabbit', 'minecraft:rotten_flesh', 'minecraft:spider_eye',
  'minecraft:poisonous_potato', 'minecraft:milk_bucket',
])

const topN = (obj, n) =>
  Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)

export function computePlayer(uuid, name, statsJson, advCount = 0) {
  const s = (statsJson && statsJson.stats) || {}
  const custom = s['minecraft:custom'] || {}
  const mined = s['minecraft:mined'] || {}
  const used = s['minecraft:used'] || {}
  const killed = s['minecraft:killed'] || {}
  const killedBy = s['minecraft:killed_by'] || {}
  const broken = s['minecraft:broken'] || {}
  const c = (k) => custom['minecraft:' + k] || 0

  const playTicks = c('play_time') || c('play_one_minute')
  const playHours = playTicks / TICKS_PER_SEC / 3600
  const playDays = playHours / 24

  // movement
  const modes = []
  let totalCm = 0
  for (const [key, label, icon] of MOVE_MODES) {
    const v = custom[key] || 0
    if (v > 0) modes.push({ label, icon, cm: v, km: Math.round((v / 100000) * 100) / 100 })
    if (key !== 'minecraft:fall_one_cm') totalCm += v
  }
  modes.sort((a, b) => b.cm - a.cm)
  const totalKm = Math.round((totalCm / 100000) * 10) / 10
  const dominant = modes[0] || null

  // deaths
  const deaths = c('deaths')
  const causes = {}
  for (const [k, v] of Object.entries(killedBy)) causes[prettyName(k)] = v
  const nemesisEntry = topN(killedBy, 1)[0]
  const nemesis = nemesisEntry
    ? { id: nemesisEntry[0], name: prettyName(nemesisEntry[0]), count: nemesisEntry[1] }
    : null

  // grind
  const diamonds = (mined['minecraft:diamond_ore'] || 0) + (mined['minecraft:deepslate_diamond_ore'] || 0)
  const totalMined = Object.values(mined).reduce((a, b) => a + b, 0)
  const topMinedEntry = topN(mined, 1)[0]
  const deepslateMined = Object.entries(mined)
    .filter(([k]) => k.includes('deepslate'))
    .reduce((a, [, v]) => a + v, 0)
  const placed = Object.fromEntries(Object.entries(used).filter(([k]) => looksLikeBlock(k)))
  const totalPlaced = Object.values(placed).reduce((a, b) => a + b, 0)
  const sigEntry = topN(placed, 1)[0]
  const toolsBroken = Object.values(broken).reduce((a, b) => a + b, 0)

  // combat
  const mobKills = c('mob_kills')
  const playerKills = c('player_kills')

  // consumption
  const foodEaten = Object.fromEntries(Object.entries(used).filter(([k]) => FOOD_ITEMS.has(k)))
  const totalFood = Object.values(foodEaten).reduce((a, b) => a + b, 0)
  const favEntry = topN(foodEaten, 1)[0]
  const chests = c('open_chest') + c('open_barrel') + c('open_shulker_box') + c('open_enderchest')

  const r1 = (x) => Math.round(x * 10) / 10
  const metrics = {
    playHours: r1(playHours), playDays: r1(playDays), deaths, totalKm,
    mobKills, playerKills, damageDealt: c('damage_dealt'), damageTaken: c('damage_taken'),
    totalMined, totalPlaced, diamonds, deepslateMined, toolsBroken, advancements: advCount,
    totalFood, tnt: used['minecraft:tnt'] || 0, traded: c('traded_with_villager'),
    talked: c('talked_to_villager'), jumps: c('jump'), chestsOpened: chests,
    slept: c('sleep_in_bed'), bred: c('animals_bred'), enchants: c('enchant_item'),
    waterPlaced: used['minecraft:water_bucket'] || 0, fishCaught: c('fish_caught'),
  }

  return {
    uuid, name,
    playHours: r1(playHours), playDays: r1(playDays), playTicks, advancements: advCount,
    metrics,
    movement: { totalKm, comparison: distanceComparison(totalKm), dominant, modes },
    deaths: {
      total: deaths,
      causes: Object.fromEntries(Object.entries(causes).sort((a, b) => b[1] - a[1])),
      nemesis, survivalStreakTicks: c('time_since_death'),
    },
    grind: {
      diamonds, totalMined,
      topMined: topMinedEntry ? { id: topMinedEntry[0], name: prettyName(topMinedEntry[0]), count: topMinedEntry[1] } : null,
      totalPlaced,
      signature: sigEntry ? { id: sigEntry[0], name: prettyName(sigEntry[0]), count: sigEntry[1] } : null,
      toolsBroken, deepslateMined,
      topMinedList: topN(mined, 6).map(([k, v]) => ({ id: k, name: prettyName(k), count: v })),
      topPlacedList: topN(placed, 8).map(([k, v]) => ({ id: k, name: prettyName(k), count: v })),
    },
    combat: {
      mobKills, playerKills, damageDealt: c('damage_dealt'), damageTaken: c('damage_taken'),
      damageBlocked: c('damage_blocked_by_shield'),
      topKills: topN(killed, 6).map(([k, v]) => ({ id: k, name: prettyName(k), count: v })),
    },
    life: {
      totalFood,
      favFood: favEntry ? { id: favEntry[0], name: prettyName(favEntry[0]), count: favEntry[1] } : null,
      slept: c('sleep_in_bed'), tnt: used['minecraft:tnt'] || 0,
      waterPlaced: used['minecraft:water_bucket'] || 0, bred: c('animals_bred'),
      enchants: c('enchant_item'), traded: c('traded_with_villager'), talked: c('talked_to_villager'),
      jumps: c('jump'), chestsOpened: chests, fishCaught: c('fish_caught'),
    },
  }
}

// ---- awards (superlatives) -------------------------------------------------
// Each references a `metric` key; a "most X" award goes to the true #1.
export const DEFAULT_AWARDS = [
  { key: 'architect', title: 'The Architect', desc: 'Most blocks placed', icon: 'hammer', metric: 'totalPlaced', unit: 'blocks placed' },
  { key: 'nomad', title: 'The Nomad', desc: 'Most distance travelled', icon: 'compass', metric: 'totalKm', unit: 'km', decimals: 1 },
  { key: 'spelunker', title: 'The Spelunker', desc: 'Most blocks mined', icon: 'pickaxe', metric: 'totalMined', unit: 'blocks mined' },
  { key: 'menace', title: 'The Menace', desc: 'Most TNT detonated', icon: 'bomb', metric: 'tnt', unit: 'TNT' },
  { key: 'reaper', title: 'The Reaper', desc: 'Most mob kills', icon: 'skull', metric: 'mobKills', unit: 'kills' },
  { key: 'glutton', title: 'The Glutton', desc: 'Most food eaten', icon: 'drumstick', metric: 'totalFood', unit: 'eaten' },
  { key: 'merchant', title: 'The Merchant', desc: 'Most villager trades', icon: 'coins', metric: 'traded', unit: 'trades' },
  { key: 'ninelives', title: 'The Cat-with-9-Lives', desc: 'Most deaths', icon: 'ghost', metric: 'deaths', unit: 'deaths' },
  { key: 'enchanter', title: 'The Enchanter', desc: 'Most items enchanted', icon: 'wand', metric: 'enchants', unit: 'enchants' },
  { key: 'graverobber', title: 'The Grave Robber', desc: 'Most chests opened', icon: 'chest', metric: 'chestsOpened', unit: 'chests' },
  { key: 'shepherd', title: 'The Shepherd', desc: 'Most animals bred', icon: 'sheep', metric: 'bred', unit: 'bred' },
  { key: 'marathoner', title: 'The Marathoner', desc: 'Most hours played', icon: 'clock', metric: 'playHours', unit: 'hours', decimals: 1 },
  { key: 'warlord', title: 'The Warlord', desc: 'Most player kills', icon: 'swords', metric: 'playerKills', unit: 'PvP kills' },
  { key: 'jumpingbean', title: 'The Jumping Bean', desc: 'Most jumps', icon: 'spring', metric: 'jumps', unit: 'jumps' },
  { key: 'completionist', title: 'The Completionist', desc: 'Most advancements', icon: 'trophy', metric: 'advancements', unit: 'advancements' },
  { key: 'fisherman', title: 'The Fisherman', desc: 'Most fish caught', icon: 'wave', metric: 'fishCaught', unit: 'fish caught' },
  { key: 'mole', title: 'The Mole', desc: 'Most deepslate mined', icon: 'pickaxe', metric: 'deepslateMined', unit: 'deepslate mined' },
]

// metrics offered when building a CUSTOM award
export const METRIC_OPTIONS = [
  ['playHours', 'Hours played'], ['totalKm', 'Distance (km)'], ['deaths', 'Deaths'],
  ['mobKills', 'Mob kills'], ['playerKills', 'Player kills'], ['totalMined', 'Blocks mined'],
  ['totalPlaced', 'Blocks placed'], ['diamonds', 'Diamonds mined'], ['deepslateMined', 'Deepslate mined'],
  ['totalFood', 'Food eaten'], ['tnt', 'TNT detonated'], ['traded', 'Villager trades'],
  ['jumps', 'Jumps'], ['chestsOpened', 'Chests opened'], ['slept', 'Nights slept'],
  ['bred', 'Animals bred'], ['enchants', 'Items enchanted'], ['fishCaught', 'Fish caught'],
  ['advancements', 'Advancements'], ['damageDealt', 'Damage dealt'], ['toolsBroken', 'Tools worn out'],
]

export function buildSuperlatives(players, awards = DEFAULT_AWARDS) {
  const out = []
  for (const a of awards) {
    let winner = null, best = -Infinity
    for (const p of players) {
      const v = p.metrics[a.metric] || 0
      if (v > best) { best = v; winner = p }
    }
    if (!winner || best <= 0) continue
    const dec = a.decimals || 0
    out.push({
      key: a.key, title: a.title, desc: a.desc, icon: a.icon || 'trophy',
      winner: winner.name, uuid: winner.uuid, value: best, unit: a.unit || '',
      stat: best.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
    })
  }
  return out
}

export function buildLeaderboards(players) {
  const board = (key, metric, unit) => ({
    key, unit,
    rows: [...players].sort((a, b) => (b.metrics[metric] || 0) - (a.metrics[metric] || 0)).slice(0, 10)
      .map((p) => ({ name: p.name, uuid: p.uuid, value: p.metrics[metric] || 0 })),
  })
  return [
    board('Hours Played', 'playHours', 'h'),
    board('Distance (km)', 'totalKm', 'km'),
    board('Mob Kills', 'mobKills', ''),
    board('Blocks Mined', 'totalMined', ''),
    board('Blocks Placed', 'totalPlaced', ''),
    board('Deaths', 'deaths', ''),
    board('Diamonds', 'diamonds', ''),
    board('Villager Trades', 'traded', ''),
  ]
}

// ---- top-level: turn raw uploaded files into the full wrapped dataset ------
export function computeWrapped({ statsByUuid, advByUuid = {}, namesByUuid = {}, awards, minHours = 0.1 }) {
  const players = []
  for (const [uuid, statsJson] of Object.entries(statsByUuid)) {
    const name = namesByUuid[uuid]
    if (!name) continue // unresolved (offline/bedrock) — skip
    let advCount = 0
    const adv = advByUuid[uuid]
    if (adv) {
      for (const [k, v] of Object.entries(adv)) {
        if (v && typeof v === 'object' && v.done && !k.startsWith('minecraft:recipes')) advCount++
      }
    }
    const p = computePlayer(uuid, name, statsJson, advCount)
    if (p.playHours < minHours) continue
    players.push(p)
  }
  players.sort((a, b) => b.playHours - a.playHours)

  const sum = (fn) => players.reduce((a, p) => a + fn(p), 0)
  const totals = {
    players: players.length,
    hours: Math.round(sum((p) => p.playHours)),
    deaths: sum((p) => p.deaths.total),
    mobKills: sum((p) => p.combat.mobKills),
    blocksMined: sum((p) => p.grind.totalMined),
    blocksPlaced: sum((p) => p.grind.totalPlaced),
    distanceKm: Math.round(sum((p) => p.movement.totalKm)),
    diamonds: sum((p) => p.grind.diamonds),
    tnt: sum((p) => p.life.tnt),
    trades: sum((p) => p.life.traded),
  }

  return {
    players,
    superlatives: buildSuperlatives(players, awards),
    leaderboards: buildLeaderboards(players),
    totals,
  }
}
