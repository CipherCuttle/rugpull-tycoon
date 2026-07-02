// v0.3.4 Candlestick Physics. This is a purely *visual* toy model, fully
// decoupled from the economy: it never touches liquidity, the bonding curve, or
// the v0.3 Chart Gravity tier floors. Its whole job is to make the chart feel
// alive under the thumb — taps shove velocity, gravity + friction fight back,
// overmashing overheats and dumps, and idle time falls fast.
//
// Everything here is deterministic (seeded noise), so the headless pacing sim
// can drive it reproducibly.

import type { ResistanceState, TapRating } from './types'

export interface Candle {
  open: number
  close: number
  high: number
  low: number
}

export interface ChartState {
  // Current price on a soft 0–100 scale. Rests/oscillates roughly 20–80 and can
  // briefly wick toward the hard bounds, but is never pinned flat at the top.
  price: number
  // Momentum. Taps add to it; gravity/friction/high-pressure bleed it away.
  velocity: number
  // Overmash meter. Rises with fast tapping and with sitting pinned high; decays
  // otherwise. Past OVERHEAT it injects reversal/dump pressure.
  heat: number
  // Rolling completed micro-candles, oldest first, newest last.
  candles: Candle[]
  // In-progress candle accumulators.
  open: number
  high: number
  low: number
  // Seconds accumulated into the current candle; rolls a new candle at
  // CANDLE_PERIOD so both taps and ticks grow the chart.
  candleClock: number
  // Deterministic noise cursor.
  seed: number
}

// --- Physics constants (price units on the 0–100 scale) ---
const HARD_MIN = 4
const HARD_MAX = 96
// Soft band: outside it, restoring forces kick in so the price wicks back.
const SOFT_MIN = 24
const SOFT_MAX = 70
// Constant downward pull on velocity (price/s^2). Terminal idle fall ≈
// BASE_GRAVITY / FRICTION ≈ 12/s, so idle drop is obvious within a second.
const BASE_GRAVITY = 24
// Extra downward pull per price-unit above SOFT_MAX — the anti-pinning force.
const HIGH_PRESSURE_K = 2.1
// Upward bounce per price-unit below SOFT_MIN — dead coins rest around the Dead/
// Warming band (~18–24) instead of pinning to the absolute floor. Stiff enough
// to balance gravity a little below SOFT_MIN.
const LOW_BOUNCE_K = 4.5
// Velocity damping per second. Lowish so taps carry momentum (surf) and idle
// falls at a lively terminal speed.
const FRICTION = 2.0
const VELOCITY_MAX = 58
// Random velocity jitter per second — what turns the line into candles.
const NOISE_AMP = 27

// --- Overheat / overmash ---
const HEAT_MAX = 130
export const OVERHEAT = 60
// Heat bleeds this fast per second. HEAT_PER_TAP is tuned so ~3 taps/s stays
// cool and ~5 taps/s slowly cooks into the overheat zone.
const HEAT_DECAY = 24
// Being pinned high cooks the chart even with no taps.
const HIGH_HEAT_GAIN = 26
// Downward reversal accel once overheated and high.
const REVERSAL_K = 0.14

// --- Candles ---
const CANDLE_PERIOD = 0.2
const MAX_CANDLES = 34

// Base velocity impulse of a single tap, before upgrade/combo shaping (see
// economy.getChartTapImpulse). Kept here with the rest of the feel constants.
export const CHART_TAP_IMPULSE_BASE = 8.5
// Chart heat added per tap. Balanced against HEAT_DECAY for the 3-vs-5 taps/s split.
export const CHART_HEAT_PER_TAP = 6
// Mini physics step run on each tap for instant on-screen feedback.
export const CHART_TAP_STEP = 0.05

// --- v0.4 Resistance Breakout visual target ---
export const RESISTANCE_WINDOW_MS = 280
export const RESISTANCE_DRIFT_PER_SEC = 2
export const RESISTANCE_NEAR_BAND = 3
export const RESISTANCE_PERFECT_BELOW = 4
export const RESISTANCE_PERFECT_ABOVE = 6
export const RESISTANCE_GOOD_BELOW = 18

function roll(seed: number): number {
  const value = Math.sin(seed * 127.11) * 43758.5453
  return value - Math.floor(value)
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function resistanceSpawnPrice(anchorPrice: number, id: number): number {
  const spacing = 12 + roll(id * 17.19 + anchorPrice * 0.37) * 6
  return round(clamp(anchorPrice + spacing, 42, 90))
}

export function createInitialResistance(anchorPrice: number, id = 1): ResistanceState {
  return {
    id,
    price: resistanceSpawnPrice(anchorPrice, id),
    crossedAt: 0,
    windowUntil: 0,
    lastResistanceHitAt: 0,
    breakoutStreak: 0,
    perfectBreakouts: 0,
    rejections: 0,
  }
}

export function advanceResistance(
  resistance: ResistanceState,
  chart: ChartState,
  dt: number,
  now: number,
): ResistanceState {
  const windowActive = resistance.windowUntil > now
  const expiredWindow = resistance.windowUntil > 0 && !windowActive
  const driftFloor = Math.min(90, Math.max(42, chart.price + 9))
  const driftedPrice =
    chart.price < resistance.price - 5 ? Math.max(driftFloor, resistance.price - RESISTANCE_DRIFT_PER_SEC * dt) : resistance.price

  let next: ResistanceState = {
    ...resistance,
    price: round(driftedPrice),
    crossedAt: expiredWindow ? 0 : resistance.crossedAt,
    windowUntil: expiredWindow ? 0 : resistance.windowUntil,
  }

  const distance = next.price - chart.price
  const shouldRetarget = !windowActive && (chart.price > next.price + 9 || chart.price < next.price - 34)

  if (shouldRetarget) {
    return {
      ...createInitialResistance(chart.price, next.id + 1),
      lastResistanceHitAt: next.lastResistanceHitAt,
      breakoutStreak: next.breakoutStreak,
      perfectBreakouts: next.perfectBreakouts,
      rejections: next.rejections,
    }
  }

  if (now > 0 && next.windowUntil === 0 && distance <= RESISTANCE_NEAR_BAND && distance >= -RESISTANCE_PERFECT_ABOVE) {
    next = {
      ...next,
      crossedAt: now,
      windowUntil: now + RESISTANCE_WINDOW_MS,
    }
  }

  return next
}

export function classifyTapRating(
  resistance: ResistanceState,
  chart: ChartState,
  now: number,
  overheated: boolean,
): TapRating {
  if (overheated) {
    return 'overheated'
  }

  const distance = resistance.price - chart.price
  const windowActive = resistance.windowUntil > now

  if (windowActive && distance >= -RESISTANCE_PERFECT_ABOVE && distance <= RESISTANCE_PERFECT_BELOW) {
    return 'perfect'
  }

  if (distance > RESISTANCE_PERFECT_BELOW && distance <= RESISTANCE_GOOD_BELOW) {
    return 'good'
  }

  if (distance > RESISTANCE_GOOD_BELOW) {
    return 'weak'
  }

  return 'rejected'
}

export interface ChartAdvanceOpts {
  // Instantaneous velocity kick from a tap (already upgrade/combo scaled). Not
  // dt-scaled — a tap is an impulse, not a sustained force.
  impulse?: number
  // Chart heat added this step (per-tap heat).
  heatAdd?: number
  // Gentle idle lift from passive upgrades ("breathes while you rest").
  autoImpulse?: number
  // <1 slows gravity (GRAVITY upgrade).
  gravityScale?: number
  // <1 reduces friction so momentum persists (hot combo = surf).
  frictionScale?: number
  // One-off downward shove (a jeet raid), already shield-scaled.
  jeetDump?: number
  // v0.3.5: scales ALL heat gain this step (per-tap + high-pin). Supercharge
  // passes <1 (mashing stays cooler); Overdrive passes 0 (no cooking at all).
  heatScale?: number
  // v0.3.5: Overdrive passes true to suspend the overheat reversal punishment —
  // the chart can be pinned high and hot without dumping. Heat still decays
  // normally, so it drains back to safe by the time Overdrive ends.
  noReversal?: boolean
}

// Largest stable integration step. friction × dt must stay < 1, and we want
// candles to roll at CANDLE_PERIOD granularity, so cap a step here and sub-step
// any larger dt (e.g. a backgrounded tab returning with a 1s tick).
const MAX_STEP = 0.06

export function advanceChart(chart: ChartState, dt: number, opts: ChartAdvanceOpts = {}): ChartState {
  if (dt <= 0) {
    return chart
  }

  if (dt > MAX_STEP) {
    // Sub-step. Only the first sub-step carries the one-off impulses/heat/dump so
    // they aren't multiplied; sustained forces (gravity/auto/friction) recur.
    let current = chart
    let remaining = dt
    let first = true
    while (remaining > 1e-6) {
      const step = Math.min(MAX_STEP, remaining)
      current = advanceChart(
        current,
        step,
        first
          ? opts
          : {
              gravityScale: opts.gravityScale,
              frictionScale: opts.frictionScale,
              autoImpulse: opts.autoImpulse,
              heatScale: opts.heatScale,
              noReversal: opts.noReversal,
            },
      )
      remaining -= step
      first = false
    }
    return current
  }

  const gravityScale = opts.gravityScale ?? 1
  const frictionScale = opts.frictionScale ?? 1
  const heatScale = opts.heatScale ?? 1

  const seed = chart.seed + 1
  const noise = (roll(seed) - 0.5) * 2 * NOISE_AMP

  let price = chart.price
  let velocity = chart.velocity
  let heat = chart.heat

  // Heat: decay, per-tap add, and a top-up while pinned high. heatScale (<1 while
  // Supercharged, 0 during Overdrive) throttles the *gains* but never the decay,
  // so a hot chart always cools back down on its own.
  heat = Math.max(0, heat - HEAT_DECAY * dt + (opts.heatAdd ?? 0) * heatScale)
  if (price > 84) {
    heat += HIGH_HEAT_GAIN * dt * heatScale
  }
  heat = Math.min(HEAT_MAX, heat)
  const overheated = heat > OVERHEAT

  // Forces on velocity.
  let accel = -BASE_GRAVITY * gravityScale
  if (price > SOFT_MAX) {
    accel -= HIGH_PRESSURE_K * (price - SOFT_MAX)
  }
  if (price < SOFT_MIN) {
    accel += LOW_BOUNCE_K * (SOFT_MIN - price)
  }
  if (overheated && price > SOFT_MAX && !opts.noReversal) {
    // Overmash punishment: the hotter and higher, the harder it reverses.
    // Suspended during Overdrive (noReversal) so mashing has no consequences.
    accel -= REVERSAL_K * (heat - OVERHEAT) * (price - SOFT_MAX)
  }

  velocity += accel * dt
  velocity += opts.impulse ?? 0
  velocity += (opts.autoImpulse ?? 0) * dt
  velocity -= opts.jeetDump ?? 0
  velocity += noise * dt
  velocity -= velocity * FRICTION * frictionScale * dt
  velocity = clamp(velocity, -VELOCITY_MAX, VELOCITY_MAX)

  price += velocity * dt

  // Soft reflection at the hard bounds so a spike wicks instead of pinning.
  if (price > HARD_MAX) {
    price = HARD_MAX
    if (velocity > 0) {
      velocity = -velocity * 0.35
    }
  }
  if (price < HARD_MIN) {
    price = HARD_MIN
    if (velocity < 0) {
      velocity = -velocity * 0.4
    }
  }

  // Grow the current candle; roll a new one on the time accumulator.
  let open = chart.open
  let high = Math.max(chart.high, price)
  let low = Math.min(chart.low, price)
  let candleClock = chart.candleClock + dt
  let candles = chart.candles

  if (candleClock >= CANDLE_PERIOD) {
    candles = [...candles.slice(-(MAX_CANDLES - 1)), { open: round(open), high: round(high), low: round(low), close: round(price) }]
    candleClock -= CANDLE_PERIOD
    open = price
    high = price
    low = price
  }

  return {
    price: round(price),
    velocity: round(velocity),
    heat: round(heat),
    candles,
    open: round(open),
    high: round(high),
    low: round(low),
    candleClock: round(candleClock),
    seed,
  }
}

export function createInitialChart(): ChartState {
  let chart: ChartState = {
    price: 30,
    velocity: 0,
    heat: 0,
    candles: [],
    open: 30,
    high: 30,
    low: 30,
    candleClock: 0,
    seed: 1,
  }

  // Pre-roll an idle history so the panel opens already looking like a volatile
  // (if sleepy) market rather than a single flat dot.
  for (let step = 0; step < MAX_CANDLES * 4; step += 1) {
    chart = advanceChart(chart, CANDLE_PERIOD / 2)
  }

  return chart
}
