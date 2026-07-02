import { useEffect, useRef, useState } from 'react'
import { playSound } from '../game/sound'
import type { SoundKind } from '../game/sound'
import type { FountainEvent, FountainKind } from '../game/types'
import type { CSSProperties } from 'react'

interface StreakFountainProps {
  events: FountainEvent[]
}

// v0.3.5 Streak Fountain. Turns the reducer's capped ring of FountainEvents into
// short-lived floating-combat-text particles (WoW / MikScrollingBattleText feel):
// each burst drifts up-and-out from the chart/button area, then fades. Fully
// non-blocking (pointer-events: none), no modal, no click, capped particle count.
const PARTICLE_MS = 1300
// Hard backstop on live DOM particles regardless of how fast events arrive.
const MAX_PARTICLES = 16

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

// Random-ish spawn geometry, seeded off the event id so a given burst is stable
// across re-renders. Returns CSS custom props the stylesheet animates.
function particleStyle(id: number): CSSProperties {
  const r = Math.sin(id * 51.13) * 43758.5453
  const rand = r - Math.floor(r)
  const r2 = Math.sin(id * 12.99) * 24634.31
  const rand2 = r2 - Math.floor(r2)

  // Start offset across the lane, and outward horizontal drift.
  const startX = Math.round((rand - 0.5) * 150)
  const driftX = Math.round((rand2 - 0.5) * 90)
  const tilt = Math.round((rand2 - 0.5) * 14)

  return {
    left: `calc(50% + ${startX}px)`,
    '--fx-drift': `${driftX}px`,
    '--fx-tilt': `${tilt}deg`,
  } as CSSProperties
}

export function StreakFountain({ events }: StreakFountainProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const lastSeenId = useRef(0)

  useEffect(() => {
    // Graduation / reset rewinds fountainSeq to 0. If the newest id is below our
    // watermark, the sequence restarted — rewind so fresh events show again.
    const maxId = events.length > 0 ? Math.max(...events.map((event) => event.id)) : 0
    if (maxId < lastSeenId.current) {
      lastSeenId.current = 0
    }

    const fresh = events.filter((event) => event.id > lastSeenId.current)

    if (fresh.length === 0) {
      return
    }

    lastSeenId.current = Math.max(lastSeenId.current, ...fresh.map((event) => event.id))

    for (const event of fresh) {
      const sound = KIND_SOUND[event.kind]
      if (sound) {
        playSound(sound)
      }
    }

    const now = Date.now()
    setParticles((prev) =>
      [...prev, ...fresh.map((event) => ({ id: event.id, text: event.text, kind: event.kind, spawnedAt: now }))].slice(
        -MAX_PARTICLES,
      ),
    )
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
        <span key={particle.id} className={`fountain-hit fountain-${particle.kind}`} style={particleStyle(particle.id)}>
          {particle.text}
        </span>
      ))}
    </div>
  )
}
