import { useEffect, useRef, useState } from 'react'
import { OVERHEAT, type Candle, type ChartState } from '../game/chart'
import { getSurfZone, getTierFloor } from '../game/economy'
import type { TapEffect } from '../game/types'

interface FakeChartProps {
  chart: ChartState
  progress: number
  tier: number
  milestoneLabel: string
  tapEffect: TapEffect | null
  isDecaying: boolean
}

const TAP_FLASH_MS = 220
const MILESTONE_PULSE_MS = 750

const WIDTH = 360
const HEIGHT = 150

// price (0–100) → svg y (inverted).
function priceToY(price: number): number {
  return HEIGHT - (Math.max(0, Math.min(100, price)) / 100) * HEIGHT
}

export function FakeChart({ chart, progress, tier, milestoneLabel, tapEffect, isDecaying }: FakeChartProps) {
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

  // The in-progress candle rides along the completed history so the chart reacts
  // to the very latest tick/tap.
  const current: Candle = { open: chart.open, high: chart.high, low: chart.low, close: chart.price }
  const candles = [...chart.candles, current]
  const visible = candles.slice(-34)

  const last = visible.at(-1) ?? current
  const isUp = last.close >= last.open

  // Zones + overheat drive the panel state. The chart price (not the pinned curve
  // progress) decides "Surf"/"Overheated", so the panel is never stuck maxed.
  const zone = getSurfZone(chart.price)
  const overheated = chart.heat > OVERHEAT
  const unstable = zone.zone === 'overheated' || zone.zone === 'graduation' || overheated
  const dumping = !isUp

  // v0.3 Chart Gravity: a floor marker showing what the current milestone
  // permanently protects, plus a status flag communicating decay vs. held.
  const floor = getTierFloor(tier)
  const atFloor = floor > 0 && clamped <= floor + 0.15 && clamped < 100
  const gravityFlag = isDecaying ? '▼ CURVE BLEEDING' : atFloor ? 'MILESTONE HELD' : null
  const gravityFlagKind = isDecaying ? 'bleeding' : 'held'

  const slot = WIDTH / visible.length
  const bodyWidth = Math.max(1.5, slot * 0.62)

  return (
    <section
      className={`chart-panel hero-chart surf-${zone.zone} ${tapFlash ? 'tap-flash' : ''} ${
        milestonePulse ? 'milestone-pulse' : ''
      } ${dumping ? 'dumping' : ''} ${unstable ? 'unstable' : ''} ${isDecaying ? 'decaying' : ''} ${
        overheated ? 'overheated' : ''
      }`}
      aria-label="Fake chart"
    >
      {gravityFlag ? <span className={`chart-gravity-flag ${gravityFlagKind}`}>{gravityFlag}</span> : null}
      {overheated ? <span className="chart-overheat-flag">OVERHEATED — LET IT BREATHE</span> : null}
      <div className="chart-header">
        <span className={`surf-zone-label surf-${zone.zone}`}>
          {zone.label} · {Math.round(chart.price)}
        </span>
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Fictional candlestick chart">
        {/* Surf-zone band (45–75): the sweet spot the player wants to ride. */}
        <rect className="chart-surf-band" x="0" y={priceToY(75)} width={WIDTH} height={priceToY(45) - priceToY(75)} />
        <line x1="0" x2={WIDTH} y1={priceToY(75)} y2={priceToY(75)} stroke="#2c2c2c" strokeDasharray="6 7" />
        <line x1="0" x2={WIDTH} y1={priceToY(45)} y2={priceToY(45)} stroke="#2c2c2c" strokeDasharray="6 7" />
        {visible.map((candle, index) => {
          const cx = index * slot + slot / 2
          const up = candle.close >= candle.open
          const color = up ? '#46ff9b' : '#ff3b52'
          const bodyTop = priceToY(Math.max(candle.open, candle.close))
          const bodyBottom = priceToY(Math.min(candle.open, candle.close))
          const bodyH = Math.max(1.2, bodyBottom - bodyTop)
          const isCurrent = index === visible.length - 1

          return (
            <g key={index} opacity={isCurrent ? 1 : 0.92}>
              <line x1={cx} x2={cx} y1={priceToY(candle.high)} y2={priceToY(candle.low)} stroke={color} strokeWidth="1.5" />
              <rect
                x={cx - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyH}
                fill={color}
                opacity={up ? 0.9 : 0.85}
              />
            </g>
          )
        })}
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
