import { useEffect, useRef, useState } from 'react'
import { getSurfZone, getTierFloor } from '../game/economy'
import { chartPath } from '../game/tick'
import type { TapEffect } from '../game/types'

interface FakeChartProps {
  points: number[]
  progress: number
  tier: number
  milestoneLabel: string
  tapEffect: TapEffect | null
  isDecaying: boolean
  surfPressure: number
}

const TAP_FLASH_MS = 350
const MILESTONE_PULSE_MS = 750

export function FakeChart({ points, progress, tier, milestoneLabel, tapEffect, isDecaying, surfPressure }: FakeChartProps) {
  const width = 360
  const height = 150
  const path = chartPath(points, width, height)
  const last = points.at(-1) ?? 0
  const first = points[0] ?? last
  const isUp = last >= first
  const clamped = Math.max(0, Math.min(100, progress))

  const [tapFlash, setTapFlash] = useState(false)
  const [milestonePulse, setMilestonePulse] = useState(false)
  const lastTapId = useRef<number | null>(null)
  const lastTier = useRef(tier)

  useEffect(() => {
    if (!tapEffect || tapEffect.id === lastTapId.current) {
      return
    }

    lastTapId.current = tapEffect.id
    setTapFlash(true)
    const timeout = window.setTimeout(() => setTapFlash(false), TAP_FLASH_MS)

    return () => window.clearTimeout(timeout)
  }, [tapEffect])

  useEffect(() => {
    if (tier <= lastTier.current) {
      lastTier.current = tier
      return
    }

    lastTier.current = tier
    setMilestonePulse(true)
    const timeout = window.setTimeout(() => setMilestonePulse(false), MILESTONE_PULSE_MS)

    return () => window.clearTimeout(timeout)
  }, [tier])

  // v0.3.2 Surf zones. The chart is the surf/pressure meter now: the sparkline
  // follows surfPressure, so `zone` drives coloring + the header label. The
  // "Overheated"/"Graduation Push" zones get the shakes instead of keying purely
  // off bonding-curve progress (which no longer sits pinned at max).
  const zone = getSurfZone(surfPressure)
  const unstable = zone.zone === 'overheated' || zone.zone === 'graduation'
  const dumping = !isUp

  // v0.3 Chart Gravity: a floor marker showing what the current milestone
  // permanently protects, plus a status flag communicating decay vs. held.
  const floor = getTierFloor(tier)
  const atFloor = floor > 0 && clamped <= floor + 0.15 && clamped < 100
  const gravityFlag = isDecaying ? '▼ CURVE BLEEDING' : atFloor ? 'MILESTONE HELD' : null
  const gravityFlagKind = isDecaying ? 'bleeding' : 'held'

  return (
    <section
      className={`chart-panel hero-chart surf-${zone.zone} ${tapFlash ? 'tap-flash' : ''} ${
        milestonePulse ? 'milestone-pulse' : ''
      } ${dumping ? 'dumping' : ''} ${unstable ? 'unstable' : ''} ${isDecaying ? 'decaying' : ''}`}
      aria-label="Fake chart"
    >
      {gravityFlag ? <span className={`chart-gravity-flag ${gravityFlagKind}`}>{gravityFlag}</span> : null}
      <div className="chart-header">
        <span className={`surf-zone-label surf-${zone.zone}`}>{zone.label}</span>
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fictional chart">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#46ff9b' : '#ff3b52'} stopOpacity="0.36" />
            <stop offset="100%" stopColor={isUp ? '#46ff9b' : '#ff3b52'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="chart-fill" d={`M0,${height} L${path.replaceAll(' ', ' L')} L${width},${height} Z`} fill="url(#chartFill)" />
        <polyline points={path} fill="none" stroke={isUp ? '#46ff9b' : '#ff3b52'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" x2={width} y1="118" y2="118" stroke="#282828" strokeDasharray="7 8" />
        <line x1="0" x2={width} y1="72" y2="72" stroke="#282828" strokeDasharray="7 8" />
      </svg>
      <div className={`curve-rail ${isDecaying ? 'decaying' : ''}`} aria-label="Bonding curve progress">
        <span className="curve-rail-label">{milestoneLabel}</span>
        <div className="curve-rail-track">
          <div className="curve-rail-fill" style={{ width: `${clamped}%` }} />
          {floor > 0 ? (
            <div
              className="curve-rail-floor"
              style={{ left: `${floor}%` }}
              aria-label={`Milestone floor at ${floor}%`}
              title={`Milestone floor: ${floor}% (gravity can't drop below this)`}
            />
          ) : null}
        </div>
        <strong className="curve-rail-value">{clamped.toFixed(1)}%</strong>
      </div>
      <p className="safety-line">Fictional arcade chart. No market data, no trading signal.</p>
    </section>
  )
}
