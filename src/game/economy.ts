import { CARDS } from '../data/cards'
import { getUpgrade, UPGRADES } from '../data/upgrades'
import { CHART_TAP_IMPULSE_BASE } from './chart'
import type { GameState, ResistancePhase, TapRating } from './types'

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
export const COMBO_WINDOW_MS = 850
export const COMBO_BREAK_MS = 1000
export const COMBO_MAX_MULTIPLIER = 3

// --- v0.3.5 Supercharge / Overdrive constants ---
// Supercharge meter runs 0–100. It bleeds slowly whenever the Candle Chain is
// broken. At 100 the run is "Supercharged" (cooler mashing, punchier taps).
//
// v0.4C Overdrive Quality Gate: raw combo length no longer *fuels* this meter —
// holding a chain merely postpones the decay below. The actual fuel is
// per-tap/breakout quality (see BREAKOUT_SUPERCHARGE_GAIN_* and
// getTapSuperchargeTrickle), so a hot chain of mistimed spam sits flat instead
// of climbing on its own. "Spam builds heat. Timing breaks walls."
export const SUPERCHARGE_MAX = 100
export const SUPERCHARGE_CHAIN_MIN = 5
export const SUPERCHARGE_DECAY_PER_SEC = 8
// While Supercharged, mashing heat builds at this fraction (cooler), and taps hit
// this much harder into the chart.
export const SUPERCHARGE_HEAT_SCALE = 0.55
export const SUPERCHARGE_IMPULSE_SCALE = 1.15
// Hold Supercharge pinned at 100 (with the quality gate cleared — see
// BREAKOUT_QUALITY_ARM_THRESHOLD) this long to arm Overdrive, which then runs
// for OVERDRIVE_DURATION_MS. Entering Overdrive spends the meter back to 0 and
// consumes the quality gate, so both must be rebuilt for the next one.
export const OVERDRIVE_ARM_MS = 4000
export const OVERDRIVE_DURATION_MS = 8000
// v0.4C: a tiny per-tap Supercharge trickle for an ordinary/weak tap that never
// touches the resistance line — enough that casual tapping isn't completely dead,
// nowhere near enough to arm Overdrive on its own (spam would need ~7 min of
// nonstop weak taps to fill the meter on trickle alone). Perfect/good taps that
// (rarely) miss the breakout path still get a small nudge, well under an actual
// breakout's payout.
export const SUPERCHARGE_TRICKLE_WEAK = 0.2
export const SUPERCHARGE_TRICKLE_GOOD = 0.5
export const SUPERCHARGE_TRICKLE_PERFECT = 1
// v0.4C: a mistimed tap that gets rejected visibly costs banked charge — "REJECTED
// — CHARGE LOST". Overheated taps are milder: no charge gained, but nothing taken
// either ("TOO HOT — NO CHARGE") since the chart's own reversal/heat physics
// already punish that state hard.
export const SUPERCHARGE_REJECT_LOSS = 10

// v0.4C Overdrive Quality Gate. `breakoutQualityScore` is a small, fast-moving
// tally of *recent* breakout quality — separate from the Supercharge number so a
// player can't bank one great streak and coast on raw combo forever. Perfect/good
// breakouts raise it, rejected/overheated taps knock it back down, and it decays
// on its own so "recent" stays honest. Overdrive requires both the meter full AND
// this score at/above the threshold; it resets to 0 the instant Overdrive fires.
export const BREAKOUT_QUALITY_MAX = 6
export const BREAKOUT_QUALITY_ARM_THRESHOLD = 3
export const BREAKOUT_QUALITY_GAIN_PERFECT = 2
export const BREAKOUT_QUALITY_GAIN_GOOD = 1
export const BREAKOUT_QUALITY_LOSS = 1
export const BREAKOUT_QUALITY_DECAY_PER_SEC = 0.08

export function getTapSuperchargeTrickle(rating: TapRating | null): number {
  switch (rating) {
    case 'perfect':
      return SUPERCHARGE_TRICKLE_PERFECT
    case 'good':
      return SUPERCHARGE_TRICKLE_GOOD
    case 'weak':
      return SUPERCHARGE_TRICKLE_WEAK
    default:
      // 'rejected' / 'overheated' / null (Overdrive bypasses rating entirely).
      return 0
  }
}

// v0.4C: combo may still nudge a breakout's Supercharge payout, but capped hard
// so a long raw chain can't out-fuel actual timing — combo alone maxes out a 1.3×
// bump, versus a clean perfect-vs-good breakout call being a ~2× difference.
export function getBreakoutComboScale(comboMultiplier: number): number {
  return Math.min(1 + (comboMultiplier - 1) * 0.15, 1.3)
}
// During Overdrive: no heat gain, no reversal, punchier taps, a small crit bump,
// and a modest (not pace-breaking) curve boost.
export const OVERDRIVE_IMPULSE_SCALE = 1.5
export const OVERDRIVE_CRIT_BONUS = 0.1
export const OVERDRIVE_CURVE_BONUS = 1.2

export function getIsSupercharged(supercharge: number): boolean {
  return supercharge >= SUPERCHARGE_MAX
}

export function getIsOverdrive(overdriveUntil: number, now: number): boolean {
  return overdriveUntil > now
}

// --- v0.3 Chart Gravity constants ---
// Idle seconds of grace before the curve begins to decay. Tapping resets the
// counter, so any active play trivially outruns gravity.
export const GRACE_TICKS = 1.25
// Base decay, in curve-% per second, evaluated in the TICK loop.
export const BASE_DECAY_PER_SEC = 0.7
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

export function getComboCritBonus(comboMultiplier: number): number {
  return comboMultiplier >= 2 ? 0.06 : comboMultiplier >= 1.5 ? 0.03 : 0
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

// v0.3.4: the zones now key off the visual chart *price* (0–100), matching the
// design bands: 0–25 Dead, 25–45 Warming, 45–75 Surf, 75–90 Overheated, 90+
// Graduation/Rug Pressure. The 45–75 Surf band is the sweet spot.
export function getSurfZone(price: number): SurfZoneInfo {
  const zone: SurfZone =
    price >= 90 ? 'graduation' : price >= 75 ? 'overheated' : price >= 45 ? 'surf' : price >= 25 ? 'warming' : 'dead'

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

// --- v0.3.4 chart control: how the economy shapes the visual candle physics ---
// All of these are feel/visual only. They make upgrades and streaks *visible* in
// the chart's behavior without touching liquidity or the bonding curve.

// Per-tap velocity impulse into the chart, shaped by the levers the player can
// see: TAP POWER (click), HYPE, ALL GAINS, and the live Candle Chain. Crits kick
// harder and (in the reducer) spawn a bigger wick.
export function getChartTapImpulse(state: GameState, comboMultiplier: number, isCrit: boolean): number {
  const tapPower = 1 + Math.min(getUpgradeEffectTotal(state, 'click') / 40, 0.9)
  const hype = 1 + Math.min((getHypeMultiplier(state) - 1) * 0.35, 0.5)
  const allGains = getAllGainsMultiplier(state)
  const combo = 1 + (comboMultiplier - 1) * 0.5

  const base = CHART_TAP_IMPULSE_BASE * tapPower * hype * allGains * combo
  return isCrit ? base * 1.9 : base
}

// GRAVITY upgrade (Community Cope Amplifier) + prestige also slow how hard the
// chart falls between taps. Reuses the curve-decay dampener so the upgrade's
// advertised effect is felt in the toy too. <1 means gentler gravity.
export function getChartGravityScale(state: GameState): number {
  const dampener = Math.min(getUpgradeEffectTotal(state, 'decay'), DECAY_DAMPENER_CAP)
  const prestigeSoften = PRESTIGE_DECAY_SOFTEN * Math.min(state.prestigeCount, 5)
  return Math.max(0.5, 1 - dampener - prestigeSoften)
}

// A hot Candle Chain reduces chart friction so momentum persists — this is what
// lets a sustained rhythm "surf" instead of stalling. <1 means less friction.
export function getChartFrictionScale(comboMultiplier: number): number {
  return Math.max(0.6, 1 - (comboMultiplier - 1) * 0.14)
}

// JEET SHIELD shrinks the red dump candle a raid produces.
export function getChartJeetDump(state: GameState): number {
  const shield = getUpgradeEffectTotal(state, 'jeetShield')
  return Math.max(6, 26 * (1 - Math.min(shield, 0.8)))
}

// PASSIVE upgrades gently lift the chart while idle ("the lie breathes while you
// rest"), scaled off the same passive income the player is buying.
export function getChartAutoImpulse(state: GameState): number {
  const passive = getPassiveGainPerSecond(state)
  return passive > 0 ? Math.min(passive * 0.05, 6) : 0
}

// --- v0.4B Focus + Spam Punishment: tap-timing reward/heat/impulse shaping ---
// `classifyTapRating` (chart.ts) already scores a tap against the live resistance
// target the instant BEFORE its own impulse lands — perfect/good read as "you
// timed this", weak/rejected/overheated read as "you didn't". These three scales
// turn that read into the actual incentive: precise taps pay more and cook less,
// spam taps pay less and cook more. `null` is still accepted for old call sites,
// but v0.4F keeps classification active during Overdrive so the wide crack
// window, not blind mashing, is what makes that mode powerful.
export function getTapRatingRewardScale(rating: TapRating | null): number {
  switch (rating) {
    case 'perfect':
      return 1.2
    case 'good':
      return 1.0
    case 'weak':
      return 0.6
    case 'rejected':
      return 0.25
    case 'overheated':
      // Zero: a tap thrown while TOO HOT should read as "this did nothing" for
      // wallet/curve progress, not just "did less" — the headless sim (see
      // memory) showed a milder penalty here still let raw spam volume
      // out-graduate timed play. walletGain still floors at 1 in the reducer so
      // the tap never feels like a dead input, just an unrewarded one.
      return 0
    default:
      return 1.0
  }
}

// v0.4D: perfect/good heat-add trimmed further (0.75→0.62, 1.0→0.85) so a
// deliberate timed rhythm can sit near resistance without cooking itself out of
// the zone; weak/rejected bumped up (1.3→1.4, 1.7→1.8) to keep the spam-vs-timed
// heat gap at least as wide as before, not narrower.
export function getTapRatingHeatScale(rating: TapRating | null): number {
  switch (rating) {
    case 'perfect':
      return 0.62
    case 'good':
      return 0.85
    case 'weak':
      return 1.4
    case 'rejected':
      return 1.8
    case 'overheated':
      return 2.0
    default:
      return 1.0
  }
}

// v0.4D: good's impulse bumped (1.0→1.12) so a well-timed (not just perfect) tap
// pushes noticeably harder — weak/rejected/overheated (the spam-ish outcomes)
// are untouched, so this only rewards taps that were already reading as "on
// target", not raw tap volume.
export function getTapRatingImpulseScale(rating: TapRating | null): number {
  switch (rating) {
    case 'perfect':
      return 1.15
    case 'good':
      return 1.12
    case 'weak':
      return 0.65
    case 'rejected':
      return 0.4
    case 'overheated':
      return 0.2
    default:
      return 1.0
  }
}

// v0.4D Resistance Surf: while the chart is actively holding station near a live
// resistance target (approaching/smash), gravity eases off a bit so a controlled
// tap rhythm can ride the line instead of needing panic-mash cadence to fight the
// fall. Reverts to full gravity the instant the target flips to rejected/
// overheated, so mashing through TOO HOT still dumps the chart at full force —
// the ease is a reward for engaging cleanly, not a blanket softener.
export const RESISTANCE_APPROACH_GRAVITY_SCALE = 0.82

export function getResistancePhaseGravityScale(phase: ResistancePhase): number {
  return phase === 'approaching' || phase === 'smash' ? RESISTANCE_APPROACH_GRAVITY_SCALE : 1
}
