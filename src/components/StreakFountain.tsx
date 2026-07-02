import { useEffect, useRef, useState } from 'react'
import { playSound } from '../game/sound'
import type { SoundKind } from '../game/sound'
import type { FountainEvent, FountainKind } from '../game/types'
import type { CSSProperties } from 'react'

interface StreakFountainProps {
  events: FountainEvent[]
}

// v0.3.5 Streak Fountain, v0.4B Focus + Spam Punishment pass. Turns the reducer's
// capped ring of FountainEvents into short-lived floating-combat-text particles
// (WoW / MikScrollingBattleText feel). Rendered INSIDE the chart panel (see
// FakeChart) so lane positions below are relative to the panel's own box, not the
// viewport — this is what keeps text off the resistance line/Smash Window.
const PARTICLE_MS = 1300
// Hard backstop on live DOM particles regardless of how fast events arrive.
const MAX_PARTICLES = 8
// v0.4B: loud, rare beats (breakout/reject/milestone/overdrive/supercharge) get
// their own visible-count budget so they're never crowded out by filler; quiet
// filler (crit sparkle) gets a smaller one of its own. v0.4D: prominent capped to
// a single visible event at a time (was 3) — the design now wants at most one
// major event text on screen, with the persistent combo badge and reward chip
// covering everything else.
const MAX_PROMINENT_VISIBLE = 1
const MAX_MINOR_VISIBLE = 2

interface Particle {
  id: number
  text: string
  kind: FountainKind
  spawnedAt: number
}

// Only the loud kinds get a sound hook; gain/chain stay silent to avoid a machine
// gun. Every kind is still a no-op today (see game/sound.ts).
const KIND_SOUND: Partial<Record<FountainKind, SoundKind>> = {
  crit: 'crit',
  milestone: 'streak',
  supercharge: 'supercharge',
  overdrive: 'overdrive',
}

const PROMINENT_KINDS = new Set<FountainKind>(['breakout', 'reject', 'milestone', 'overdrive', 'supercharge'])

// v0.4B: minimum gap (ms) between two particles of the same kind. Loud kinds
// already self-space via their event-beat hold windows (see chart.ts /
// reducer.ts) — this is just a safety net. Quiet kinds get a real cooldown so a
// fast masher can't flood one lane with duplicate text.
const KIND_COOLDOWN_MS: Partial<Record<FountainKind, number>> = {
  crit: 750,
  gain: 900,
  breakout: 250,
  reject: 250,
  milestone: 350,
  supercharge: 350,
  overdrive: 350,
}

// v0.4B: every lane lives in the chart's left ~40% column, which the resistance
// line/Smash Window (right ~44%, see FakeChart's segmentX) never occupies at any
// price — so combat text can never land on top of the live target, regardless of
// where the line currently sits vertically. Kinds are then spread top/mid/bottom
// within that column so simultaneous bursts don't stack on each other either.
const LANE_BY_KIND: Partial<Record<FountainKind, 'top' | 'mid' | 'bottom'>> = {
  breakout: 'top',
  milestone: 'top',
  overdrive: 'top',
  supercharge: 'mid',
  crit: 'mid',
  gain: 'mid',
  reject: 'bottom',
}

// Deterministic per-id jitter (small — the lane column is narrow) plus the lane's
// fixed anchor. Returns CSS custom props the stylesheet animates.
function particleStyle(id: number, lane: 'top' | 'mid' | 'bottom'): CSSProperties {
  const r = Math.sin(id * 51.13) * 43758.5453
  const rand = r - Math.floor(r)
  const r2 = Math.sin(id * 12.99) * 24634.31
  const rand2 = r2 - Math.floor(r2)

  const jitterX = Math.round(rand * 22)
  const driftX = Math.round((rand2 - 0.5) * 24)
  const tilt = Math.round((rand2 - 0.5) * 8)

  const base: CSSProperties = {
    left: `${8 + jitterX}px`,
    '--fx-drift': `${driftX}px`,
    '--fx-tilt': `${tilt}deg`,
  } as CSSProperties

  // v0.4B: nudged clear of the fixed top-row flags (chart-gravity-flag sits at
  // left:10/top:46; unstable/overheat/overdrive flags are center or right-anchored
  // — see theme.css) and of the curve-rail's own label at the panel's bottom edge.
  // The rise animation is short (see fountain-rise, -20px) so a lane's text stays
  // near its anchor for its whole life instead of drifting into a neighbor.
  if (lane === 'top') {
    return { ...base, top: '76px' }
  }
  if (lane === 'bottom') {
    return { ...base, bottom: '56px' }
  }
  return { ...base, top: '46%' }
}

export function StreakFountain({ events }: StreakFountainProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const lastSeenId = useRef(0)
  const lastKindAt = useRef<Partial<Record<FountainKind, number>>>({})

  useEffect(() => {
    // Graduation / reset rewinds fountainSeq to 0. If the newest id is below our
    // watermark, the sequence restarted — rewind so fresh events show again.
    const maxId = events.length > 0 ? Math.max(...events.map((event) => event.id)) : 0
    if (maxId < lastSeenId.current) {
      lastSeenId.current = 0
      lastKindAt.current = {}
    }

    const fresh = events.filter((event) => event.id > lastSeenId.current)

    if (fresh.length === 0) {
      return
    }

    lastSeenId.current = Math.max(lastSeenId.current, ...fresh.map((event) => event.id))

    const now = Date.now()
    const accepted: Particle[] = []

    for (const event of fresh) {
      const cooldown = KIND_COOLDOWN_MS[event.kind] ?? 0
      const lastAt = lastKindAt.current[event.kind] ?? 0
      if (cooldown > 0 && now - lastAt < cooldown) {
        continue
      }
      lastKindAt.current[event.kind] = now
      accepted.push({ id: event.id, text: event.text, kind: event.kind, spawnedAt: now })

      const sound = KIND_SOUND[event.kind]
      if (sound) {
        playSound(sound)
      }
    }

    if (accepted.length === 0) {
      return
    }

    setParticles((prev) => {
      const merged = [...prev, ...accepted].slice(-MAX_PARTICLES)
      const prominent = merged.filter((particle) => PROMINENT_KINDS.has(particle.kind)).slice(-MAX_PROMINENT_VISIBLE)
      const minor = merged.filter((particle) => !PROMINENT_KINDS.has(particle.kind)).slice(-MAX_MINOR_VISIBLE)
      const keepIds = new Set([...prominent, ...minor].map((particle) => particle.id))
      return merged.filter((particle) => keepIds.has(particle.id))
    })
  }, [events])

  // A single interval prunes expired particles (cheaper than a timer per burst,
  // and self-corrects if several land in the same frame).
  useEffect(() => {
    if (particles.length === 0) {
      return
    }

    const id = window.setInterval(() => {
      const cutoff = Date.now() - PARTICLE_MS
      setParticles((prev) => prev.filter((particle) => particle.spawnedAt > cutoff))
    }, 200)

    return () => window.clearInterval(id)
  }, [particles.length])

  if (particles.length === 0) {
    return null
  }

  return (
    <div className="streak-fountain" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`fountain-hit fountain-${particle.kind}`}
          style={particleStyle(particle.id, LANE_BY_KIND[particle.kind] ?? 'mid')}
        >
          {particle.text}
        </span>
      ))}
    </div>
  )
}
