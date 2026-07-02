import { useEffect, useRef, useState } from 'react'
import { OVERHEAT, type Candle, type ChartState } from '../game/chart'
import { getSurfZone, getTierFloor } from '../game/economy'
import type { FountainEvent, ResistanceState, TapEffect } from '../game/types'
import { StreakFountain } from './StreakFountain'

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
  // v0.4B: hosted here (rather than as a viewport-fixed sibling in HomeScreen) so
  // its lanes are positioned relative to the chart panel's own box and can never
  // drift over the resistance line/Smash Window.
  fountainEvents: FountainEvent[]
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
  fountainEvents,
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

  // v0.4A Resistance Breakout arcade states drive the panel + line visuals. Phase
  // is authoritative (advanceResistance updates it every tick), so the panel reads
  // the same state the button teaches.
  const phase = resistance.phase
  const smash = phase === 'smash'
  const broken = phase === 'broken'
  const brokenPerfect = broken && resistance.lastRating === 'perfect'
  const rejected = phase === 'rejected' || phase === 'overheated'
  const approaching = phase === 'approaching'

  // v0.4D: a persistent combo badge replaces the old floating "CHAIN ×N" fountain
  // text — it lives in the header row (above the SVG, never over the resistance
  // line) and just updates in place as the breakout streak climbs, with flame
  // styling kicking in at higher tiers instead of another burst of text.
  const breakoutStreak = resistance.breakoutStreak
  const comboTier = overdrive ? 'overdrive' : breakoutStreak >= 5 ? 'tier-4' : breakoutStreak === 4 ? 'tier-3' : breakoutStreak === 3 ? 'tier-2' : 'tier-1'
  const comboBadgeText = overdrive ? 'OVERDRIVE' : breakoutStreak >= 2 ? `×${breakoutStreak}` : null

  // Short action words — the player-facing teaching cue. Numbers live in dev stats.
  const cue = broken
    ? brokenPerfect
      ? 'BREAKOUT PERFECT'
      : 'BREAKOUT'
    : phase === 'rejected'
      ? 'REJECTED'
      : phase === 'overheated'
        ? 'TOO HOT'
        : smash
          ? 'SMASH NOW'
          : approaching
            ? 'GET READY'
            : 'BUILD MOMENTUM'

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
      } ${supercharged ? 'supercharged' : ''} ${overdrive ? 'overdrive' : ''} ${smash ? 'smash-window' : ''} ${
        approaching ? 'resistance-close' : ''
      } ${broken ? 'breakout' : ''} ${brokenPerfect ? 'breakout-perfect' : ''} ${
        rejected ? 'resistance-rejected' : ''
      }`}
      aria-label="Fake chart"
    >
      {gravityFlag ? <span className={`chart-gravity-flag ${gravityFlagKind}`}>{gravityFlag}</span> : null}
      {/* v0.3.5: Overdrive overrides the overheat scold — mashing is safe here. */}
      {overheated && !overdrive ? <span className="chart-overheat-flag">OVERHEATED — LET IT BREATHE</span> : null}
      {overdrive ? <span className="chart-overdrive-flag">OVERDRIVE — GRAVITY HAS LEFT THE CHAT</span> : null}
      <div className="chart-header">
        <span className={`resistance-cue resistance-${phase}`}>{cue}</span>
        {comboBadgeText ? <span className={`combo-badge ${comboTier}`}>{comboBadgeText}</span> : null}
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{smash ? 'SMASH' : isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Fictional candlestick chart">
        <g className={`chart-resistance-target resistance-${phase}`} aria-hidden="true">
          {smash ? (
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
          {/* v0.4A: on a breakout the line shatters — an expanding burst ring at the
              break point (keyed by target id so entering 'broken' mounts a fresh,
              one-shot animation) rides on top of the fading line. */}
          {broken ? (
            <circle
              key={`burst-${resistance.id}`}
              className="chart-resistance-burst"
              cx={Math.min(WIDTH - 12, currentCx)}
              cy={resistanceY}
              r={6}
            />
          ) : (
            <text className="chart-resistance-label" x={segmentX - 8} y={Math.max(10, resistanceY - 8)}>
              {approaching ? 'RESISTANCE ▲' : 'RESISTANCE'}
            </text>
          )}
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
        <g className={`chart-active-tip ${smash ? 'ready' : ''}`} aria-hidden="true">
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
      <StreakFountain events={fountainEvents} />
    </section>
  )
}
