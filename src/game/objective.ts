import { UPGRADES } from '../data/upgrades'
import { getUpgradeCost } from './economy'
import type { GameState } from './types'

// Tier label copy is intentionally kept here (UI-only concern) rather than
// in economy.ts, since it is presentation copy derived from the numeric
// `bondingCurveTier` that subtask 1 already computes/stores.
export const MILESTONE_TIER_LABELS: Record<number, string> = {
  0: 'Basement Launch',
  1: 'Jeets Noticed',
  2: 'KOLs Circling',
  3: 'Gravity Unstable',
  4: 'Ready to Graduate',
}

export function getMilestoneLabel(tier: number): string {
  return MILESTONE_TIER_LABELS[tier] ?? MILESTONE_TIER_LABELS[0]
}

const TIER_THRESHOLDS = [25, 50, 75, 100]

// A tier boundary is only treated as "the" near-term objective once you're
// within this many percentage points of it — otherwise, for most of a tier's
// span, saving up for the next upgrade is the more actionable objective.
const CLOSE_TO_TIER_MARGIN = 8

export function getNextObjective(state: GameState): string {
  const ticker = state.currentCoin.ticker

  if (!state.currentCoin.launched) {
    return `Next: Launch ${ticker}`
  }

  if (state.bondingCurveProgress >= 100) {
    return `Next: Graduate ${ticker}`
  }

  const nextThreshold = TIER_THRESHOLDS.find((threshold) => state.bondingCurveProgress < threshold) ?? 100
  const distanceToThreshold = nextThreshold - state.bondingCurveProgress

  const cheapestUnaffordable = UPGRADES.map((upgrade) => ({
    upgrade,
    cost: getUpgradeCost(state, upgrade.id),
  }))
    .filter(({ cost }) => cost > state.resources.liquidity)
    .sort((a, b) => a.cost - b.cost)[0]

  if (distanceToThreshold > CLOSE_TO_TIER_MARGIN && cheapestUnaffordable) {
    return `Next: Buy ${cheapestUnaffordable.upgrade.name}`
  }

  return `Next: Reach ${nextThreshold}% Bonding Curve`
}
