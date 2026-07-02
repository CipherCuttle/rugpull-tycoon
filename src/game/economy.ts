import { CARDS } from '../data/cards'
import { getUpgrade, UPGRADES } from '../data/upgrades'
import type { GameState } from './types'

// v0.3.1 Economy Tuning: the amount of *curve-driving* Liquidity needed to fill
// the bonding curve from 0→100%. Raised 13× from v0.3 (was 1000) so a full
// graduation takes ~2–4 minutes of active tapping instead of ~15 seconds. This
// only stretches the bar — Liquidity still accrues at the same rate for buying
// upgrades, so the button keeps its punchy feel while Chart Gravity has room to
// actually matter between taps. Existing saves keep their 0–100% progress; only
// forward pacing changes, so this is save-compatible.
// v0.3.2 Chart Surf Combo: raised from 13000 so a *base* (x1 combo) tap fills the
// curve more slowly, leaving room for the Candle Chain multiplier to restore the
// pace. Curve pressure per tap = wallet gain × comboMultiplier, so normal mashing
// (which sustains ~x1.5–x2) lands first graduation back in the ~2–4 min band,
// while a dedicated masher holding x3 is faster but not absurd. Wallet Liquidity
// income is unchanged, so upgrade affordability/pacing is identical to v0.3.1.
//
// Tuned via the headless sim (see memory headless-economy-sim): continuous
// tapping saturates the chain to x3 within a few seconds, so effective pace ≈
// base ÷ 3. At 42000, normal play (3 taps/s) graduates in ~3 min, a casual 2/s
// in ~3.8 min, and a 5/s masher in ~1.8 min — the 2–4 min band with a faster,
// non-absurd ceiling. Save-compatible (only forward pace changes; progress is
// stored 0–100%).
export const BONDING_CURVE_TARGET_LIQUIDITY = 42000
export const COPE_CRATE_COST = 4

// --- v0.3.2 Candle Chain combo constants ---
// A tap landing within this window (ms) of the previous one continues the chain;
// a later tap resets it to 1. Ticks break an idle chain after COMBO_BREAK_MS.
export const COMBO_WINDOW_MS = 900
export const COMBO_BREAK_MS = 1200
export const COMBO_MAX_MULTIPLIER = 3

// --- v0.3.2 Surf Pressure constants (feel/visual only, not economy) ---
// Per-tap push into the surf meter. It scales with combo, then soft-caps as the
// meter gets hot so hard mashing can flash into Graduation Push without pinning
// the chart at 100: raw push = BASE + mult×PER, effective push = raw×scale.
// Decay is split so the meter reads cleanly:
//   - while actively tapping, a gentle proportional decay gives a shallow
//     sawtooth whose equilibrium tracks tap rate (~casual→Warming, normal→Surf,
//     masher→Overheated/Graduation), so the zone label is informative not flickery;
//   - once idle (no tap within SURF_IDLE_MS), a much stronger decay makes the
//     line visibly drift down within a few seconds — "stopping causes drift".
export const SURF_TAP_PUSH_BASE = 2.3
export const SURF_TAP_PUSH_PER_MULT = 1.35
export const SURF_ACTIVE_DECAY = 0.085
export const SURF_IDLE_DECAY = 0.5
export const SURF_IDLE_FLAT = 6
export const SURF_IDLE_MS = 900
// A jeet raid knocks the surf line down by a fraction of its current height (a
// visible dip that recovers in a couple of seconds), rather than a flat amount
// that would wipe the whole meter at this scale.
export const SURF_JEET_DAMP = 0.8

const SURF_TAP_SOFT_CAP = 140
const SURF_TAP_MIN_SCALE = 0.2

// --- v0.3 Chart Gravity constants ---
// Idle ticks (1s each) of grace before the curve begins to decay. Tapping
// resets the idle counter, so any active play trivially outruns gravity.
export const GRACE_TICKS = 3
// Base decay, in curve-% per second, evaluated in the TICK loop.
export const BASE_DECAY_PER_SEC = 0.6
// Heat makes a coin "too hot": decay scales up with heat, capped.
export const HEAT_DECAY_SCALE = 200
export const HEAT_DECAY_CAP = 0.75
// Total decay dampening from `decay` upgrades is clamped here.
export const DECAY_DAMPENER_CAP = 0.45
// Prestige softens decay so later runs feel faster (capped at 5 prestiges).
export const PRESTIGE_DECAY_SOFTEN = 0.03
// One-way milestone floors: progress can decay within a band but never below
// the floor of the tier already earned. Index = bondingCurveTier.
export const TIER_FLOORS = [0, 25, 50, 75, 100]
// How close (in curve-%) to the current floor counts as "near the floor" for
// the panic UI while decaying.
export const NEAR_FLOOR_MARGIN = 3

// v0.3.2 Candle Chain multiplier tiers. Builds quickly (a real masher passes 20
// in a few seconds) and caps at x3. Applied to curve pressure + crit chance only.
export function getComboMultiplier(combo: number): number {
  if (combo >= 35) {
    return 3.0
  }

  if (combo >= 20) {
    return 2.0
  }

  if (combo >= 10) {
    return 1.5
  }

  if (combo >= 5) {
    return 1.2
  }

  return 1.0
}

// Per-tap surf push, bigger the hotter your chain — this is what pushes normal
// mashing into the Surf zone and combo mashing into Overheated/Graduation Push.
export function getSurfTapPush(comboMultiplier: number, currentPressure = 0): number {
  const rawPush = SURF_TAP_PUSH_BASE + comboMultiplier * SURF_TAP_PUSH_PER_MULT
  const softCapScale = Math.max(SURF_TAP_MIN_SCALE, 1 - currentPressure / SURF_TAP_SOFT_CAP)

  return rawPush * softCapScale
}

export type SurfZone = 'dead' | 'warming' | 'surf' | 'overheated' | 'graduation'

export interface SurfZoneInfo {
  zone: SurfZone
  label: string
}

const SURF_ZONE_LABELS: Record<SurfZone, string> = {
  dead: 'Dead Coin',
  warming: 'Warming Up',
  surf: 'Surf Zone',
  overheated: 'Overheated',
  graduation: 'Graduation Push',
}

export function getSurfZone(pressure: number): SurfZoneInfo {
  const zone: SurfZone =
    pressure >= 84 ? 'graduation' : pressure >= 74 ? 'overheated' : pressure >= 55 ? 'surf' : pressure >= 25 ? 'warming' : 'dead'

  return { zone, label: SURF_ZONE_LABELS[zone] }
}

export function getBondingCurveTier(progress: number): number {
  if (progress >= 100) {
    return 4
  }

  if (progress >= 75) {
    return 3
  }

  if (progress >= 50) {
    return 2
  }

  if (progress >= 25) {
    return 1
  }

  return 0
}

export function getTierFloor(tier: number): number {
  return TIER_FLOORS[Math.max(0, Math.min(TIER_FLOORS.length - 1, tier))] ?? 0
}

// Chart Gravity decay rate in curve-% per second for the current state:
//   base × heat scaling − upgrade dampeners − prestige softener, clamped ≥ 0.
// This is the *raw* rate; passive curve gain naturally offsets it in the tick
// (passive is awarded before decay is applied), so idle players with strong
// passive stall rather than bleed.
export function getDecayRate(state: GameState): number {
  const heatScale = 1 + Math.min(state.resources.heat / HEAT_DECAY_SCALE, HEAT_DECAY_CAP)
  const dampener = Math.min(getUpgradeEffectTotal(state, 'decay'), DECAY_DAMPENER_CAP)
  const prestigeSoften = PRESTIGE_DECAY_SOFTEN * Math.min(state.prestigeCount, 5)

  return Math.max(0, BASE_DECAY_PER_SEC * heatScale - dampener - prestigeSoften)
}

// True when progress is sitting within NEAR_FLOOR_MARGIN above the current
// tier floor (and not already graduated). Used to escalate the button copy to
// "one candle from the floor" tension — the floor still can't be breached.
export function getIsNearTierFloor(state: GameState): boolean {
  if (state.bondingCurveTier >= TIER_FLOORS.length - 1) {
    return false
  }

  const floor = getTierFloor(state.bondingCurveTier)
  return state.bondingCurveProgress > floor && state.bondingCurveProgress <= floor + NEAR_FLOOR_MARGIN
}

export function getUpgradeLevel(state: GameState, upgradeId: string) {
  return state.upgrades[upgradeId] ?? 0
}

export function getUpgradeCost(state: GameState, upgradeId: string) {
  const upgrade = getUpgrade(upgradeId)

  if (!upgrade) {
    return Number.POSITIVE_INFINITY
  }

  const level = getUpgradeLevel(state, upgradeId)
  return Math.ceil(upgrade.baseCost * upgrade.scaling ** level)
}

export function getTotalUpgradeLevels(state: GameState) {
  return Object.values(state.upgrades).reduce((sum, level) => sum + level, 0)
}

export function getUpgradeEffectTotal(state: GameState, effect: string) {
  return UPGRADES.reduce((total, upgrade) => {
    if (upgrade.effect !== effect) {
      return total
    }

    return total + getUpgradeLevel(state, upgrade.id) * upgrade.effectValue
  }, 0)
}

export function getUniqueCardCount(state: GameState) {
  return CARDS.reduce((total, card) => total + (state.cards[card.id] ? 1 : 0), 0)
}

export function hasCard(state: GameState, cardId: string) {
  return (state.cards[cardId] ?? 0) > 0
}

export function getCardGainMultiplier(state: GameState) {
  let multiplier = 1 + getUniqueCardCount(state) * 0.01

  if (hasCard(state, 'you_were_not_early')) {
    multiplier += 0.05
  }

  if (hasCard(state, 'exit_interface_badge')) {
    multiplier += 0.02
  }

  return multiplier
}

export function getPrestigeMultiplier(state: GameState) {
  return 1 + state.prestigeCount * 0.15 + state.rugPrestige * 0.08 + state.resources.exitLiquidity * 0.01
}

export function getHypeMultiplier(state: GameState) {
  const hypeFromUpgrades = getUpgradeEffectTotal(state, 'hype')
  const temporaryBoost = state.event.hypeBoostTicks > 0 ? 0.35 : 0
  const cardBoost = hasCard(state, 'cto_cope_meter') ? 0.03 : 0
  const receiptBoost = Math.min(state.resources.receipts * 0.002, 0.12)

  return 1 + state.resources.hype * 0.04 + hypeFromUpgrades + temporaryBoost + cardBoost + receiptBoost
}

export function getAllGainsMultiplier(state: GameState) {
  return 1 + getUpgradeEffectTotal(state, 'allGains')
}

export function getClickGain(state: GameState) {
  const base = 12
  const upgradeFlat = getUpgradeEffectTotal(state, 'click')
  const cardFlat = hasCard(state, 'chart_gravity_debt') ? 2 : 0

  return Math.max(
    1,
    Math.round(
      (base + upgradeFlat + cardFlat) *
        getHypeMultiplier(state) *
        getPrestigeMultiplier(state) *
        getCardGainMultiplier(state) *
        getAllGainsMultiplier(state),
    ),
  )
}

export function getPassiveGainPerSecond(state: GameState) {
  const basePassive = getUpgradeEffectTotal(state, 'passive')
  const cardPassive = hasCard(state, 'side_wallet_dust') ? 1.01 : 1
  const choirCard = hasCard(state, 'volume_bot_choir') ? 1.02 : 1

  return (
    basePassive *
    getHypeMultiplier(state) *
    getPrestigeMultiplier(state) *
    getCardGainMultiplier(state) *
    getAllGainsMultiplier(state) *
    cardPassive *
    choirCard
  )
}

export function getBondingCurveMultiplier(state: GameState) {
  let multiplier = 1 + getUpgradeEffectTotal(state, 'curve')

  if (hasCard(state, 'bonding_curve_body')) {
    multiplier += 0.02
  }

  if (hasCard(state, 'graduation_crime_scene')) {
    multiplier += 0.04
  }

  return multiplier
}

export function getBondingCurveDelta(state: GameState, liquidityGain: number) {
  return (liquidityGain / BONDING_CURVE_TARGET_LIQUIDITY) * 100 * getBondingCurveMultiplier(state)
}

export function getCardUnlockChance(state: GameState) {
  const upgradeChance = getUpgradeEffectTotal(state, 'cardChance')
  const cardChance = hasCard(state, 'wrong_ticker_poster') ? 0.01 : 0
  const baseChance = 0.035

  return Math.min(0.22, baseChance + upgradeChance + cardChance + state.resources.receipts * 0.0005)
}

export function getJeetLossRatio(state: GameState) {
  const shield = getUpgradeEffectTotal(state, 'jeetShield')
  const cardShield = hasCard(state, 'jeet_stampede') ? 0.01 : 0

  return Math.max(0.02, 0.1 - shield - cardShield)
}

export function getHeatGain(state: GameState) {
  const shield = getUpgradeEffectTotal(state, 'heatShield')
  return Math.max(0.05, 0.4 - shield)
}

export function getPrestigeReward(state: GameState) {
  return {
    exitLiquidity: Math.max(1, Math.floor(1 + state.resources.heat / 12 + state.prestigeCount * 0.5)),
    rugPrestige: 1,
    receipts: Math.max(3, Math.floor(3 + getUniqueCardCount(state) / 3)),
  }
}
