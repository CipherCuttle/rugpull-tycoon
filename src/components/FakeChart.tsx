import { useEffect, useRef, useState } from 'react'
import { OVERHEAT, type Candle, type ChartState } from '../game/chart'
import { getSurfZone, getTierFloor } from '../game/economy'
import type { ResistanceState, TapEffect } from '../game/types'

interface FakeChartProps {
  chart: ChartState
  progress: number
  tier: number
  milestoneLabel: string
  tapEffect: TapEffect | null
  resistance: ResistanceState
  isDecaying: boolean
  // v0.3.5: streak-mastery aura states (visual only).
  supercharged: boolean
  overdrive: boolean
}

const TAP_FLASH_MS = 220
const MILESTONE_PULSE_MS = 750

const WIDTH = 360
const HEIGHT = 150

// price (0–100) → svg y (inverted).
function priceToY(price: number): number {
  return HEIGHT - (Math.max(0, Math.min(100, price)) / 100) * HEIGHT
}

export function FakeChart({
  chart,
  progress,
  tier,
  milestoneLabel,
  tapEffect,
  resistance,
  isDecaying,
  supercharged,
  overdrive,
}: FakeChartProps) {
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
  const now = Date.now()
  const windowActive = resistance.windowUntil > now
  const distanceToResistance = resistance.price - chart.price
  const resistanceClose = distanceToResistance <= 18 && distanceToResistance >= -6
  const rating = tapEffect?.rating

  // v0.3 Chart Gravity: a floor marker showing what the current milestone
  // permanently protects, plus a status flag communicating decay vs. held.
  const floor = getTierFloor(tier)
  const atFloor = floor > 0 && clamped <= floor + 0.15 && clamped < 100
  const gravityFlag = isDecaying ? '▼ CURVE BLEEDING' : atFloor ? 'MILESTONE HELD' : null
  const gravityFlagKind = isDecaying ? 'bleeding' : 'held'

  const slot = WIDTH / visible.length
  const bodyWidth = Math.max(1.5, slot * 0.62)
  const currentCx = (visible.length - 1) * slot + slot / 2
  const currentCy = priceToY(chart.price)
  const resistanceY = priceToY(resistance.price)
  const segmentX = WIDTH * 0.56
  const segmentWidth = WIDTH - segmentX - 8

  return (
    <section
      className={`chart-panel hero-chart surf-${zone.zone} ${tapFlash ? 'tap-flash' : ''} ${
        milestonePulse ? 'milestone-pulse' : ''
      } ${dumping ? 'dumping' : ''} ${unstable ? 'unstable' : ''} ${isDecaying ? 'decaying' : ''} ${
        overheated ? 'overheated' : ''
      } ${supercharged ? 'supercharged' : ''} ${overdrive ? 'overdrive' : ''} ${
        windowActive ? 'smash-window' : ''
      } ${resistanceClose ? 'resistance-close' : ''} ${rating === 'perfect' ? 'breakout-perfect' : ''} ${
        rating === 'rejected' ? 'rejected' : ''
      }`}
      aria-label="Fake chart"
    >
      {gravityFlag ? <span className={`chart-gravity-flag ${gravityFlagKind}`}>{gravityFlag}</span> : null}
      {/* v0.3.5: Overdrive overrides the overheat scold — mashing is safe here. */}
      {overheated && !overdrive ? <span className="chart-overheat-flag">OVERHEATED — LET IT BREATHE</span> : null}
      {overdrive ? <span className="chart-overdrive-flag">OVERDRIVE — GRAVITY HAS LEFT THE CHAT</span> : null}
      <div className="chart-header">
        <span className={`surf-zone-label surf-${zone.zone}`}>
          RESISTANCE {Math.round(resistance.price)} · PRICE {Math.round(chart.price)}
        </span>
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{windowActive ? 'SMASH' : isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Fictional candlestick chart">
        <g className={`chart-resistance-target ${windowActive ? 'active' : ''}`} aria-hidden="true">
          {windowActive ? (
            <rect
              className="chart-smash-window"
              x={segmentX - 8}
              y={Math.max(0, resistanceY - 10)}
              width={segmentWidth + 16}
              height={20}
              rx={4}
            />
          ) : null}
          <line className="chart-resistance-line halo" x1={segmentX} x2={WIDTH - 8} y1={resistanceY} y2={resistanceY} />
          <line className="chart-resistance-line core" x1={segmentX} x2={WIDTH - 8} y1={resistanceY} y2={resistanceY} />
          <text className="chart-resistance-label" x={segmentX - 8} y={Math.max(10, resistanceY - 8)}>
            RESISTANCE
          </text>
        </g>
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
        <g className={`chart-active-tip ${windowActive ? 'ready' : ''}`} aria-hidden="true">
          <circle cx={currentCx} cy={currentCy} r="5.8" />
          <circle cx={currentCx} cy={currentCy} r="2.5" />
        </g>
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
