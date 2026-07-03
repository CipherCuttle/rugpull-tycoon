import { useEffect, useRef, useState } from 'react'
import {
  getResistanceCrackBand,
  getResistanceCrackPrice,
  OVERHEAT,
  RESISTANCE_MAX_CRACK_PIPS,
  type Candle,
  type ChartState,
} from '../game/chart'
import { getSurfZone, getTierFloor } from '../game/economy'
import type { BonusTarget, FountainEvent, ResistanceState, TapEffect } from '../game/types'
import { StreakFountain } from './StreakFountain'

interface FakeChartProps {
  chart: ChartState
  progress: number
  tier: number
  milestoneLabel: string
  tapEffect: TapEffect | null
  resistance: ResistanceState
  bonusTarget: BonusTarget | null
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
const HEIGHT = 184
const DISPLAY_MIN = -6
const DISPLAY_MAX = 106

// price (0–100) → svg y (inverted).
function priceToY(price: number): number {
  const clamped = Math.max(DISPLAY_MIN, Math.min(DISPLAY_MAX, price))
  return HEIGHT - ((clamped - DISPLAY_MIN) / (DISPLAY_MAX - DISPLAY_MIN)) * HEIGHT
}

export function FakeChart({
  chart,
  progress,
  tier,
  milestoneLabel,
  tapEffect,
  resistance,
  bonusTarget,
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
  const missed = phase === 'missed'
  const shattered = phase === 'shattered'
  const brokenPerfect = (broken || shattered) && resistance.lastRating === 'perfect'
  const rejected = phase === 'rejected' || phase === 'overheated'
  const approaching = phase === 'approaching'

  // v0.4D: a persistent combo badge replaces the old floating "CHAIN ×N" fountain
  // text — it lives in the header row (above the SVG, never over the resistance
  // line) and just updates in place as the breakout streak climbs, with flame
  // styling kicking in at higher tiers instead of another burst of text.
  const breakoutStreak = resistance.crackHitStreak
  const comboTier = shattered
    ? 'shatter'
    : overdrive
      ? 'overdrive'
      : breakoutStreak >= 5
        ? 'tier-4'
        : breakoutStreak === 4
          ? 'tier-3'
          : breakoutStreak === 3
            ? 'tier-2'
            : 'tier-1'
  const comboBadgeText = shattered ? 'SHATTER' : overdrive ? 'OVERDRIVE' : breakoutStreak >= 2 ? `CRACK ×${breakoutStreak}` : null

  // Short action words — the player-facing teaching cue. Numbers live in dev stats.
  const cue = shattered
    ? 'SHATTERED'
    : broken
    ? brokenPerfect
      ? 'PERFECT CRACK'
      : 'CRACK HIT'
    : missed
      ? 'MISSED CRACK'
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
  const segmentEndX = WIDTH - 8
  const crackPos = Math.max(0.12, Math.min(0.88, resistance.crackTargetPos ?? 0.7))
  const crackX = segmentX + segmentWidth * crackPos
  const crackY = priceToY(getResistanceCrackPrice(resistance))
  const crackBandPx = Math.max(7, (getResistanceCrackBand(overdrive) / (DISPLAY_MAX - DISPLAY_MIN)) * HEIGHT)
  const resistancePath = `M ${segmentX} ${resistanceY} Q ${(segmentX + crackX) / 2} ${resistanceY} ${crackX} ${crackY} Q ${
    (crackX + segmentEndX) / 2
  } ${resistanceY} ${segmentEndX} ${resistanceY}`
  const bonusVisible = bonusTarget && Date.now() < bonusTarget.expiresAt
  const bonusX = bonusVisible ? Math.max(24, Math.min(WIDTH - 24, bonusTarget.xPos * WIDTH)) : 0
  const bonusY = bonusVisible ? priceToY(bonusTarget.price) : 0

  return (
    <section
      className={`chart-panel hero-chart surf-${zone.zone} ${tapFlash ? 'tap-flash' : ''} ${
        milestonePulse ? 'milestone-pulse' : ''
      } ${dumping ? 'dumping' : ''} ${unstable ? 'unstable' : ''} ${isDecaying ? 'decaying' : ''} ${
        overheated ? 'overheated' : ''
      } ${supercharged ? 'supercharged' : ''} ${overdrive ? 'overdrive' : ''} ${smash ? 'smash-window' : ''} ${
        approaching ? 'resistance-close' : ''
      } ${broken ? 'breakout' : ''} ${missed ? 'missed-crack' : ''} ${shattered ? 'shattered' : ''} ${
        brokenPerfect ? 'breakout-perfect' : ''
      } ${rejected ? 'resistance-rejected' : ''
      }`}
      aria-label="Fake chart"
    >
      {gravityFlag ? <span className={`chart-gravity-flag ${gravityFlagKind}`}>{gravityFlag}</span> : null}
      {/* v0.3.5: Overdrive overrides the overheat scold — mashing is safe here. */}
      {overheated && !overdrive ? <span className="chart-overheat-flag">OVERHEATED — LET IT BREATHE</span> : null}
      {overdrive ? <span className="chart-overdrive-flag">OVERDRIVE — CRACKS WIDE OPEN</span> : null}
      <div className="chart-header">
        <div className="chart-header-left">
          <span className={`resistance-cue resistance-${phase}`}>{cue}</span>
          <span className={`crack-pips ${shattered ? 'shattered' : ''}`} aria-label={`${resistance.crackPips} resistance pips left`}>
            {Array.from({ length: RESISTANCE_MAX_CRACK_PIPS }, (_, index) => {
              const intact = index < resistance.crackPips
              return <span key={index} className={`crack-pip ${intact ? 'intact' : 'cracked'}`} />
            })}
          </span>
        </div>
        {comboBadgeText ? <span className={`combo-badge ${comboTier}`}>{comboBadgeText}</span> : null}
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{shattered ? 'SHATTER' : missed ? 'MISS' : smash ? 'AIM' : isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Fictional candlestick chart">
        <g className={`chart-resistance-target resistance-${phase}`} aria-hidden="true">
          {smash ? (
            <rect
              className="chart-smash-window"
              x={Math.max(segmentX - 6, crackX - (overdrive ? 25 : 18))}
              y={Math.max(0, crackY - crackBandPx - 3)}
              width={overdrive ? 50 : 36}
              height={crackBandPx * 2 + 6}
              rx={4}
            />
          ) : null}
          <path className="chart-resistance-line halo" d={resistancePath} />
          <path className="chart-resistance-line core" d={resistancePath} />
          {!shattered && !rejected ? (
            <g className={`chart-crack-target ${smash ? 'ready' : ''} ${overdrive ? 'overdrive' : ''}`} transform={`translate(${crackX} ${crackY})`}>
              <circle className="chart-crack-band" r={crackBandPx} />
              <circle className="chart-crack-core" r={5.4} />
              <path className="chart-crack-notch" d="M -7 -8 L -1 -1 L -6 8 M 4 -8 L 0 0 L 8 7" />
            </g>
          ) : null}
          {/* v0.4A: on a breakout the line shatters — an expanding burst ring at the
              break point (keyed by target id so entering 'broken' mounts a fresh,
              one-shot animation) rides on top of the fading line. */}
          {broken || shattered ? (
            <circle
              key={`burst-${resistance.id}-${phase}`}
              className={`chart-resistance-burst ${shattered ? 'shatter' : ''}`}
              cx={crackX}
              cy={crackY}
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
        {bonusVisible ? (
          <g className="chart-bonus-target" transform={`translate(${bonusX} ${bonusY})`} aria-hidden="true">
            <circle className="chart-bonus-ring" r="9" />
            <circle className="chart-bonus-core" r="3.5" />
            <path className="chart-bonus-spark" d="M 0 -13 L 2 -4 L 10 -7 L 4 0 L 11 5 L 2 4 L 0 13 L -2 4 L -11 5 L -4 0 L -10 -7 L -2 -4 Z" />
          </g>
        ) : null}
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
