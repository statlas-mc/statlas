import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { resolveTheme, themeToVars } from './themes.js'
import {
  Icon, Counter, Reveal, useReveal, BlockIcon, headUrl, bodyUrl, fmt, fmt1, hoursToHuman, ticksToDuration,
} from './ui.jsx'

export const SECTIONS = [
  { key: 'playtime', label: 'Playtime' },
  { key: 'deaths', label: 'Death reel' },
  { key: 'grind', label: 'Grind identity' },
  { key: 'palette', label: 'Your palette' },
  { key: 'combat', label: 'Combat log' },
  { key: 'movement', label: 'Movement' },
  { key: 'life', label: 'Consumption & chaos' },
  { key: 'awards', label: 'Season titles' },
]

const DEFAULT_CONFIG = {
  server: 'My Server', season: 'Season 1', logoUrl: '', themeKey: 'ember', customAccent: null,
  sections: Object.fromEntries(SECTIONS.map((s) => [s.key, true])),
}

export default function Wrapped({ config = {}, data }) {
  const cfg = { ...DEFAULT_CONFIG, ...config, sections: { ...DEFAULT_CONFIG.sections, ...(config.sections || {}) } }
  const theme = resolveTheme(cfg.themeKey, cfg.customAccent)
  const [selected, setSelected] = useState(null) // null=home | uuid
  useEffect(() => { window.scrollTo(0, 0) }, [selected])

  if (!data || !data.players?.length) {
    return <div className="wr-root t-bg grid place-items-center text-2 p-10" style={themeToVars(theme)}>No player data yet.</div>
  }
  return (
    <div className="wr-root" style={themeToVars(theme)}>
      {selected
        ? <PlayerView cfg={cfg} data={data} uuid={selected} onBack={() => setSelected(null)} onOpen={setSelected} />
        : <HomeView cfg={cfg} data={data} onOpen={setSelected} />}
    </div>
  )
}

/* ======================= HOME ======================= */
const totalsMeta = [
  ['hours', 'Hours played', 'clock'], ['blocksMined', 'Blocks mined', 'pickaxe'],
  ['blocksPlaced', 'Blocks placed', 'hammer'], ['mobKills', 'Mobs slain', 'skull'],
  ['distanceKm', 'Kilometres travelled', 'compass'], ['deaths', 'Total deaths', 'ghost'],
  ['diamonds', 'Diamonds mined', 'sparkles'], ['trades', 'Villager trades', 'coins'],
]

function tagFor(p, data) {
  const sup = data.superlatives.find((s) => s.uuid === p.uuid)
  if (sup) return sup.title
  const dm = p.movement.dominant
  if (dm && dm.label.includes('Elytra')) return 'Sky Dweller'
  if (p.grind.totalPlaced > p.grind.totalMined) return 'Builder'
  if (p.combat.mobKills > 20000) return 'Mob Slayer'
  return dm ? dm.label : 'Survivor'
}

function HomeView({ cfg, data, onOpen }) {
  const { players, totals, superlatives, leaderboards } = data
  const [board, setBoard] = useState(0)
  const lb = leaderboards[board]
  return (
    <div className="t-bg grain min-h-screen relative">
      <header className="max-w-6xl mx-auto px-5 pt-12 pb-4 text-center relative z-10">
        {cfg.logoUrl && (
          <motion.img src={cfg.logoUrl} alt={cfg.server}
            initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-3xl shadow-2xl ring-accent animate-floaty object-cover" />
        )}
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
          className="mt-6 font-display font-bold text-5xl sm:text-7xl tracking-tight gradient-heat text-glow">{cfg.server}</motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.6 }}
          className="mt-2 text-lg sm:text-2xl font-semibold uppercase tracking-[0.35em] text-accent-soft">{cfg.season} · In Review</motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42, duration: 0.6 }}
          className="mt-5 text-2 max-w-xl mx-auto">
          {totals.players} players. One world. A whole season measured to the last block. Pick your name below.
        </motion.p>
      </header>

      <section className="max-w-6xl mx-auto px-5 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {totalsMeta.map(([key, label, icon], i) => (
            <Reveal key={key} delay={i * 0.04} y={20} className="card p-4 sm:p-5">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Icon name={icon} className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-1"><Counter value={totals[key]} /></div>
            </Reveal>
          ))}
        </div>
      </section>

      {superlatives.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 py-10">
          <SectionTitle icon="trophy" kicker="Season Superlatives" title="The Hall of Fame" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {superlatives.map((s, i) => (
              <Reveal key={s.key} delay={(i % 3) * 0.06} y={24}>
                <button onClick={() => onOpen(s.uuid)} className="card card-hover p-5 flex items-center gap-4 group w-full text-left">
                  <img src={headUrl(s.uuid, 96)} alt={s.winner} className="w-16 h-16 rounded-xl pixelated ring-accent" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-gold">
                      <Icon name={s.icon} className="w-4 h-4 shrink-0" />
                      <span className="font-display font-bold text-lg truncate">{s.title}</span>
                    </div>
                    <div className="text-1 font-semibold truncate">{s.winner}</div>
                    <div className="text-xs text-2">{s.desc}</div>
                    <div className="mt-1 stat-num text-sm text-accent font-semibold">{s.stat} <span className="text-3 font-normal">{s.unit}</span></div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-5 py-6">
        <SectionTitle icon="grid" kicker="Leaderboards" title="Who Topped the Charts" />
        <div className="flex flex-wrap gap-2 mt-6">
          {leaderboards.map((b, i) => (
            <button key={b.key} onClick={() => setBoard(i)}
              className={`px-3.5 py-2 rounded-full text-sm font-semibold transition ${i === board ? 'bg-accent text-black shadow-lg' : 'card text-2 hover:text-1'}`}>{b.key}</button>
          ))}
        </div>
        <div className="card mt-4 divide-y" style={{ borderColor: 'transparent' }}>
          {lb.rows.map((r, i) => {
            const max = lb.rows[0].value || 1
            return (
              <button key={r.uuid} onClick={() => onOpen(r.uuid)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-white/5 transition text-left border-t border-white/5 first:border-t-0">
                <span className={`w-7 text-center font-display font-bold ${i === 0 ? 'text-gold text-xl' : i < 3 ? 'text-accent-soft' : 'text-3'}`}>{i + 1}</span>
                <img src={headUrl(r.uuid, 48)} alt="" className="w-9 h-9 rounded-lg pixelated" />
                <span className="font-semibold text-1 w-32 sm:w-44 truncate">{r.name}</span>
                <div className="flex-1 hidden sm:block"><div className="h-2 rounded-full bar-accent" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} /></div>
                <span className="stat-num font-bold text-1 tabular-nums w-24 text-right">{fmt1(r.value)}<span className="text-3 text-xs ml-1">{lb.unit}</span></span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-10">
        <SectionTitle icon="compass" kicker={`${players.length} Players`} title="Open Your Recap" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {players.map((p, i) => (
            <Reveal key={p.uuid} delay={(i % 4) * 0.05} y={24}>
              <button onClick={() => onOpen(p.uuid)} className="card card-hover p-4 sm:p-5 block group h-full w-full text-left">
                <div className="flex items-start justify-between">
                  <img src={headUrl(p.uuid, 128)} alt={p.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl pixelated ring-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-accent-soft" style={{ background: 'color-mix(in srgb, var(--a5) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--a5) 22%, transparent)' }}>{tagFor(p, data)}</span>
                </div>
                <div className="mt-3 font-bold text-lg text-1 truncate">{p.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-2 text-sm"><Icon name="clock" className="w-3.5 h-3.5" />{hoursToHuman(p.playHours)} played</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-3">{fmt(p.combat.mobKills)} kills</span>
                  <span className="text-accent font-semibold inline-flex items-center gap-1">View <Icon name="arrow-left" className="w-3.5 h-3.5 rotate-180" /></span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
      <div className="pb-10" />
    </div>
  )
}

function SectionTitle({ icon, kicker, title }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-accent text-xs uppercase tracking-[0.25em] font-bold"><Icon name={icon} className="w-4 h-4" />{kicker}</div>
      <h2 className="mt-2 font-display font-bold text-3xl sm:text-4xl text-1">{title}</h2>
    </div>
  )
}

/* ======================= PLAYER ======================= */
function PlayerView({ cfg, data, uuid, onBack, onOpen }) {
  const p = data.players.find((x) => x.uuid === uuid)
  const titles = useMemo(() => data.superlatives.filter((s) => s.uuid === uuid), [data, uuid])
  const en = cfg.sections
  if (!p) return null
  const mv = p.movement
  const topModes = mv.modes.slice(0, 6)
  const maxMode = topModes[0]?.cm || 1
  const causes = Object.entries(p.deaths.causes).slice(0, 4)
  const maxCause = causes[0]?.[1] || 1
  const buildTotal = p.grind.totalPlaced + p.grind.totalMined || 1
  const buildPct = Math.round((p.grind.totalPlaced / buildTotal) * 100)

  return (
    <div className="snap-y-story t-bg grain relative">
      <div className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3" style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--bg2) 80%, transparent), transparent)' }}>
        <button onClick={onBack} className="inline-flex items-center gap-2 text-2 hover:text-1 font-semibold text-sm"><Icon name="arrow-left" className="w-4 h-4" /> All players</button>
        <span className="text-3 text-sm font-semibold">{cfg.server} · {cfg.season}</span>
      </div>

      {/* intro */}
      <Section>
        <div className="text-center">
          <motion.img src={bodyUrl(p.uuid, 380)} alt={p.name}
            initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="h-56 sm:h-72 mx-auto pixelated" style={{ filter: 'drop-shadow(0 20px 40px color-mix(in srgb, var(--a5) 35%, transparent))' }} />
          <p className="mt-6 uppercase tracking-[0.4em] text-accent text-xs sm:text-sm font-bold">{cfg.server} · {cfg.season}</p>
          <h1 className="mt-3 font-display font-bold text-5xl sm:text-7xl gradient-heat text-glow">{p.name}</h1>
          <p className="mt-4 text-2 text-lg">Here's your season in review.</p>
          <div className="mt-10 text-3 text-sm flex flex-col items-center gap-1"><span>Scroll to begin</span><Icon name="arrow-down" className="w-5 h-5 animate-bounce" /></div>
        </div>
      </Section>

      {en.playtime && (
        <Section>
          <Reveal><Kicker icon="clock">Time in the world</Kicker>
            <H>You played <span className="gradient-heat"><Counter value={p.playHours} suffix=" hours" /></span></H>
            <Lead>That's <b className="text-1">{p.playDays} full days</b> living inside {cfg.server} — not sleeping, not eating, just <i>here</i>.</Lead>
            <div className="grid grid-cols-3 gap-3 mt-8 max-w-lg mx-auto">
              <Mini label="Days lived" value={<Counter value={p.playDays} decimals={1} />} />
              <Mini label="Times slept" value={<Counter value={p.life.slept} />} />
              <Mini label="Longest survival" value={ticksToDuration(p.deaths.survivalStreakTicks)} raw />
            </div>
          </Reveal>
        </Section>
      )}

      {en.deaths && (
        <Section>
          <Reveal><Kicker icon="skull">The death reel</Kicker>
            <H>You died <span className="text-danger"><Counter value={p.deaths.total} /></span> times</H>
            {p.deaths.nemesis && <Lead>And your nemesis? <b className="text-danger">{p.deaths.nemesis.name}</b> got you <b className="text-1">{p.deaths.nemesis.count}</b> times. You two have history.</Lead>}
            <div className="mt-8 max-w-lg mx-auto space-y-2.5 text-left">
              {causes.map(([name, n], i) => <BarRow key={name} label={name} value={n} pct={(n / maxCause) * 100} bar="bar-danger" i={i} />)}
            </div>
          </Reveal>
        </Section>
      )}

      {en.grind && (
        <Section>
          <Reveal><Kicker icon="pickaxe">Who you really are</Kicker>
            <H><span className="gradient-heat"><Counter value={p.grind.diamonds} /></span> diamonds mined</H>
            {p.grind.topMined && <Lead>…but <b className="text-1">{fmt(p.grind.topMined.count)} {p.grind.topMined.name}</b>. Be honest about who you are.</Lead>}
            <div className="grid sm:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
              {p.grind.signature && (
                <div className="card p-4"><div className="flex items-center gap-3">
                  <BlockIcon id={p.grind.signature.id} size={44} className="rounded-md" />
                  <div className="text-left"><div className="text-xs uppercase tracking-wider text-accent">Signature block</div>
                    <div className="font-bold text-1">{p.grind.signature.name}</div><div className="text-sm text-2">{fmt(p.grind.signature.count)} placed</div></div>
                </div></div>
              )}
              <div className="card p-4"><div className="text-xs uppercase tracking-wider text-accent mb-2 text-left">Builder vs Destroyer</div>
                <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'color-mix(in srgb, var(--a7) 40%, transparent)' }}><div className="bar-gold" style={{ width: `${buildPct}%` }} /></div>
                <div className="flex justify-between text-xs mt-1.5 text-2"><span>{fmt(p.grind.totalPlaced)} placed</span><span>{fmt(p.grind.totalMined)} mined</span></div>
              </div>
            </div>
            {p.grind.topMinedList?.length > 0 && (
              <div className="mt-4 max-w-2xl mx-auto flex flex-wrap justify-center gap-2">
                {p.grind.topMinedList.slice(0, 6).map((b) => (
                  <span key={b.id} className="card px-3 py-2 inline-flex items-center gap-2 text-sm"><BlockIcon id={b.id} size={22} className="rounded-sm" /><span className="text-2">{b.name}</span><span className="stat-num text-accent font-semibold">{fmt(b.count)}</span></span>
                ))}
              </div>
            )}
          </Reveal>
        </Section>
      )}

      {en.palette && p.grind.topPlacedList?.length > 0 && (
        <Section>
          <Reveal><Kicker icon="hammer">Your palette</Kicker>
            <H>You placed <span className="gradient-heat"><Counter value={p.grind.totalPlaced} /></span> blocks</H>
            <Lead>Every base has a secret recipe. This is what {p.name}'s world is quietly made of.</Lead>
            <div className="mt-8 max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              {p.grind.topPlacedList.slice(0, 8).map((b, i) => <PaletteTile key={b.id} b={b} i={i} max={p.grind.topPlacedList[0]?.count || 1} />)}
            </div>
          </Reveal>
        </Section>
      )}

      {en.combat && (
        <Section>
          <Reveal><Kicker icon="sword">The combat log</Kicker>
            <H><span className="gradient-heat"><Counter value={p.combat.mobKills} /></span> mobs slain</H>
            <Lead>You dealt <b className="text-1">{fmt(p.combat.damageDealt)}</b> damage and took <b className="text-danger">{fmt(p.combat.damageTaken)}</b> back.{p.combat.playerKills > 0 && <> {p.combat.playerKills} of those kills were… other players.</>}</Lead>
            <div className="mt-8 max-w-lg mx-auto space-y-2.5 text-left">
              {p.combat.topKills.slice(0, 5).map((k, i) => <BarRow key={k.id} label={k.name} value={k.count} pct={(k.count / (p.combat.topKills[0]?.count || 1)) * 100} bar="bar-accent" i={i} />)}
            </div>
          </Reveal>
        </Section>
      )}

      {en.movement && (
        <Section>
          <Reveal><Kicker icon="compass">Your movement fingerprint</Kicker>
            {mv.dominant && <H>You're {/^[aeiou]/i.test(mv.dominant.label) ? 'an' : 'a'} <span className="gradient-heat">{mv.dominant.label.replace('-flew', ' flyer').replace('flew', 'flyer')}</span></H>}
            <Lead>You covered <b className="text-1">{fmt1(mv.totalKm)} km</b> this season — about <b className="text-1">{mv.comparison}</b>.</Lead>
            <div className="mt-8 max-w-lg mx-auto space-y-2 text-left">
              {topModes.map((m, i) => <MoveBar key={m.label} m={m} i={i} maxMode={maxMode} />)}
            </div>
          </Reveal>
        </Section>
      )}

      {en.life && (
        <Section>
          <Reveal><Kicker icon="drumstick">Consumption & chaos</Kicker>
            {p.life.favFood ? <H><span className="gradient-heat"><Counter value={p.life.totalFood} /></span> meals eaten</H> : <H><span className="gradient-heat"><Counter value={p.life.tnt} /></span> TNT detonated</H>}
            {p.life.favFood && <Lead>Your comfort food was <b className="text-1">{p.life.favFood.name}</b> — {fmt(p.life.favFood.count)} of them.</Lead>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-2xl mx-auto">
              <Mini icon="tnt" label="TNT lit" value={<Counter value={p.life.tnt} />} />
              <Mini icon="coins" label="Villager trades" value={<Counter value={p.life.traded} />} />
              <Mini icon="spring" label="Jumps" value={<Counter value={p.life.jumps} />} />
              <Mini icon="sheep" label="Animals bred" value={<Counter value={p.life.bred} />} />
              <Mini icon="wand" label="Items enchanted" value={<Counter value={p.life.enchants} />} />
              <Mini icon="chest" label="Chests opened" value={<Counter value={p.life.chestsOpened} />} />
              <Mini icon="bed" label="Nights slept" value={<Counter value={p.life.slept} />} />
              <Mini icon="wave" label="Fish caught" value={<Counter value={p.life.fishCaught} />} />
            </div>
          </Reveal>
        </Section>
      )}

      {en.awards && titles.length > 0 && (
        <Section>
          <Reveal><Kicker icon="trophy">Your season title{titles.length > 1 ? 's' : ''}</Kicker>
            <div className="grid gap-4 mt-4 max-w-xl mx-auto">
              {titles.map((t) => (
                <div key={t.key} className="card p-6 text-center" style={{ borderColor: 'color-mix(in srgb, var(--gold) 30%, transparent)' }}>
                  <Icon name={t.icon} className="w-10 h-10 mx-auto text-gold" />
                  <div className="mt-3 font-display font-bold text-4xl sm:text-5xl gradient-heat">{t.title}</div>
                  <div className="mt-2 text-2">{t.desc} — <b className="text-1">{t.stat} {t.unit}</b></div>
                  <div className="mt-1 text-xs text-3">#1 on the entire server</div>
                </div>
              ))}
            </div>
          </Reveal>
        </Section>
      )}

      {/* outro */}
      <Section>
        <Reveal>
          <img src={headUrl(p.uuid, 96)} alt="" className="w-16 h-16 rounded-xl pixelated mx-auto ring-accent" />
          <H className="mt-5">That's your season, {p.name}.</H>
          <Lead>{cfg.server} {cfg.season} · {p.playDays} days well spent.</Lead>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-2xl mx-auto">
            <Mini label="Hours" value={hoursToHuman(p.playHours)} raw />
            <Mini label="Deaths" value={fmt(p.deaths.total)} raw />
            <Mini label="Mob kills" value={fmt(p.combat.mobKills)} raw />
            <Mini label="Distance" value={`${fmt(mv.totalKm)} km`} raw />
          </div>
          <button onClick={onBack} className="mt-10 px-5 py-3 rounded-full card font-semibold text-1 inline-flex items-center gap-2"><Icon name="grid" className="w-4 h-4" /> All players</button>
        </Reveal>
      </Section>
    </div>
  )
}

/* ---- primitives ---- */
function Section({ children }) {
  return <section className="snap-section relative grid place-items-center px-5 py-20"><div className="relative w-full max-w-3xl">{children}</div></section>
}
function Kicker({ icon, children }) {
  return <div className="inline-flex items-center gap-2 text-accent text-xs uppercase tracking-[0.3em] font-bold mb-4"><Icon name={icon} className="w-4 h-4" /> {children}</div>
}
function H({ children, className = '' }) {
  return <h2 className={`font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-1 ${className}`}>{children}</h2>
}
function Lead({ children }) {
  return <p className="mt-5 text-lg sm:text-xl text-2 max-w-xl mx-auto leading-relaxed">{children}</p>
}
function Mini({ label, value, icon }) {
  return <div className="card p-4">{icon && <Icon name={icon} className="w-4 h-4 text-accent mx-auto mb-1.5" />}<div className="text-2xl font-extrabold text-1">{value}</div><div className="text-[11px] uppercase tracking-wider text-2 mt-1">{label}</div></div>
}
function BarRow({ label, value, pct, bar, i }) {
  const [ref, shown] = useReveal({ amount: 0.05 })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -16 }} animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }} transition={{ delay: i * 0.07, duration: 0.5 }} className="flex items-center gap-3">
      <span className="w-32 text-sm text-2 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--a7) 25%, transparent)' }}>
        <motion.div initial={{ width: 0 }} animate={shown ? { width: `${Math.max(4, pct)}%` } : { width: 0 }} transition={{ delay: i * 0.07 + 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className={`h-full rounded-full ${bar}`} />
      </div>
      <span className="w-14 text-right stat-num text-sm text-1">{fmt(value)}</span>
    </motion.div>
  )
}
function MoveBar({ m, i, maxMode }) {
  const [ref, shown] = useReveal({ amount: 0.05 })
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span className="w-6 text-accent"><Icon name={m.icon} className="w-4 h-4" /></span>
      <span className="w-28 text-sm text-2 shrink-0">{m.label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--a7) 25%, transparent)' }}>
        <motion.div initial={{ width: 0 }} animate={shown ? { width: `${Math.max(3, (m.cm / maxMode) * 100)}%` } : { width: 0 }} transition={{ delay: i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full bar-accent" />
      </div>
      <span className="w-20 text-right stat-num text-sm text-1">{fmt1(m.km)} km</span>
    </div>
  )
}
function PaletteTile({ b, i, max }) {
  const [ref, shown] = useReveal({ amount: 0.05 })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.85 }} animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }} transition={{ delay: i * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`card p-3 flex flex-col items-center gap-1.5 ${i === 0 ? 'col-span-2 sm:col-span-1' : ''}`} style={i === 0 ? { boxShadow: '0 0 0 1px color-mix(in srgb, var(--gold) 40%, transparent)' } : undefined}>
      <BlockIcon id={b.id} size={i === 0 ? 52 : 40} className="rounded-md" />
      <div className="text-[11px] text-2 text-center leading-tight line-clamp-2">{b.name}</div>
      <div className="stat-num text-sm font-bold text-accent-soft">{fmt(b.count)}</div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--a7) 25%, transparent)' }}>
        <motion.div initial={{ width: 0 }} animate={shown ? { width: `${Math.max(8, (b.count / max) * 100)}%` } : { width: 0 }} transition={{ delay: i * 0.05 + 0.15, duration: 0.7 }} className="h-full rounded-full bar-gold" />
      </div>
    </motion.div>
  )
}
