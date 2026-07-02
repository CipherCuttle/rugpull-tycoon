import { CARDS } from '../data/cards'
import { getUpgrade, UPGRADES } from '../data/upgrades'
import type { GameState } from './types'

export const BONDING_CURVE_TARGET_LIQUIDITY = 1000
export const COPE_CRATE_COST = 4

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
