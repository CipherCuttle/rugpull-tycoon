// v0.6A Chart Hazards — a thin OVERLAY layer on top of the existing v0.5A
// FakeChart. It does NOT touch the candle/snake, the chart path, the tap/send
// physics, or chart.ts. It only describes, from Date.now() alone (no per-frame
// reducer state), where a single "scam gate" obstacle and a single Bag pickup
// sit so FakeChart can draw them and test them against the EXISTING candle-head
// position. Fictional arcade satire only.
//
// Both hazards travel across the chart on independent timed cycles and resolve
// against the head the player already steers with the same taps as before —
// tap the price into the gate's safe gap, or into the pickup's lane. No new
// movement, no new currency.

// Prices are on the same 0–100 scale FakeChart already maps with priceToY.

// --- Scam gate obstacle ---
export const GATE_CYCLE_MS = 7600
// The visible sweep portion of a cycle; the remainder is the calm gap between
// gates (nothing on screen), so the chart still reads as "almost identical".
export const GATE_TRAVEL_MS = 4600
// Price half-height of the safe passage between the top/bottom junk teeth.
export const GATE_GAP_HALF = 17
// Pixel band around the head's x where a strike actually resolves (the gate's
// "active window"). Wide enough that the ~120ms tick can't sample past it.
export const GATE_STRIKE_BAND = 10
// Where a gate/pickup enters from, as a fraction of chart width.
export const HAZARD_FROM_FRAC = 0.12

// --- Bag pickup ---
export const PICKUP_CYCLE_MS = 5200
export const PICKUP_TRAVEL_MS = 3800
export const PICKUP_CATCH_BAND = 12
export const PICKUP_CATCH_PRICE = 13
// Unbanked Bag added on a chart pickup. Uses THE BAG (runBag) — not a new
// currency.
export const CHART_BAG_PICKUP_VALUE = 18

// --- Obstacle crash flash ---
export const OBSTACLE_CRASH_MS = 640

// Deterministic 0..1 hash so each sequence gets a stable, varied lane without
// any stored RNG state.
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export interface GateDescriptor {
  // Monotonic sequence id (derived from the epoch) — one hit per gate.
  seq: number
  active: boolean
  // 0 (just entered, far from head) → 1 (arrived at head lane).
  progress: number
  // Safe-gap center price and half-height.
  gapCenter: number
  gapHalf: number
}

export function getChartGate(now: number): GateDescriptor {
  const seq = Math.floor(now / GATE_CYCLE_MS)
  const t = now - seq * GATE_CYCLE_MS
  const active = t < GATE_TRAVEL_MS
  const progress = active ? t / GATE_TRAVEL_MS : 1
  const gapCenter = 32 + hash(seq * 1.7 + 3) * 40 // 32..72, reachable band
  return { seq, active, progress, gapCenter, gapHalf: GATE_GAP_HALF }
}

export interface PickupDescriptor {
  seq: number
  active: boolean
  progress: number
  price: number
}

export function getChartPickup(now: number): PickupDescriptor {
  const seq = Math.floor(now / PICKUP_CYCLE_MS)
  const t = now - seq * PICKUP_CYCLE_MS
  const active = t < PICKUP_TRAVEL_MS
  const progress = active ? t / PICKUP_TRAVEL_MS : 1
  const price = 30 + hash(seq * 2.3 + 11) * 44 // 30..74
  return { seq, active, progress, price }
}
