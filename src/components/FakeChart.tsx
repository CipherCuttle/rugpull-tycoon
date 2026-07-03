import { useEffect, useRef, useState } from 'react'
import {
  getResistanceCrackBand,
  getResistanceCrackLane,
  getResistanceCrackPrice,
  getResistanceLaneBand,
  getResistanceWallLane,
  getResistanceWallPrice,
  isResistanceCrackAligned,
  OVERHEAT,
  RESISTANCE_LANE_HEAD,
  RESISTANCE_MAX_CRACK_PIPS,
  RESISTANCE_WALL_LANE_SPAN,
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
  // v0.4H: true for a brief window right after a crack hit -- drives the
  // Max Payne-style bullet-time pulse (see reducer.ts bulletTimeUntil).
  bulletTime: boolean
}

const TAP_FLASH_MS = 220
const MILESTONE_PULSE_MS = 750
// v0.4I: one-shot Overdrive enter/exit accents layered on top of the
// continuous `.hero-chart.overdrive` aura -- see the useEffect below.
const OVERDRIVE_ENTER_MS = 640
const OVERDRIVE_EXIT_MS = 480

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
  isDecaying,
  supercharged,
  overdrive,
  fountainEvents,
  bulletTime,
}: FakeChartProps) {
  const clamped = Math.max(0, Math.min(100, progress))

  const [tapFlash, setTapFlash] = useState(false)
  const [milestonePulse, setMilestonePulse] = useState(false)
  const [overdriveEnter, setOverdriveEnter] = useState(false)
  const [overdriveExit, setOverdriveExit] = useState(false)
  const lastTapId = useRef<number | null>(null)
  const lastTier = useRef(tier)
  const lastOverdrive = useRef(overdrive)

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

  // v0.4I: Overdrive currently "kicks in without being noticeable" -- fire a big
  // one-shot transition pulse the instant it starts, and a clear power-down fade
  // the instant it ends, on top of the continuous aura (.hero-chart.overdrive).
  useEffect(() => {
    if (overdrive && !lastOverdrive.current) {
      lastOverdrive.current = overdrive
      setOverdriveEnter(true)
      const timeout = window.setTimeout(() => setOverdriveEnter(false), OVERDRIVE_ENTER_MS)
      return () => window.clearTimeout(timeout)
    }

    if (!overdrive && lastOverdrive.current) {
      lastOverdrive.current = overdrive
      setOverdriveExit(true)
      const timeout = window.setTimeout(() => setOverdriveExit(false), OVERDRIVE_EXIT_MS)
      return () => window.clearTimeout(timeout)
    }

    lastOverdrive.current = overdrive
  }, [overdrive])

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
  const segmentX = WIDTH * 0.56
  // v0.4G: the wall moves on an abstract 0..100 "lane" scale (chart.ts), with
  // 100 (RESISTANCE_LANE_HEAD) pinned to the candle head's own fixed x — the
  // strike lane. laneToX maps that scale onto the same pixel span the old
  // fixed wall segment used to occupy, so the wall (and its crack) slide
  // through exactly the region the player already reads as "the lane".
  const laneToX = (lane: number) => segmentX + (lane / RESISTANCE_LANE_HEAD) * (currentCx - segmentX)
  const now = Date.now()
  // The wall is a single straight bar — one center lane position, one live
  // height. No per-position curve/bow; it just slides as a rigid whole.
  const wallLane = getResistanceWallLane(resistance, now, overdrive)
  const wallPrice = getResistanceWallPrice(resistance, now, overdrive)
  const wallCenterX = laneToX(wallLane)
  const wallY = priceToY(wallPrice)
  const wallHalfWidthPx = Math.abs(laneToX(RESISTANCE_WALL_LANE_SPAN / 2) - laneToX(0)) / 2
  const wallX1 = Math.max(4, wallCenterX - wallHalfWidthPx)
  const wallX2 = Math.min(WIDTH - 4, wallCenterX + wallHalfWidthPx)
  // The crack socket rides along the wall's own length (crackPos) — it's the
  // only weak-point marker, and it travels wherever the wall's motion takes it.
  const crackLane = getResistanceCrackLane(resistance, now, overdrive)
  const crackX = Math.max(4, Math.min(WIDTH - 4, laneToX(crackLane)))
  const crackPrice = getResistanceCrackPrice(resistance, now, overdrive)
  const crackY = priceToY(crackPrice)
  const crackPriceBandPx = Math.max(6, (getResistanceCrackBand(overdrive, resistance.id) / (DISPLAY_MAX - DISPLAY_MIN)) * HEIGHT)
  const crackLaneBandPx = Math.max(
    6,
    Math.abs(laneToX(RESISTANCE_LANE_HEAD - getResistanceLaneBand(overdrive, resistance.id)) - laneToX(RESISTANCE_LANE_HEAD)),
  )
  // v0.4G: "hot" means the head is actually within striking distance of the
  // socket on BOTH axes — the same 2D check the reducer uses to score a hit,
  // not a second marker's position lining up with the crack's.
  const crackReady = isResistanceCrackAligned(resistance, chart, now, overdrive)
  // v0.4G: the bonus-pickup scaffolding clutters the new moving wall — parked
  // (rendering only) until it gets its own pass.
  const bonusVisible = false
  const bonusX = 0
  const bonusY = 0

  // v0.4I: the wall should visibly get destroyed, not just report a pip count
  // in the header. Split its rendered span into RESISTANCE_MAX_CRACK_PIPS equal
  // chunks; each pip already spent (state.crackPips counts DOWN from
  // RESISTANCE_MAX_CRACK_PIPS to 0) punches a dark "bite" mark straight out of
  // the bar at that chunk's position. On shatter every chunk flies apart instead
  // (see .chart-wall-chunk-shatter), so a normal crack hit and a full shatter
  // read as visibly different beats.
  const wallChunkWidthPx = Math.max(2, (wallX2 - wallX1) / RESISTANCE_MAX_CRACK_PIPS)
  const wallChunkHeightPx = 20

  return (
    <section
      className={`chart-panel hero-chart surf-${zone.zone} ${tapFlash ? 'tap-flash' : ''} ${
        milestonePulse ? 'milestone-pulse' : ''
      } ${dumping ? 'dumping' : ''} ${unstable ? 'unstable' : ''} ${isDecaying ? 'decaying' : ''} ${
        overheated ? 'overheated' : ''
      } ${supercharged ? 'supercharged' : ''} ${overdrive ? 'overdrive' : ''} ${overdriveEnter ? 'overdrive-enter' : ''} ${
        overdriveExit ? 'overdrive-exit' : ''
      } ${smash ? 'smash-window' : ''} ${
        approaching ? 'resistance-close' : ''
      } ${broken ? 'breakout' : ''} ${missed ? 'missed-crack' : ''} ${shattered ? 'shattered' : ''} ${
        brokenPerfect ? 'breakout-perfect' : ''
      } ${rejected ? 'resistance-rejected' : ''
      } ${bulletTime ? 'bullet-time' : ''}`}
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
          {/* v0.4H: the old SMASH NOW rectangle was a second target marker
              layered over the crack socket -- removed so there is exactly one
              glowing weak point on screen. The socket's own 'ready'/'hot'
              classes below already carry the "smash now" read. */}
          {/* v0.4G: the wall is a single straight bar — it never bows or
              curves. It slides as a rigid whole; only its lane (x) and live
              height (y) change tick to tick. */}
          <line className="chart-resistance-line halo" x1={wallX1} y1={wallY} x2={wallX2} y2={wallY} />
          <line className="chart-resistance-line core" x1={wallX1} y1={wallY} x2={wallX2} y2={wallY} />
          {/* v0.4I: visible wall damage. Below the shatter hold, remaining
              chunks fly apart instead of showing bite marks -- one clearly
              different beat from an ordinary crack hit. */}
          {Array.from({ length: RESISTANCE_MAX_CRACK_PIPS }, (_, index) => {
            const chunkX = wallX1 + index * wallChunkWidthPx
            if (shattered) {
              return (
                <rect
                  key={`wall-shatter-${resistance.id}-${index}`}
                  className="chart-wall-chunk chart-wall-chunk-shatter"
                  style={{ animationDelay: `${index * 45}ms` }}
                  x={chunkX + 1}
                  y={wallY - wallChunkHeightPx / 2}
                  width={Math.max(1, wallChunkWidthPx - 2)}
                  height={wallChunkHeightPx}
                  rx={2}
                />
              )
            }
            if (index >= resistance.crackPips) {
              return (
                <rect
                  key={`wall-damage-${index}`}
                  className="chart-wall-chunk chart-wall-chunk-damage"
                  x={chunkX + 1}
                  y={wallY - wallChunkHeightPx / 2}
                  width={Math.max(1, wallChunkWidthPx - 2)}
                  height={wallChunkHeightPx}
                  rx={2}
                />
              )
            }
            return null
          })}
          {/* The wall's own slide (above) already shows it moving — there is
              exactly one target marker below: a ring sized to the actual hit
              radius plus a center glow. v0.4I: dropped the old slow sonar-ping
              ellipse (ambiguous, read as a second target) so aiming reads off
              one unambiguous ring. */}
          {!shattered && !rejected ? (
            <g
              className={`chart-crack-target ${smash ? 'ready' : ''} ${overdrive ? 'overdrive' : ''} ${crackReady ? 'hot' : ''}`}
              transform={`translate(${crackX} ${crackY})`}
            >
              {/* Scale-pulse lives on an inner group with no position transform of
                  its own — a CSS transform animation on the outer group would
                  replace its translate(crackX crackY) outright and teleport the
                  socket to the SVG origin. */}
              <g className="chart-crack-pulse">
                <ellipse className="chart-crack-band" rx={crackLaneBandPx} ry={crackPriceBandPx} />
                <circle className="chart-crack-core" r={4.4} />
              </g>
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
          ) : null}
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
        {/* v0.4H/v0.4I: a one-shot spark burst on the candle head itself, keyed
            by tapEffect.id so every tap remounts (and replays) it. A clean
            crack hit gets the gold spark; a miss gets a smaller red one instead
            -- the tactile "what just happened" read the miss-tactility pass
            asked for. */}
        {tapFlash && tapEffect ? (
          <g key={`spark-${tapEffect.id}`} transform={`translate(${currentCx} ${currentCy})`} aria-hidden="true">
            <path
              className={`chart-tap-spark ${missed ? 'miss' : ''}`}
              d="M 0 -9 L 1.6 -2.6 L 7 -5 L 2.6 -1 L 8 3 L 1.6 2.2 L 0 9 L -1.6 2.2 L -8 3 L -2.6 -1 L -7 -5 L -1.6 -2.6 Z"
            />
          </g>
        ) : null}
        <g
          className={`chart-active-tip ${smash ? 'ready' : ''}`}
          transform={`translate(${currentCx} ${currentCy})`}
          aria-hidden="true"
        >
          {/* Squash-pop lives on an inner group with no position transform of its
              own -- same reason as .chart-crack-pulse: a CSS transform here
              would otherwise replace the outer translate(currentCx currentCy)
              outright and teleport the head to the SVG origin. v0.4I: a real
              crack hit (broken/shattered) gets a bigger "impact" squash than an
              ordinary tap's pop, and a miss gets a downward recoil instead. */}
          <g
            className={`chart-active-tip-flap ${
              tapFlash ? (missed ? 'recoil' : broken || shattered ? 'impact' : 'pop') : ''
            }`}
          >
            <circle r="5.8" />
            <circle r="2.5" />
          </g>
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
