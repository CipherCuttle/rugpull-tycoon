// v0.3.4 Candlestick Physics. This is a purely *visual* toy model, fully
// decoupled from the economy: it never touches liquidity, the bonding curve, or
// the v0.3 Chart Gravity tier floors. Its whole job is to make the chart feel
// alive under the thumb — taps shove velocity, gravity + friction fight back,
// overmashing overheats and dumps, and idle time falls fast.
//
// Everything here is deterministic (seeded noise), so the headless pacing sim
// can drive it reproducibly.

import type { ResistancePhase, ResistanceState, TapRating } from './types'

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
const HARD_MIN = -4
const HARD_MAX = 104
// Soft band: outside it, restoring forces kick in so the price wicks back.
const SOFT_MIN = 18
const SOFT_MAX = 76
// Constant downward pull on velocity (price/s^2). v0.4H Flappy rebuild: raised
// from 23 so the drop between taps reads as a clear, natural dump ("wait to
// drop") instead of a lazy drift.
const BASE_GRAVITY = 32
// Extra downward pull per price-unit above SOFT_MAX — the anti-pinning force.
const HIGH_PRESSURE_K = 1.75
// Upward bounce per price-unit below SOFT_MIN — dead coins rest around the Dead/
// Warming band (~18–24) instead of pinning to the absolute floor. Stiff enough
// to balance gravity a little below SOFT_MIN.
const LOW_BOUNCE_K = 3.8
// Velocity damping per second. v0.4H: raised from 1.9 so a tap's pop settles
// into the next drop instead of carrying a long sluggish tail — punchier
// pump-then-fall rhythm, still leaves a beat of inertia between taps.
const FRICTION = 2.3
const VELOCITY_MAX = 66
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
// economy.getChartTapImpulse). v0.4H: nearly doubled from 8.5 — a Flappy Bird
// flap has to be an obvious, immediate pump, not a nudge.
export const CHART_TAP_IMPULSE_BASE = 15
// Chart heat added per tap. Balanced against HEAT_DECAY for the 3-vs-5 taps/s split.
export const CHART_HEAT_PER_TAP = 6
// Mini physics step run on each tap for instant on-screen feedback. v0.4H:
// doubled from 0.05 — the head must visibly move within the first ~100ms of a
// tap, not wait on the next 120ms game tick to carry the impulse.
export const CHART_TAP_STEP = 0.1

// --- v0.4G Straight Sell Wall ---
// Player = the candle/chart head, the only snake-like thing on screen. Enemy =
// a straight sell wall that never bows or curves -- it slides as a rigid whole
// on two independent sine sweeps: horizontal (does the wall's crack currently
// reach the head's fixed lane?) and vertical (does the wall's height currently
// reach the chart's price?). A crack socket rides at a fixed fraction of the
// wall's own length (crackPos), so it visibly travels with the wall instead of
// always sitting in the same spot.
//
// Smash window length (ms). While it is open the panel/button scream "SMASH NOW"
// and any tap breaks the line. v0.4D: lengthened from 320 so the GET READY ->
// SMASH NOW handoff isn't a hair-trigger -- a deliberate tap rhythm gets a real
// beat to react in, not just a spam-favoring reflex check.
export const RESISTANCE_WINDOW_MS = 480
// How fast a live line's anchor drifts down toward a chart stalled below it,
// keeping the target reachable instead of parked out of reach.
export const RESISTANCE_DRIFT_PER_SEC = 2
// v0.4D: once the chart is within this band below the line, drift holds the line
// dead still instead of continuing to creep -- a surfing player gets a stable
// target to hold station against rather than one that's still sliding.
export const RESISTANCE_DRIFT_HOLD_BAND = 8
// The chart must climb into this band below the line for the smash window to open.
export const RESISTANCE_NEAR_BAND = 9
// Distance bands for rating a breakout tap (wall's live height minus chart price).
export const RESISTANCE_PERFECT_BELOW = 4
export const RESISTANCE_PERFECT_ABOVE = 6
export const RESISTANCE_GOOD_BELOW = 20
// Within this distance below the line, the panel/button flip to "approaching".
export const RESISTANCE_APPROACH_BAND = 20
// Transient event beats: how long broken/rejected/overheated hold before the next
// target spawns.
export const RESISTANCE_BROKEN_HOLD_MS = 620
export const RESISTANCE_MISSED_HOLD_MS = 520
export const RESISTANCE_REJECTED_HOLD_MS = 760
export const RESISTANCE_OVERHEAT_HOLD_MS = 560
// v0.4H: 3 -> 4 pips, paired with perfect hits now costing 2 (see reducer.ts) so
// shatter still comes from a real streak instead of every clean hit chaining
// into one, but a run of perfects can still shatter noticeably faster than an
// all-good one.
export const RESISTANCE_MAX_CRACK_PIPS = 4
// Vertical (price) hit band for the crack socket -- how close the wall's live
// height has to be to the chart's price for a breakout to also crack the wall.
// v0.4H: widened (3.7 -> 6.2, 7.4 -> 11.5) -- "hitting the crack is too hard"
// was the single loudest playtest note, and the wall is now wide/slow enough
// that a generous hitbox doesn't trivialize aiming.
export const RESISTANCE_CRACK_ALIGN_BAND = 6.2
export const RESISTANCE_CRACK_ALIGN_BAND_OVERDRIVE = 11.5
// Where along the wall's own length the crack can spawn (0 = back edge, 1 =
// front edge) -- kept off the extreme edges so it always reads as "somewhere
// on the wall", never right at a seam.
const RESISTANCE_CRACK_POS_MIN = 0.16
const RESISTANCE_CRACK_POS_MAX = 0.82
export const RESISTANCE_FOCUS_BAND = RESISTANCE_NEAR_BAND + 2
export const RESISTANCE_FOCUS_START_MS = 300
export const RESISTANCE_FOCUS_READY_MS = 650
export const RESISTANCE_SHATTER_HOLD_MS = 900
// Abstract horizontal "lane" scale the wall moves on -- 0 is as far from the
// head as the wall ever gets, 100 (RESISTANCE_LANE_HEAD) is the candle head's
// own fixed lane. The renderer maps this 1:1 onto the playfield's x-axis, the
// same way price already maps onto y, so hit-testing never touches pixels.
export const RESISTANCE_LANE_MIN = 0
export const RESISTANCE_LANE_HEAD = 100
// The wall's own length in lane units -- the crack rides somewhere inside this
// span, centered on the wall's current lane position. v0.4H: widened (34 -> 54)
// so it reads as a proper wide sell wall crossing the lane, not a thin bar.
// v0.4I: widened again (54 -> 66) plus a much chunkier stroke/glow (see
// theme.css) -- "sell wall still feels a bit too small" was the loudest
// readability note. Purely a render-size bump; the crack's hit bands are
// unchanged, so this doesn't touch difficulty.
export const RESISTANCE_WALL_LANE_SPAN = 66
// Horizontal sweep: how long one full lane_min -> lane_head -> lane_min cycle
// takes. Overdrive slows it so a wide-open crack lingers in reach longer
// instead of just widening the hitbox around a fast-moving point. v0.4H:
// slowed from 3400 -- "wall moves too fast" was the other loud playtest note.
export const RESISTANCE_LANE_SWEEP_PERIOD_MS = 5400
export const RESISTANCE_LANE_SWEEP_PERIOD_MS_OVERDRIVE_SCALE = 1.5
// Vertical bob: the wall's whole straight bar rides up/down around its
// drift-managed anchor price, on an independent (but now closer, so the pair
// reads as one diagonal glide rather than two unrelated wiggles) period/phase
// from the horizontal sweep.
export const RESISTANCE_VERTICAL_BOB_PERIOD_MS = 3600
export const RESISTANCE_VERTICAL_BOB_PERIOD_MS_OVERDRIVE_SCALE = 1.4
export const RESISTANCE_VERTICAL_BOB_AMPLITUDE = 8
// Horizontal hit band for the crack socket -- how close its lane has to be to
// the head's fixed lane (100) for a breakout to also crack the wall. v0.4H:
// widened alongside the vertical crack band -- see note above.
export const RESISTANCE_LANE_ALIGN_BAND = 19
export const RESISTANCE_LANE_ALIGN_BAND_OVERDRIVE = 34
// v0.4H: the first few walls of a run sweep slower and forgive a wider miss,
// easing a fresh (or post-graduation) run into the timing instead of throwing
// full speed at it immediately. Eases back to 1x by wall RESISTANCE_EARLY_WALL_COUNT + 1.
const RESISTANCE_EARLY_WALL_COUNT = 3
const RESISTANCE_EARLY_SPEED_SCALE = 1.55
const RESISTANCE_EARLY_BAND_SCALE = 1.4

function getEarlyLeniencyScale(id: number, factor: number): number {
  if (id < 1 || id > RESISTANCE_EARLY_WALL_COUNT) {
    return 1
  }
  const t = (id - 1) / RESISTANCE_EARLY_WALL_COUNT
  return factor - (factor - 1) * t
}

// v0.4H Bullet Time: on a clean crack hit, the ambient wall/gravity advance
// (not the tap's own instant impulse -- see CHART_TAP_STEP) briefly slows to a
// crawl, then ramps back to normal. Scoped to chart/resistance ticks only (see
// reducer.ts applyChartGravity) so passive income and Chart Gravity decay never
// see the slowed clock -- this is a feel beat, not an economy pause.
// v0.4I: lengthened (260/420 -> 380/620) and slowed further (0.32 -> 0.26) --
// "bullet time is not noticeable" was a loud playtest note. A short full-stop
// freeze (BULLET_TIME_FREEZE_MS) now leads it: hit -> freeze -> slow-mo ->
// speed returns, instead of dropping straight into the crawl.
export const BULLET_TIME_GOOD_MS = 380
export const BULLET_TIME_PERFECT_MS = 620
export const BULLET_TIME_DT_SCALE = 0.26
// v0.4I: a tiny full-stop beat immediately on a clean crack hit, before the
// slow-mo crawl above takes over -- the "impact freeze" frame. Scoped the same
// way (chart/resistance advance only; idleTicks/decay/passive income never see
// it), so it can never stall real progress, only the ambient wall/candle motion.
export const BULLET_TIME_FREEZE_MS = 100
// Anti-pin: the chart sitting above the line this long without a clean break is
// force-rejected, so it can never ride the line up into the ceiling. Shorter than
// the slowest tap cadence would keep a line alive, so continuous play (which
// breaks each line on crossing) never trips it -- only coasting/abandoning does.
export const RESISTANCE_STALE_ABOVE_MS = 700
// The chart crashing this far below the wall's live height respawns a nearer
// target instead of waiting for the slow drift to catch up.
export const RESISTANCE_FAR_BELOW = 34
// v0.4B Focus + Spam Punishment: while the resistance target is holding its
// 'overheated' beat (the TOO HOT scold window), idle ticks bleed chart heat this
// much faster so a player who actually stops tapping recovers visibly quicker
// than one who keeps mashing through it. Only applied by the idle TICK path, not
// the tap path, so mashing through the window never benefits from it.
export const RESISTANCE_OVERHEAT_RECOVERY_SCALE = 1.6

interface ResistanceAdvanceOpts {
  focusCanBuild?: boolean
  heatSafe?: boolean
  lastTapAt?: number
  overdriveActive?: boolean
}

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

// Spawn the next line in a readable mid/high band above the chart. Deliberately
// clamped well below the ceiling (max 80) so chained breakouts never march the
// target up to a permanent top-line. v0.4D: spacing narrowed from 11–17 to 8–13 —
// the line was spawning far enough out that a deliberate (non-spam) tap rhythm
// struggled to close the gap before losing momentum to gravity.
function resistanceSpawnPrice(anchorPrice: number, id: number): number {
  const spacing = 9 + roll(id * 17.19 + anchorPrice * 0.37) * 5
  return round(clamp(anchorPrice + spacing, 40, 84))
}

function pickCrackPos(id: number, seq: number, basePrice: number, avoidPos?: number): number {
  const span = RESISTANCE_CRACK_POS_MAX - RESISTANCE_CRACK_POS_MIN
  let pos = RESISTANCE_CRACK_POS_MIN + roll(id * 41.7 + seq * 19.3 + basePrice * 0.11) * span

  if (typeof avoidPos === 'number' && Math.abs(pos - avoidPos) < 0.16) {
    pos = RESISTANCE_CRACK_POS_MIN + ((pos - RESISTANCE_CRACK_POS_MIN + 0.31) % span)
  }

  return round(pos)
}

// Repositioning after a resolved beat (hit, miss, or rejection) rerolls the
// crack's position along the wall's length so consecutive walls don't put the
// weak point in the same spot every time.
export function moveResistanceCrackTarget(resistance: ResistanceState): ResistanceState {
  const crackTargetSeq = resistance.crackTargetSeq + 1
  return {
    ...resistance,
    crackPos: pickCrackPos(resistance.id, crackTargetSeq, resistance.price, resistance.crackPos),
    crackTargetSeq,
  }
}

export function getResistanceLaneSweepPeriodMs(overdriveActive = false, id = 0): number {
  const base = overdriveActive
    ? RESISTANCE_LANE_SWEEP_PERIOD_MS * RESISTANCE_LANE_SWEEP_PERIOD_MS_OVERDRIVE_SCALE
    : RESISTANCE_LANE_SWEEP_PERIOD_MS
  return base * getEarlyLeniencyScale(id, RESISTANCE_EARLY_SPEED_SCALE)
}

export function getResistanceVerticalBobPeriodMs(overdriveActive = false, id = 0): number {
  const base = overdriveActive
    ? RESISTANCE_VERTICAL_BOB_PERIOD_MS * RESISTANCE_VERTICAL_BOB_PERIOD_MS_OVERDRIVE_SCALE
    : RESISTANCE_VERTICAL_BOB_PERIOD_MS
  return base * getEarlyLeniencyScale(id, RESISTANCE_EARLY_SPEED_SCALE)
}

// The wall's horizontal center right now, as a 0..1 fraction of its lane
// travel (0 = as far from the head as it gets, 1 = at the head's own lane).
// Phase-seeded by id so consecutive walls don't sweep in lockstep.
function getResistanceLaneFrac(resistance: ResistanceState, now: number, overdriveActive = false): number {
  const phaseOffset = roll(resistance.id * 7.13) * Math.PI * 2
  const period = getResistanceLaneSweepPeriodMs(overdriveActive, resistance.id)
  const t = now <= 0 ? phaseOffset : (now / period) * Math.PI * 2 + phaseOffset
  return (Math.sin(t) + 1) / 2
}

// The wall's current lane position (RESISTANCE_LANE_MIN..RESISTANCE_LANE_HEAD).
// This is the whole wall's horizontal position -- it moves as a single rigid
// segment, never bowing or curving.
export function getResistanceWallLane(resistance: ResistanceState, now: number, overdriveActive = false): number {
  const frac = getResistanceLaneFrac(resistance, now, overdriveActive)
  return round(RESISTANCE_LANE_MIN + frac * (RESISTANCE_LANE_HEAD - RESISTANCE_LANE_MIN))
}

// The crack socket's current lane position -- the wall's lane plus its fixed
// offset along the wall's own length (crackPos, 0..1).
export function getResistanceCrackLane(resistance: ResistanceState, now: number, overdriveActive = false): number {
  const wallLane = getResistanceWallLane(resistance, now, overdriveActive)
  return round(wallLane + (resistance.crackPos - 0.5) * RESISTANCE_WALL_LANE_SPAN)
}

// How far the crack socket's lane currently sits from the head's fixed lane.
export function getResistanceLaneDistance(resistance: ResistanceState, now: number, overdriveActive = false): number {
  return Math.abs(RESISTANCE_LANE_HEAD - getResistanceCrackLane(resistance, now, overdriveActive))
}

export function getResistanceLaneBand(overdriveActive = false, id = 0): number {
  const base = overdriveActive ? RESISTANCE_LANE_ALIGN_BAND_OVERDRIVE : RESISTANCE_LANE_ALIGN_BAND
  return base * getEarlyLeniencyScale(id, RESISTANCE_EARLY_BAND_SCALE)
}

// The wall's vertical bob offset right now, added on top of its drift-managed
// anchor price -- a decorrelated phase/period from the horizontal sweep so
// the wall doesn't just trace a diagonal.
export function getResistanceVerticalBobOffset(resistance: ResistanceState, now: number, overdriveActive = false): number {
  const phaseOffset = roll(resistance.id * 3.71 + 1.9) * Math.PI * 2
  const period = getResistanceVerticalBobPeriodMs(overdriveActive, resistance.id)
  const t = now <= 0 ? phaseOffset : (now / period) * Math.PI * 2 + phaseOffset
  return Math.sin(t) * RESISTANCE_VERTICAL_BOB_AMPLITUDE
}

// The wall's live height right now -- its drift-managed anchor price plus the
// current vertical bob. The whole straight bar sits at this one height; there
// is no per-position curve. This is also the crack socket's price, since the
// crack rides on the (flat) bar.
export function getResistanceWallPrice(resistance: ResistanceState, now: number, overdriveActive = false): number {
  return round(clamp(resistance.price + getResistanceVerticalBobOffset(resistance, now, overdriveActive), 18, 98))
}

export function getResistanceCrackPrice(resistance: ResistanceState, now: number, overdriveActive = false): number {
  return getResistanceWallPrice(resistance, now, overdriveActive)
}

export function getResistanceCrackBand(overdriveActive = false, id = 0): number {
  const base = overdriveActive ? RESISTANCE_CRACK_ALIGN_BAND_OVERDRIVE : RESISTANCE_CRACK_ALIGN_BAND
  return base * getEarlyLeniencyScale(id, RESISTANCE_EARLY_BAND_SCALE)
}

// Vertical distance from the snake head (chart price) to the crack socket
// (the wall's live height) right now.
export function getResistanceCrackAlignmentDistance(
  resistance: ResistanceState,
  chart: ChartState,
  now: number,
  overdriveActive = false,
): number {
  return Math.abs(getResistanceCrackPrice(resistance, now, overdriveActive) - chart.price)
}

// The whole hit test: the crack socket has to be close to the head on BOTH
// axes right now -- its lane close to the head's fixed lane, and its
// (bobbing) height close to the chart's price. No velocity, no trajectory
// proxy, no second marker; just "is the visible socket near the visible head".
export function isResistanceCrackAligned(
  resistance: ResistanceState,
  chart: ChartState,
  now: number,
  overdriveActive = false,
): boolean {
  return (
    getResistanceCrackAlignmentDistance(resistance, chart, now, overdriveActive) <=
      getResistanceCrackBand(overdriveActive, resistance.id) &&
    getResistanceLaneDistance(resistance, now, overdriveActive) <= getResistanceLaneBand(overdriveActive, resistance.id)
  )
}

export function createInitialResistance(anchorPrice: number, id = 1): ResistanceState {
  const price = resistanceSpawnPrice(anchorPrice, id)
  return {
    id,
    price,
    crossedAt: 0,
    windowUntil: 0,
    lastResistanceHitAt: 0,
    breakoutStreak: 0,
    perfectBreakouts: 0,
    rejections: 0,
    crackPips: RESISTANCE_MAX_CRACK_PIPS,
    crackPos: pickCrackPos(id, 0, price),
    crackTargetSeq: 0,
    crackHitStreak: 0,
    focusStartedAt: 0,
    phase: anchorPrice >= price - RESISTANCE_APPROACH_BAND ? 'approaching' : 'waiting',
    phaseUntil: 0,
    aboveSinceMs: 0,
    lastRating: null,
  }
}

// Spawn the successor target after a break/reject beat, carrying the run-long
// tallies (streak/perfect/rejections) and the last rating forward.
function respawnResistance(prev: ResistanceState, chart: ChartState, carryStreak = true): ResistanceState {
  const fresh = createInitialResistance(chart.price, prev.id + 1)
  return {
    ...fresh,
    lastResistanceHitAt: prev.lastResistanceHitAt,
    breakoutStreak: carryStreak ? prev.breakoutStreak : 0,
    crackHitStreak: carryStreak ? prev.crackHitStreak : 0,
    perfectBreakouts: prev.perfectBreakouts,
    rejections: prev.rejections,
    lastRating: prev.lastRating,
  }
}

// Live-target phase from the current gap to the line (line − chart).
function derivePhase(distance: number, windowActive: boolean): ResistancePhase {
  if (windowActive) {
    return 'smash'
  }
  return distance <= RESISTANCE_APPROACH_BAND ? 'approaching' : 'waiting'
}

export function getResistanceFocusMs(resistance: ResistanceState, now: number): number {
  if (resistance.focusStartedAt <= 0 || now <= 0) {
    return 0
  }
  return Math.max(0, now - resistance.focusStartedAt)
}

export function isResistanceFocusReady(resistance: ResistanceState, now: number): boolean {
  return getResistanceFocusMs(resistance, now) >= RESISTANCE_FOCUS_READY_MS
}

function clearTransientBeat(resistance: ResistanceState): ResistanceState {
  return {
    ...resistance,
    windowUntil: 0,
    crossedAt: 0,
    phaseUntil: 0,
    aboveSinceMs: 0,
    focusStartedAt: 0,
  }
}

export function advanceResistance(
  resistance: ResistanceState,
  chart: ChartState,
  dt: number,
  now: number,
  opts: ResistanceAdvanceOpts = {},
): ResistanceState {
  let live = resistance

  // Transient event beat (broken / rejected / overheated): freeze the target in
  // place so the crack/rejection visuals sit still. Only a full SHATTER spawns a
  // new target; ordinary cracks keep working the same wall with its remaining pips.
  if (
    live.phase === 'broken' ||
    live.phase === 'missed' ||
    live.phase === 'rejected' ||
    live.phase === 'overheated' ||
    live.phase === 'shattered'
  ) {
    if (now > 0 && now >= live.phaseUntil) {
      if (live.phase === 'shattered') {
        return respawnResistance(live, chart)
      }
      // v0.4F: reposition the weak spot after any resolved beat — hit, miss, or
      // rejection — not just a clean break. Previously only 'broken' moved the
      // target, so a target that landed somewhere the player couldn't reach
      // (see the old velocity-gated alignment check) sat static forever.
      const repositions = live.phase === 'broken' || live.phase === 'missed' || live.phase === 'rejected'
      live = repositions ? moveResistanceCrackTarget(clearTransientBeat(live)) : clearTransientBeat(live)
    } else {
      return live
    }
  }

  const overdriveActive = opts.overdriveActive === true

  // Chart crashed far below the wall's live height (e.g. a jeet dump): bring a
  // nearer target down rather than waiting on the slow drift.
  const preLivePrice = getResistanceWallPrice(live, now, overdriveActive)
  if (now > 0 && chart.price < preLivePrice - RESISTANCE_FAR_BELOW) {
    return respawnResistance(live, chart, false)
  }

  // A live line's ANCHOR drifts down toward a chart stalled below it so it
  // stays reachable. v0.4D: the hold band widened from 5 → RESISTANCE_DRIFT_HOLD_BAND
  // so the line goes fully stationary as soon as the chart is genuinely close,
  // instead of still creeping while the player is trying to hold station near
  // it. Driven off the anchor only (not the bob) so the slow long-run drift
  // doesn't fight the fast vertical wiggle every tick.
  const driftFloor = Math.min(84, Math.max(40, chart.price + 10))
  const driftedPrice =
    chart.price < live.price - RESISTANCE_DRIFT_HOLD_BAND
      ? Math.max(driftFloor, live.price - RESISTANCE_DRIFT_PER_SEC * dt)
      : live.price
  const price = round(driftedPrice)
  // The wall's live (bob-inclusive) height right now — "what the player
  // actually sees", used for every window/phase/anti-pin check below.
  const livePrice = round(clamp(price + getResistanceVerticalBobOffset(live, now, overdriveActive), 18, 98))
  const distance = livePrice - chart.price

  // Anti-pin: track how long the chart has floated above the line without a clean
  // break. Past the stale window, force a rejection so it drops back into range.
  let aboveSinceMs = live.aboveSinceMs
  if (chart.price > livePrice + 1) {
    if (aboveSinceMs === 0 && now > 0) {
      aboveSinceMs = now
    }
  } else {
    aboveSinceMs = 0
  }
  if (now > 0 && aboveSinceMs > 0 && now - aboveSinceMs >= RESISTANCE_STALE_ABOVE_MS) {
    return {
      ...live,
      price,
      windowUntil: 0,
      crossedAt: 0,
      phase: 'rejected',
      phaseUntil: now + RESISTANCE_REJECTED_HOLD_MS,
      rejections: live.rejections + 1,
      breakoutStreak: 0,
      crackHitStreak: 0,
      crackPips: Math.min(RESISTANCE_MAX_CRACK_PIPS, live.crackPips + 1),
      focusStartedAt: 0,
      lastRating: 'rejected',
      aboveSinceMs: 0,
    }
  }

  // Smash window: opens as the chart climbs into the near band, expires on its own.
  const windowActive = live.windowUntil > now
  const expiredWindow = live.windowUntil > 0 && !windowActive
  let windowUntil = expiredWindow ? 0 : live.windowUntil
  let crossedAt = expiredWindow ? 0 : live.crossedAt

  if (now > 0 && windowUntil === 0 && distance <= RESISTANCE_NEAR_BAND && distance >= -RESISTANCE_PERFECT_ABOVE) {
    crossedAt = now
    windowUntil = now + RESISTANCE_WINDOW_MS
  }

  const nowWindowActive = windowUntil > now
  const phase = derivePhase(distance, nowWindowActive)
  const focusPhase = phase === 'approaching' || phase === 'smash'
  const nearEnoughForFocus = distance <= RESISTANCE_FOCUS_BAND && distance >= -RESISTANCE_PERFECT_ABOVE
  const focusStartMs = opts.overdriveActive ? 120 : RESISTANCE_FOCUS_START_MS
  const focusBackdateMs = opts.overdriveActive ? RESISTANCE_FOCUS_READY_MS - 180 : RESISTANCE_FOCUS_START_MS
  const quietMs = opts.lastTapAt && opts.lastTapAt > 0 ? now - opts.lastTapAt : focusStartMs
  const canBuildFocus =
    now > 0 &&
    opts.focusCanBuild === true &&
    opts.heatSafe === true &&
    focusPhase &&
    nearEnoughForFocus &&
    quietMs >= focusStartMs
  const focusStartedAt = canBuildFocus
    ? live.focusStartedAt > 0
      ? live.focusStartedAt
      : Math.max(1, now - focusBackdateMs)
    : 0

  return {
    ...live,
    price,
    windowUntil,
    crossedAt,
    phase,
    aboveSinceMs,
    focusStartedAt,
  }
}

export function classifyTapRating(
  resistance: ResistanceState,
  chart: ChartState,
  now: number,
  overheated: boolean,
  overdriveActive = false,
): TapRating {
  if (overheated) {
    return 'overheated'
  }

  if (resistance.phase === 'overheated') {
    return 'overheated'
  }

  if (resistance.phase === 'rejected') {
    return 'rejected'
  }

  if (resistance.phase === 'broken' || resistance.phase === 'missed' || resistance.phase === 'shattered') {
    return 'weak'
  }

  const distance = getResistanceWallPrice(resistance, now, overdriveActive) - chart.price
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

// v0.4A: resolve what a single tap did to the resistance, read AFTER the tap's
// chart impulse has been applied (so a tap that opens the smash window counts as a
// break). Deliberately forgiving — the punishing paths are overheat and the
// anti-pin stale rejection, not a slightly mistimed tap.
export type BreakoutOutcome = 'breakout-perfect' | 'breakout-good' | 'rejected' | 'overheated' | 'weak' | 'none'

export function resolveBreakoutTap(
  resistance: ResistanceState,
  chart: ChartState,
  now: number,
  overheated: boolean,
  overdriveActive = false,
): BreakoutOutcome {
  // A frozen event beat already resolved this cycle — a tap mid-shatter (or
  // mid-scold) is a no-op. v0.4B: 'overheated' joins this freeze so mashing
  // through the TOO HOT hold can't re-trigger the scold (and its combat text)
  // on every single tap — the reward/heat penalty for those repeat taps is
  // handled separately via the pre-tap rating scale in the reducer.
  if (
    resistance.phase === 'broken' ||
    resistance.phase === 'missed' ||
    resistance.phase === 'rejected' ||
    resistance.phase === 'overheated' ||
    resistance.phase === 'shattered'
  ) {
    return 'none'
  }

  if (overheated) {
    return 'overheated'
  }

  const distance = getResistanceWallPrice(resistance, now, overdriveActive) - chart.price
  const windowActive = resistance.windowUntil > now

  if (windowActive) {
    return distance <= RESISTANCE_PERFECT_BELOW && distance >= -RESISTANCE_PERFECT_ABOVE ? 'breakout-perfect' : 'breakout-good'
  }

  // No open window but the chart has just crossed above the line: a late-but-real
  // push still breaks it (lenient — the window only gates the PERFECT rating).
  if (distance < 0 && distance > -RESISTANCE_GOOD_BELOW) {
    return 'breakout-good'
  }

  // Floating well above the line with no engagement: a genuine rejection.
  if (distance <= -RESISTANCE_GOOD_BELOW) {
    return 'rejected'
  }

  return 'weak'
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
  // v0.4B: >1 speeds up heat decay this step (used by the idle TICK path while
  // the resistance target holds its 'overheated' beat, so pausing during TOO HOT
  // visibly recovers faster than mashing through it). Never applied to the
  // one-off tap heatAdd itself, only the ongoing decay term.
  heatDecayScale?: number
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
              heatDecayScale: opts.heatDecayScale,
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
  // so a hot chart always cools back down on its own. heatDecayScale (v0.4B)
  // can speed the decay term up further (idle recovery during a TOO HOT hold).
  const heatDecayScale = opts.heatDecayScale ?? 1
  heat = Math.max(0, heat - HEAT_DECAY * heatDecayScale * dt + (opts.heatAdd ?? 0) * heatScale)
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
