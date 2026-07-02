import { useEffect, useRef, useState } from 'react'
import { chartPath } from '../game/tick'
import type { TapEffect } from '../game/types'

interface FakeChartProps {
  points: number[]
  progress: number
  tier: number
  milestoneLabel: string
  tapEffect: TapEffect | null
}

const TAP_FLASH_MS = 350
const MILESTONE_PULSE_MS = 750

export function FakeChart({ points, progress, tier, milestoneLabel, tapEffect }: FakeChartProps) {
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

  return (
    <section
      className={`chart-panel hero-chart ${tapFlash ? 'tap-flash' : ''} ${milestonePulse ? 'milestone-pulse' : ''}`}
      aria-label="Fake chart"
    >
      <div className="chart-header">
        <span>{milestoneLabel}</span>
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fictional chart">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#52ff88" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#52ff88" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0,${height} L${path.replaceAll(' ', ' L')} L${width},${height} Z`} fill="url(#chartFill)" />
        <polyline points={path} fill="none" stroke={isUp ? '#52ff88' : '#ff4d5d'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" x2={width} y1="118" y2="118" stroke="#282828" strokeDasharray="7 8" />
        <line x1="0" x2={width} y1="72" y2="72" stroke="#282828" strokeDasharray="7 8" />
      </svg>
      <div className="curve-rail" aria-label="Bonding curve progress">
        <div className="curve-rail-track">
          <div className="curve-rail-fill" style={{ width: `${clamped}%` }} />
        </div>
        <strong className="curve-rail-value">{clamped.toFixed(1)}%</strong>
      </div>
      <p className="safety-line">Fictional arcade chart. No market data, no trading signal.</p>
    </section>
  )
}
