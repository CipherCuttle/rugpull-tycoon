import { BULL_TRAP_WEEK } from '../data/events'
import { CARD_UNLOCK_ORDER, CARDS, getCard } from '../data/cards'
import { STARTER_COIN } from '../data/starterCoin'
import {
  CARD_LINES,
  DUPLICATE_CARD_LINES,
  EVENT_LINES,
  GRAVITY_FLOOR_HELD_LINE,
  GRAVITY_HIGH_HEAT_LINES,
  GRAVITY_RECOVERY_LINES,
  GRAVITY_START_LINES,
  JEET_LINES,
  LAUNCH_LINES,
  MICRO_LINES,
  MILESTONE_LINES,
  PRESTIGE_LINES,
  TAP_LINES,
  UPGRADE_LINES,
} from '../data/tickerLines'
import { UPGRADES } from '../data/upgrades'
import {
  COPE_CRATE_COST,
  GRACE_TICKS,
  getBondingCurveDelta,
  getBondingCurveTier,
  getCardUnlockChance,
  getClickGain,
  getDecayRate,
  getHeatGain,
  getJeetLossRatio,
  getPassiveGainPerSecond,
  getPrestigeReward,
  getTierFloor,
  getTotalUpgradeLevels,
  getUpgradeCost,
} from './economy'
import { nextChartPoint } from './tick'
import type { EventProgress, GameAction, GameState, ResourceState } from './types'
import { SAVE_VERSION } from './types'

const MAX_TICKER_LINES = 14

const INITIAL_CHART = [
  20, 22, 19, 24, 23, 27, 25, 29, 32, 30, 36, 34, 38, 42, 39, 44, 47, 45, 51, 49, 56, 54, 61, 58,
]

function initialResources(): ResourceState {
  return {
    liquidity: 0,
    hype: 0,
    heat: 0,
    copium: 0,
    receipts: 0,
    exitLiquidity: 0,
    lawyerTokens: 0,
  }
}

function initialUpgrades() {
  return Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 0]))
}

function initialCards() {
  return Object.fromEntries(CARDS.map((card) => [card.id, 0]))
}

function initialEventProgress(): EventProgress {
  return {
    sendCandle: 0,
    buyUpgrades: 0,
    reachLiquidity: 0,
    surviveJeets: 0,
    openCopeCrate: 0,
    graduateCoin: 0,
  }
}

export function createInitialGame(): GameState {
  return {
    saveVersion: SAVE_VERSION,
    resources: initialResources(),
    currentCoin: { ...STARTER_COIN },
    bondingCurveProgress: 0,
    bondingCurveTier: 0,
    idleTicks: 0,
    isDecaying: false,
    upgrades: initialUpgrades(),
    cards: initialCards(),
    event: {
      id: BULL_TRAP_WEEK.id,
      progress: initialEventProgress(),
      claimedTaskIds: [],
      hypeBoostTicks: 0,
    },
    prestigeCount: 0,
    rugPrestige: 0,
    tickerHistory: [
      'Fictional satire mode armed. No wallets, no trading, no real money.',
      'Launch $EGG when ready. The basement lights are flickering.',
    ],
    chartPoints: INITIAL_CHART,
    taps: 0,
    totalLiquidityEarned: 0,
    jeetEventsSurvived: 0,
    copeCratesOpened: 0,
    onboardingComplete: false,
    lastTapEffect: null,
    lastPurchaseEffect: null,
    pendingCardReveal: null,
    majorEvent: null,
    effectSeq: 0,
  }
}

function deterministicRoll(seed: number) {
  const value = Math.sin(seed * 999.1337) * 10000
  return value - Math.floor(value)
}

function pickLine(lines: string[], seed: number) {
  return lines[Math.abs(seed) % lines.length] ?? lines[0] ?? ''
}

function addTicker(state: GameState, line: string): GameState {
  if (!line) {
    return state
  }

  return {
    ...state,
    tickerHistory: [line, ...state.tickerHistory].slice(0, MAX_TICKER_LINES),
  }
}

function updateChart(state: GameState, delta: number): GameState {
  return {
    ...state,
    chartPoints: nextChartPoint(state.chartPoints, delta),
  }
}

// Recomputes the bonding-curve tier and, if a tier boundary was crossed,
// stamps a fresh `majorEvent` (and ticker line) for each tier crossed.
// This is the single hook point for "anywhere bondingCurveProgress changes"
// (SEND_CANDLE, TICK, and event rewards all flow through awardLiquidity).
function applyMilestoneCrossing(state: GameState): GameState {
  const tier = getBondingCurveTier(state.bondingCurveProgress)

  if (tier <= state.bondingCurveTier) {
    return state
  }

  let next = state
  let seq = state.effectSeq

  for (let crossedTier = state.bondingCurveTier + 1; crossedTier <= tier; crossedTier += 1) {
    const line = MILESTONE_LINES[crossedTier]

    if (!line) {
      continue
    }

    seq += 1
    next = addTicker(
      {
        ...next,
        bondingCurveTier: crossedTier,
        effectSeq: seq,
        majorEvent: { id: seq, line },
      },
      line,
    )
  }

  return { ...next, bondingCurveTier: tier }
}

function awardLiquidity(state: GameState, amount: number, chartDelta = 2): GameState {
  if (amount <= 0) {
    return state
  }

  const next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      liquidity: state.resources.liquidity + amount,
    },
    totalLiquidityEarned: state.totalLiquidityEarned + amount,
    bondingCurveProgress: Math.min(100, state.bondingCurveProgress + getBondingCurveDelta(state, amount)),
  }

  return applyMilestoneCrossing(updateChart(next, chartDelta))
}

function unlockCard(state: GameState, seed: number): GameState {
  const cardId = CARD_UNLOCK_ORDER[Math.abs(seed) % CARD_UNLOCK_ORDER.length]
  const card = getCard(cardId)

  if (!card) {
    return state
  }

  const existingCopies = state.cards[cardId] ?? 0
  const isDuplicate = existingCopies > 0
  const seq = state.effectSeq + 1
  const next: GameState = {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: existingCopies + 1,
    },
    resources: {
      ...state.resources,
      copium: state.resources.copium + (isDuplicate ? 1 : 0),
      receipts: state.resources.receipts + (isDuplicate ? 0 : 1),
    },
    effectSeq: seq,
    pendingCardReveal: { id: seq, cardId, isDuplicate },
  }

  return addTicker(
    next,
    `${pickLine(isDuplicate ? DUPLICATE_CARD_LINES : CARD_LINES, seed)} ${card.name} ${isDuplicate ? '+1 Copium.' : 'added.'}`,
  )
}

function updateEventProgress(state: GameState): GameState {
  const progress = state.event.progress
  const nextProgress: EventProgress = {
    sendCandle: Math.max(progress.sendCandle, state.taps),
    buyUpgrades: Math.max(progress.buyUpgrades, getTotalUpgradeLevels(state)),
    reachLiquidity: Math.max(progress.reachLiquidity, Math.floor(state.resources.liquidity)),
    surviveJeets: Math.max(progress.surviveJeets, state.jeetEventsSurvived),
    openCopeCrate: Math.max(progress.openCopeCrate, state.copeCratesOpened),
    graduateCoin: progress.graduateCoin,
  }

  return {
    ...state,
    event: {
      ...state.event,
      progress: nextProgress,
    },
  }
}

function applyEventReward(state: GameState, taskId: keyof EventProgress): GameState {
  let next = state

  if (taskId === 'sendCandle') {
    // v0.3.1: award Liquidity as spendable *currency* only — deliberately NOT
    // through awardLiquidity(), so this milestone reward never jumps the bonding
    // curve. In v0.3 this granted +250 curve-driving Liquidity (~+25% curve),
    // which skipped most of the pressure loop. It now buys ~an upgrade's worth of
    // firepower and feels good, but you still have to tap the curve up yourself.
    const bonus = 200
    next = {
      ...next,
      resources: {
        ...next.resources,
        liquidity: next.resources.liquidity + bonus,
      },
      totalLiquidityEarned: next.totalLiquidityEarned + bonus,
    }
  }

  if (taskId === 'buyUpgrades') {
    next = {
      ...next,
      resources: {
        ...next.resources,
        hype: next.resources.hype + 2,
      },
    }
  }

  if (taskId === 'reachLiquidity') {
    next = {
      ...next,
      resources: {
        ...next.resources,
        copium: next.resources.copium + COPE_CRATE_COST,
      },
    }
  }

  if (taskId === 'surviveJeets') {
    next = unlockCard(next, 91 + next.jeetEventsSurvived)
  }

  if (taskId === 'openCopeCrate') {
    next = {
      ...next,
      event: {
        ...next.event,
        hypeBoostTicks: Math.max(next.event.hypeBoostTicks, 90),
      },
    }
  }

  if (taskId === 'graduateCoin') {
    next = {
      ...next,
      resources: {
        ...next.resources,
        receipts: next.resources.receipts + 5,
        exitLiquidity: next.resources.exitLiquidity + 1,
      },
    }
  }

  return addTicker(next, `${pickLine(EVENT_LINES, next.event.claimedTaskIds.length)} ${taskId} reward claimed.`)
}

function syncEvent(state: GameState): GameState {
  let next = updateEventProgress(state)
  const claimed = new Set(next.event.claimedTaskIds)

  for (const task of BULL_TRAP_WEEK.tasks) {
    if (claimed.has(task.id)) {
      continue
    }

    if (next.event.progress[task.id] >= task.target) {
      claimed.add(task.id)
      next = {
        ...next,
        event: {
          ...next.event,
          claimedTaskIds: [...claimed],
        },
      }
      next = applyEventReward(next, task.id)
    }
  }

  return next
}

function maybeUnlockTapCard(state: GameState): GameState {
  const guaranteedMilestone = state.taps > 0 && state.taps % 15 === 0
  const chance = getCardUnlockChance(state)
  const rolled = deterministicRoll(state.taps + state.prestigeCount * 37 + Math.floor(state.totalLiquidityEarned)) < chance

  if (!guaranteedMilestone && !rolled) {
    return state
  }

  return unlockCard(state, state.taps + state.prestigeCount * 11)
}

function launchCoin(state: GameState): GameState {
  if (state.currentCoin.launched) {
    return state
  }

  return addTicker(
    {
      ...state,
      currentCoin: {
        ...state.currentCoin,
        launched: true,
      },
      lastOutcome: undefined,
    },
    pickLine(LAUNCH_LINES, state.prestigeCount + state.currentCoin.runNumber),
  )
}

function sendCandle(state: GameState): GameState {
  if (!state.currentCoin.launched) {
    return launchCoin(state)
  }

  // v0.3: a tap always resets the idle timer and clears the decaying flag —
  // returning your attention is exactly what the pressure loop rewards. Capture
  // whether we were mid-decay first, so the rescue tap can crit harder and fire
  // a recovery line.
  const wasDecaying = state.isDecaying

  const tapId = state.taps + 1
  const baseGain = getClickGain(state)
  // v0.2 juice: ~1-in-8 taps land a "critical candle" for a chunkier payout
  // and a louder visual. Deterministic so it stays reproducible/save-safe.
  // v0.3: crit chance nudges up while actively decaying so a rescue burst feels
  // heroic (still deterministic — driven by the stored isDecaying flag).
  const critChance = wasDecaying ? 0.18 : 0.12
  const isCrit = deterministicRoll(tapId * 2.71 + state.prestigeCount * 3.77) < critChance
  const gain = isCrit ? baseGain * 3 : baseGain

  let next: GameState = {
    ...state,
    taps: tapId,
    idleTicks: 0,
    isDecaying: false,
    resources: {
      ...state.resources,
      heat: state.resources.heat + getHeatGain(state),
    },
  }

  next = awardLiquidity(next, gain, isCrit ? 8 : 4)
  next = addTicker(next, pickLine(TAP_LINES, next.taps))

  const microRoll = deterministicRoll(tapId * 7.13 + state.prestigeCount * 3.01)
  const microLine = isCrit ? 'CRITICAL CANDLE' : microRoll < 0.15 ? pickLine(MICRO_LINES, tapId) : null

  next = {
    ...next,
    lastTapEffect: { id: tapId, gain, microLine, crit: isCrit },
  }

  if (next.taps % 12 === 0) {
    const loss = Math.floor(next.resources.liquidity * getJeetLossRatio(next))
    next = {
      ...next,
      resources: {
        ...next.resources,
        liquidity: Math.max(0, next.resources.liquidity - loss),
        heat: next.resources.heat + 2,
      },
      jeetEventsSurvived: next.jeetEventsSurvived + 1,
    }
    next = updateChart(next, -9)
    next = addTicker(next, `${pickLine(JEET_LINES, next.jeetEventsSurvived)} -${loss} Liquidity.`)
  }

  next = maybeUnlockTapCard(next)

  // v0.3: reward the rescue. The first tap that breaks an active decay gets a
  // brief "chart stabilizing" line so recovering feels good.
  if (wasDecaying) {
    next = addTicker(next, pickLine(GRAVITY_RECOVERY_LINES, tapId))
  }

  return syncEvent(next)
}

function buyUpgrade(state: GameState, upgradeId: string): GameState {
  const cost = getUpgradeCost(state, upgradeId)

  if (!state.currentCoin.launched || state.resources.liquidity < cost) {
    return state
  }

  const level = state.upgrades[upgradeId] ?? 0
  const newLevel = level + 1
  const seq = state.effectSeq + 1
  const next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      liquidity: state.resources.liquidity - cost,
      hype: state.resources.hype + (upgradeId === 'micro_kol_contract' ? 1 : 0),
      lawyerTokens: state.resources.lawyerTokens + (upgradeId === 'lawyer_token_retainer' ? 1 : 0),
    },
    upgrades: {
      ...state.upgrades,
      [upgradeId]: newLevel,
    },
    effectSeq: seq,
    lastPurchaseEffect: { id: seq, upgradeId, level: newLevel },
  }

  return syncEvent(addTicker(next, pickLine(UPGRADE_LINES, level + cost)))
}

function openCopeCrate(state: GameState): GameState {
  if (state.resources.copium < COPE_CRATE_COST) {
    return state
  }

  let next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      copium: state.resources.copium - COPE_CRATE_COST,
    },
    copeCratesOpened: state.copeCratesOpened + 1,
  }

  next = unlockCard(next, state.copeCratesOpened + 50 + state.prestigeCount * 5)

  return syncEvent(next)
}

function graduateCoin(state: GameState): GameState {
  if (!state.currentCoin.launched || state.bondingCurveProgress < 100) {
    return state
  }

  const reward = getPrestigeReward(state)
  const outcome = pickLine(PRESTIGE_LINES, state.prestigeCount + Math.floor(state.resources.heat))
  const carriedEvent = {
    ...state.event,
    progress: {
      ...state.event.progress,
      graduateCoin: Math.max(state.event.progress.graduateCoin, 1),
    },
    hypeBoostTicks: 0,
  }

  // createInitialGame() already resets bondingCurveTier/lastTapEffect/
  // lastPurchaseEffect/pendingCardReveal/effectSeq to their fresh-run
  // defaults (0/null/null/null/0) — only the graduation majorEvent itself
  // needs to be stamped explicitly below.
  const seq = 1
  const graduationLine = `${state.currentCoin.ticker} GRADUATED DIRECTLY INTO A CRIME SCENE`

  const next: GameState = {
    ...createInitialGame(),
    resources: {
      ...initialResources(),
      copium: state.resources.copium,
      receipts: state.resources.receipts + reward.receipts,
      exitLiquidity: state.resources.exitLiquidity + reward.exitLiquidity,
      lawyerTokens: state.resources.lawyerTokens,
    },
    currentCoin: {
      ...STARTER_COIN,
      runNumber: state.currentCoin.runNumber + 1,
    },
    cards: state.cards,
    event: carriedEvent,
    prestigeCount: state.prestigeCount + 1,
    rugPrestige: state.rugPrestige + reward.rugPrestige,
    tickerHistory: [
      `${outcome} +${reward.exitLiquidity} Exit Liquidity, +${reward.receipts} Receipts.`,
      ...state.tickerHistory,
    ].slice(0, MAX_TICKER_LINES),
    lastOutcome: outcome,
    onboardingComplete: state.onboardingComplete,
    effectSeq: seq,
    majorEvent: { id: seq, line: graduationLine },
  }

  return syncEvent(next)
}

// v0.3 Chart Gravity. Applied once per tick AFTER passive income, so passive
// curve gain naturally offsets decay (an idle player with strong passive stalls
// rather than bleeds). The golden safeguard lives here: decay only ever lowers
// the *fractional* bondingCurveProgress within the current tier band, floored at
// TIER_FLOORS[bondingCurveTier]. It never touches the tier, liquidity, cards,
// upgrades, resources, or event progress, and never calls milestone crossing.
function applyChartGravity(state: GameState): GameState {
  const idleTicks = state.idleTicks + 1

  // Never decay while onboarding, or while a card-reveal modal is pending
  // (reading time is not idle time). The prestige/graduation modal only opens at
  // 100% where the floor already prevents any decay, so no extra flag is needed.
  if (!state.onboardingComplete || state.pendingCardReveal !== null) {
    return { ...state, idleTicks, isDecaying: false }
  }

  // Grace window: recent taps buy breathing room before gravity engages.
  if (idleTicks < GRACE_TICKS) {
    return { ...state, idleTicks, isDecaying: false }
  }

  const floor = getTierFloor(state.bondingCurveTier)
  const rate = getDecayRate(state)
  const progress = state.bondingCurveProgress
  const nextProgress = Math.max(floor, progress - rate)

  // Nothing to bleed (already at/below floor, or rate fully dampened): idle but
  // not decaying.
  if (nextProgress >= progress) {
    return { ...state, idleTicks, isDecaying: false }
  }

  let next: GameState = {
    ...state,
    idleTicks,
    bondingCurveProgress: nextProgress,
    isDecaying: true,
  }

  // Sag the fake chart line on decaying ticks so the visual follows the number.
  next = updateChart(next, -1.5)

  if (nextProgress === floor) {
    // Decay just landed exactly on the tier floor and stops. Announce once —
    // this only fires on the single tick that hits the floor (subsequent ticks
    // see nextProgress >= progress and bail above).
    const seq = next.effectSeq + 1
    next = addTicker(
      { ...next, effectSeq: seq, majorEvent: { id: seq, line: GRAVITY_FLOOR_HELD_LINE } },
      GRAVITY_FLOOR_HELD_LINE,
    )
  } else if (idleTicks === GRACE_TICKS) {
    // First decaying tick of this episode: one warning line, not a per-tick spam.
    // Hotter coins get a nastier flavor.
    const highHeat = state.resources.heat >= 120
    const line = highHeat
      ? pickLine(GRAVITY_HIGH_HEAT_LINES, idleTicks + Math.floor(state.resources.heat))
      : pickLine(GRAVITY_START_LINES, idleTicks + state.bondingCurveTier)
    next = addTicker(next, line)
  }

  return next
}

function runTick(state: GameState): GameState {
  let next = state

  if (next.event.hypeBoostTicks > 0) {
    next = {
      ...next,
      event: {
        ...next.event,
        hypeBoostTicks: Math.max(0, next.event.hypeBoostTicks - 1),
      },
    }
  }

  // No decay before the coin is launched.
  if (!next.currentCoin.launched) {
    return next
  }

  const passive = getPassiveGainPerSecond(next)

  if (passive > 0) {
    next = awardLiquidity(next, passive, 1.4)
    next = syncEvent(next)
  }

  // Chart Gravity runs every launched tick regardless of passive, so the idle
  // grace timer advances and decay can engage even with zero passive income.
  return applyChartGravity(next)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LAUNCH_COIN':
      return launchCoin(state)
    case 'SEND_CANDLE':
      return sendCandle(state)
    case 'BUY_UPGRADE':
      return buyUpgrade(state, action.upgradeId)
    case 'OPEN_COPE_CRATE':
      return openCopeCrate(state)
    case 'GRADUATE_COIN':
      return graduateCoin(state)
    case 'TICK':
      return runTick(state)
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true }
    case 'RESET_SAVE':
      return createInitialGame()
    default:
      return state
  }
}
