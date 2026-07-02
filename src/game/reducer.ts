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
  COMBO_BREAK_MS,
  COMBO_WINDOW_MS,
  COPE_CRATE_COST,
  GRACE_TICKS,
  getBondingCurveDelta,
  getBondingCurveTier,
  getCardUnlockChance,
  getChartAutoImpulse,
  getChartFrictionScale,
  getChartGravityScale,
  getChartJeetDump,
  getChartTapImpulse,
  getClickGain,
  getComboCritBonus,
  getComboMultiplier,
  getDecayRate,
  getHeatGain,
  getIsOverdrive,
  getIsSupercharged,
  getJeetLossRatio,
  getPassiveGainPerSecond,
  getPrestigeReward,
  getTierFloor,
  getTotalUpgradeLevels,
  getUpgradeCost,
  OVERDRIVE_ARM_MS,
  OVERDRIVE_CRIT_BONUS,
  OVERDRIVE_CURVE_BONUS,
  OVERDRIVE_DURATION_MS,
  OVERDRIVE_IMPULSE_SCALE,
  SUPERCHARGE_BUILD_PER_SEC,
  SUPERCHARGE_CHAIN_MIN,
  SUPERCHARGE_DECAY_PER_SEC,
  SUPERCHARGE_HEAT_SCALE,
  SUPERCHARGE_IMPULSE_SCALE,
  SUPERCHARGE_MAX,
} from './economy'
import { advanceChart, createInitialChart, CHART_HEAT_PER_TAP, CHART_TAP_STEP } from './chart'
import type { EventProgress, FountainKind, GameAction, GameState, ResourceState, ToastKind } from './types'
import { SAVE_VERSION } from './types'

const MAX_TICKER_LINES = 14

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
    combo: 0,
    comboMultiplier: 1,
    lastTapAt: 0,
    maxComboThisRun: 0,
    supercharge: 0,
    superchargeFullMs: 0,
    overdriveUntil: 0,
    fountainEvents: [],
    fountainSeq: 0,
    chart: createInitialChart(),
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
    taps: 0,
    totalLiquidityEarned: 0,
    jeetEventsSurvived: 0,
    copeCratesOpened: 0,
    onboardingComplete: true,
    lastTapEffect: null,
    lastPurchaseEffect: null,
    pendingCardReveal: null,
    toast: null,
    newCardCount: 0,
    streakEffect: null,
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

// v0.3.4: advance the visual candle chart by `dt` seconds. Purely cosmetic —
// never touches liquidity, the bonding curve, or the tier floors. The reducer
// funnels every chart nudge (a tap's impulse, an idle tick's fall, a jeet dump)
// through here so the physics live in one place (game/chart.ts).
function advanceChartState(
  state: GameState,
  dt: number,
  opts: Parameters<typeof advanceChart>[2] = {},
): GameState {
  return { ...state, chart: advanceChart(state.chart, dt, opts) }
}

// Single non-blocking toast slot. Each stamp overwrites the previous one, so the
// UI never needs a queue to honor "one toast at a time".
function stampToast(state: GameState, kind: ToastKind, title: string, line: string): GameState {
  const seq = state.effectSeq + 1
  return { ...state, effectSeq: seq, toast: { id: seq, kind, title, line } }
}

const STREAK_REWARDS: Record<number, { title: string; line: string }> = {
  5: { title: 'CHAIN STARTED', line: '×1.2 CURVE PUSH · SURF PRESSURE BOOSTED' },
  10: { title: 'NICE CANDLE', line: '×1.5 CURVE PUSH · CRIT CHANCE UP' },
  20: { title: 'SURFING THE LIE', line: '×2.0 CURVE PUSH · CRIT CHANCE UP' },
  35: { title: "JEETS CAN'T KEEP UP", line: '×3.0 CURVE PUSH · SUPERCHARGE CLIMBING' },
  50: { title: 'GRAVITY CLOCKED OUT', line: '×3.0 CURVE PUSH LOCKED' },
  75: { title: 'SUPERCHARGE ONLINE', line: 'CRIT CHANCE UP · OVERDRIVE INCOMING' },
  100: { title: 'THE CHART IS LYING BEAUTIFULLY', line: '×3.0 CURVE PUSH · KEEP THE CHAIN ALIVE' },
}

// v0.3.5 Streak Fountain. Newest event appended to a capped ring; the
// StreakFountain component turns each new id into one short-lived DOM particle.
// Capped so a frantic masher can never flood the DOM.
const MAX_FOUNTAIN_EVENTS = 8

function pushFountain(state: GameState, text: string, kind: FountainKind): GameState {
  const seq = state.fountainSeq + 1
  return {
    ...state,
    fountainSeq: seq,
    fountainEvents: [...state.fountainEvents, { id: seq, text, kind }].slice(-MAX_FOUNTAIN_EVENTS),
  }
}

const SUPERCHARGE_ONLINE_LINES = ['SUPERCHARGED', 'THE CANDLE ENGINE IS SCREAMING', 'MASH WINDOW OPEN']
const OVERDRIVE_START_LINES = [
  'OVERDRIVE ACTIVE',
  'MASH WITHOUT CONSEQUENCES',
  'GRAVITY HAS LEFT THE CHAT',
  'JEETS ARE TEMPORARILY ILLEGAL',
  'THE CHART IS NOW PURE FICTION',
]

function stampStreakReward(state: GameState, combo: number): GameState {
  const reward = STREAK_REWARDS[combo]

  if (!reward) {
    return state
  }

  const seq = state.effectSeq + 1
  // Milestone drives both the big Guitar-Hero banner (streakEffect) and a
  // floating-combat-text burst in the fountain lane.
  return pushFountain(
    {
      ...state,
      effectSeq: seq,
      streakEffect: { id: seq, combo, title: reward.title, line: reward.line },
    },
    reward.title,
    'milestone',
  )
}

function getUpgradeToastLine(upgradeId: string): string {
  switch (upgradeId) {
    case 'shill_bot':
      return 'PASSIVE FLOW UP — keeps the lie breathing'
    case 'micro_kol_contract':
      return 'HYPE UP — bigger candles, louder lies'
    case 'volume_bot_choir':
    case 'fake_chart_printer':
      return 'TAP POWER UP — each candle pushes harder'
    case 'community_cope_amplifier':
      return 'GRAVITY SLOWED — chain survives longer'
    case 'jeet_containment_drone':
      return 'JEET DAMAGE DOWN — dips hurt less'
    case 'cto_revival_megaphone':
      return 'PASSIVE FLOW UP — chart breathes while you rest'
    case 'lawyer_token_retainer':
      return 'HEAT DOWN — mashing stays safer'
    case 'side_wallet_dust_collector':
    case 'meta_rotation_radar':
      return 'EVIDENCE ODDS UP — more receipts drop'
    case 'bonding_curve_accelerator':
      return 'CURVE PUSH UP — combo climbs faster'
    case 'cabal_group_chat_invite':
      return 'ALL GAINS UP — every fake number fattens'
    default:
      return 'EFFECT UP — the loop gets louder'
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

// v0.3.2: wallet Liquidity (spendable, drives upgrade economy) and curve pressure
// (drives the bonding-curve bar) are now decoupled. `curveAmount` defaults to the
// wallet amount, but SEND_CANDLE passes a combo-scaled curve amount so the Candle
// Chain accelerates graduation without inflating upgrade income. Chart is no
// longer touched here — callers push the surf-driven chart point themselves.
function awardLiquidity(state: GameState, walletAmount: number, curveAmount = walletAmount): GameState {
  if (walletAmount <= 0 && curveAmount <= 0) {
    return state
  }

  const wallet = Math.max(0, walletAmount)
  const next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      liquidity: state.resources.liquidity + wallet,
    },
    totalLiquidityEarned: state.totalLiquidityEarned + wallet,
    bondingCurveProgress: Math.min(100, state.bondingCurveProgress + getBondingCurveDelta(state, Math.max(0, curveAmount))),
  }

  return applyMilestoneCrossing(next)
}

function unlockCard(state: GameState, seed: number): GameState {
  const cardId = CARD_UNLOCK_ORDER[Math.abs(seed) % CARD_UNLOCK_ORDER.length]
  const card = getCard(cardId)

  if (!card) {
    return state
  }

  const existingCopies = state.cards[cardId] ?? 0
  const isDuplicate = existingCopies > 0
  let next: GameState = {
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
    // New (non-duplicate) evidence bumps the Cards-tab badge instead of popping a
    // blocking modal. Cleared by ACK_CARDS when the drawer is opened.
    newCardCount: state.newCardCount + (isDuplicate ? 0 : 1),
  }

  // v0.3.3: evidence stays secondary. During an active Candle Chain the badge
  // and ticker record it, but the toast lane stays quiet so streak feedback
  // owns the player's attention.
  if (state.combo < 5) {
    next = stampToast(next, 'evidence', card.name, isDuplicate ? 'Duplicate receipt · +1 Copium' : 'New receipt bagged')
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

function sendCandle(state: GameState, now: number): GameState {
  if (!state.currentCoin.launched) {
    return launchCoin(state)
  }

  // v0.3: a tap always resets the idle timer and clears the decaying flag —
  // returning your attention is exactly what the pressure loop rewards. Capture
  // whether we were mid-decay first, so the rescue tap can crit harder and fire
  // a recovery line.
  const wasDecaying = state.isDecaying
  const tapId = state.taps + 1

  // v0.3.2 Candle Chain: a tap inside the window continues the chain; otherwise
  // it starts a fresh one at 1. (lastTapAt === 0 means "first tap of the run".)
  const withinWindow = state.lastTapAt > 0 && now - state.lastTapAt <= COMBO_WINDOW_MS
  const combo = withinWindow ? state.combo + 1 : 1
  const comboMultiplier = getComboMultiplier(combo)
  // v0.3.5: the streak-mastery states shape this tap (meters themselves advance in
  // the TICK loop; here we just read the state they're in).
  const isOverdrive = getIsOverdrive(state.overdriveUntil, now)
  const isSupercharged = getIsSupercharged(state.supercharge)

  const baseGain = getClickGain(state)
  // v0.2 juice: a "critical candle" lands a chunkier payout and a louder visual.
  // Deterministic so it stays reproducible/save-safe. v0.3: crit nudges up while
  // decaying (heroic rescue). v0.3.2: and nudges up with a hot chain, so combo
  // taps crit noticeably more — part of "combo taps feel much better".
  const comboCritBonus = getComboCritBonus(comboMultiplier)
  // v0.3.5: Overdrive nudges crit chance up (part of the "everything is amazing"
  // window), on top of the decay-rescue and combo bonuses.
  const critChance = (wasDecaying ? 0.18 : 0.12) + comboCritBonus + (isOverdrive ? OVERDRIVE_CRIT_BONUS : 0)
  const isCrit = deterministicRoll(tapId * 2.71 + state.prestigeCount * 3.77) < critChance
  // Wallet gain (economy) is combo-independent — only crit scales it. Curve
  // pressure gets the full combo multiplier, so the chain surfs the chart faster
  // without inflating upgrade income. v0.3.5: Overdrive adds a modest curve boost
  // — enough to reward mastery, small enough to keep the 2–4 min pacing intact.
  const walletGain = isCrit ? baseGain * 3 : baseGain
  const curveGain = walletGain * comboMultiplier * (isOverdrive ? OVERDRIVE_CURVE_BONUS : 1)

  let next: GameState = {
    ...state,
    taps: tapId,
    idleTicks: 0,
    isDecaying: false,
    combo,
    comboMultiplier,
    lastTapAt: now,
    maxComboThisRun: Math.max(state.maxComboThisRun, combo),
    resources: {
      ...state.resources,
      heat: state.resources.heat + getHeatGain(state),
    },
  }

  // v0.3.4: a tap shoves the visual chart's velocity (impulse, not position) and
  // adds chart heat. A mini physics step runs immediately so the current candle
  // visibly reacts to this tap; the 120ms game tick keeps it alive between taps.
  // v0.3.5: streak-mastery states make the tap punchier and safer. Supercharge
  // hits harder and cooks slower; Overdrive hits harder still and cannot overheat.
  const impulseScale = isOverdrive ? OVERDRIVE_IMPULSE_SCALE : isSupercharged ? SUPERCHARGE_IMPULSE_SCALE : 1
  const heatScale = isOverdrive ? 0 : isSupercharged ? SUPERCHARGE_HEAT_SCALE : 1
  const tapImpulse = getChartTapImpulse(next, comboMultiplier, isCrit) * impulseScale
  next = advanceChartState(next, CHART_TAP_STEP, {
    impulse: tapImpulse,
    heatAdd: CHART_HEAT_PER_TAP + (isCrit ? 4 : 0),
    heatScale,
    noReversal: isOverdrive,
    frictionScale: getChartFrictionScale(comboMultiplier),
    gravityScale: getChartGravityScale(next),
  })

  next = awardLiquidity(next, walletGain, curveGain)

  // Ticker de-spam (subtask 6): a tap line only on a crit or every 10th tap,
  // instead of one per tap. The chain/chart/button carry the per-tap feedback.
  if (isCrit || tapId % 10 === 0) {
    next = addTicker(next, pickLine(TAP_LINES, tapId))
  }

  const microRoll = deterministicRoll(tapId * 7.13 + state.prestigeCount * 3.01)
  const microLine = isCrit ? 'CRITICAL CANDLE' : microRoll < 0.12 ? pickLine(MICRO_LINES, tapId) : null

  next = {
    ...next,
    lastTapEffect: { id: tapId, gain: walletGain, microLine, crit: isCrit },
  }

  next = stampStreakReward(next, combo)

  // v0.3.5 fountain combat text. Crits are the loud moment (two bursts); a light
  // "CHAIN N" burst every 15th link keeps the between-milestone stretches alive.
  // Kept sparse on purpose — the component also caps particles as a backstop.
  if (isCrit) {
    next = pushFountain(next, 'CRIT CANDLE', 'crit')
    next = pushFountain(next, `+${walletGain} Liquidity`, 'gain')
  } else if (combo >= SUPERCHARGE_CHAIN_MIN && combo % 15 === 0 && !STREAK_REWARDS[combo]) {
    next = pushFountain(next, `CHAIN ${combo}`, 'chain')
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
    // A jeet raid stamps a red dump candle — a visible dip mid-mash, shrunk by
    // the Jeet Containment Drone upgrade.
    next = advanceChartState(next, CHART_TAP_STEP, { jeetDump: getChartJeetDump(next) })
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

  // Non-blocking confirmation: a compact operator toast (subtask 1/6). The row
  // pulse is driven by lastPurchaseEffect in the UpgradeList itself.
  const upgrade = UPGRADES.find((entry) => entry.id === upgradeId)
  const withToast = upgrade
    ? stampToast(next, 'operator', `${upgrade.name} · Lv ${newLevel}`, getUpgradeToastLine(upgrade.id))
    : next

  return syncEvent(addTicker(withToast, pickLine(UPGRADE_LINES, level + cost)))
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
function applyChartGravity(state: GameState, now: number, dtSeconds: number): GameState {
  const idleTicks = state.idleTicks + dtSeconds

  // v0.3.4: advance the visual candle chart every tick. When the player isn't
  // tapping, gravity + friction pull it down; passive upgrades add a gentle idle
  // lift so the chart still "breathes" while you rest. Fully cosmetic.
  // v0.3.5: during Overdrive the idle ticks between mashes must not cook heat or
  // trigger a reversal either, or a fast masher's gaps would still punish them.
  const overdriveActive = getIsOverdrive(state.overdriveUntil, now)
  const withChart: GameState = advanceChartState({ ...state, idleTicks }, dtSeconds, {
    gravityScale: getChartGravityScale(state),
    autoImpulse: getChartAutoImpulse(state),
    heatScale: overdriveActive ? 0 : 1,
    noReversal: overdriveActive,
  })

  // Never drift while onboarding (the prestige/graduation modal only opens at
  // 100% where the curve floor already prevents any decay). v0.3.2: the
  // pendingCardReveal pause is gone — evidence is a non-blocking toast now, so
  // "reading time" no longer freezes the loop.
  if (!state.onboardingComplete) {
    return { ...withChart, isDecaying: false }
  }

  // Break an idle Candle Chain (cosmetic/feel — never touches the curve floor).
  const chainBroken = state.combo > 0 && now - state.lastTapAt > COMBO_BREAK_MS
  const combo = chainBroken ? 0 : state.combo
  const comboMultiplier = chainBroken ? 1 : state.comboMultiplier

  const drifted: GameState = { ...withChart, combo, comboMultiplier }

  // Grace window: recent taps buy breathing room before curve gravity engages.
  if (idleTicks < GRACE_TICKS) {
    return { ...drifted, isDecaying: false }
  }

  const floor = getTierFloor(drifted.bondingCurveTier)
  const rate = getDecayRate(drifted)
  const progress = drifted.bondingCurveProgress
  const nextProgress = Math.max(floor, progress - rate * dtSeconds)

  // Nothing to bleed (already at/below floor, or rate fully dampened): idle but
  // not decaying.
  if (nextProgress >= progress) {
    return { ...drifted, isDecaying: false }
  }

  let next: GameState = {
    ...drifted,
    bondingCurveProgress: nextProgress,
    isDecaying: true,
  }

  if (nextProgress === floor) {
    // Decay just landed exactly on the tier floor and stops. Announce once —
    // this only fires on the single tick that hits the floor (subsequent ticks
    // see nextProgress >= progress and bail above).
    const seq = next.effectSeq + 1
    next = addTicker(
      { ...next, effectSeq: seq, majorEvent: { id: seq, line: GRAVITY_FLOOR_HELD_LINE } },
      GRAVITY_FLOOR_HELD_LINE,
    )
  } else if (state.idleTicks < GRACE_TICKS && idleTicks >= GRACE_TICKS) {
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

// v0.3.5 Supercharge / Overdrive meters. Runs once per tick AFTER Chart Gravity
// (which is where an idle Candle Chain breaks), so it reads the freshly-updated
// combo. Builds supercharge while the chain is alive (faster at higher combo
// multipliers), bleeds it when broken, and arms a timed Overdrive window once the
// meter has been pinned at full long enough. All cosmetic/feel — it never touches
// the bonding curve here (Overdrive's small curve nudge lives in the tap path).
function updateStreakMeters(state: GameState, now: number, dt: number): GameState {
  const wasSupercharged = getIsSupercharged(state.supercharge)
  const overdriveActive = getIsOverdrive(state.overdriveUntil, now)
  const chainAlive = state.combo >= SUPERCHARGE_CHAIN_MIN

  let supercharge = state.supercharge
  let superchargeFullMs = state.superchargeFullMs
  let overdriveUntil = state.overdriveUntil

  // Overdrive just expired: clear the marker so the UI hides and meters resume.
  if (overdriveUntil > 0 && !overdriveActive) {
    overdriveUntil = 0
  }

  // Advance the meter — frozen (spent) for the duration of an active Overdrive.
  if (overdriveActive) {
    // hold at whatever it was reset to
  } else if (chainAlive) {
    supercharge = Math.min(SUPERCHARGE_MAX, supercharge + SUPERCHARGE_BUILD_PER_SEC * state.comboMultiplier * dt)
  } else {
    supercharge = Math.max(0, supercharge - SUPERCHARGE_DECAY_PER_SEC * dt)
  }

  const nowSupercharged = getIsSupercharged(supercharge)

  // Arm Overdrive by holding the meter pinned at full with the chain still alive.
  let armedThisTick = false
  if (!overdriveActive && nowSupercharged && chainAlive) {
    superchargeFullMs += dt * 1000
    if (superchargeFullMs >= OVERDRIVE_ARM_MS) {
      overdriveUntil = now + OVERDRIVE_DURATION_MS
      supercharge = 0
      superchargeFullMs = 0
      armedThisTick = true
    }
  } else if (!overdriveActive) {
    superchargeFullMs = 0
  }

  let next: GameState = { ...state, supercharge, superchargeFullMs, overdriveUntil }

  if (armedThisTick) {
    next = pushFountain(next, pickLine(OVERDRIVE_START_LINES, state.taps + state.combo), 'overdrive')
    next = addTicker(next, 'OVERDRIVE ENGAGED — gravity has left the chat.')
  } else if (!wasSupercharged && nowSupercharged && !overdriveActive) {
    next = pushFountain(next, pickLine(SUPERCHARGE_ONLINE_LINES, state.taps + state.combo), 'supercharge')
  }

  return next
}

function runTick(state: GameState, now: number, dtSeconds = 1): GameState {
  let next = state
  const boundedDt = Math.max(0.05, Math.min(1, dtSeconds))

  if (next.event.hypeBoostTicks > 0) {
    next = {
      ...next,
      event: {
        ...next.event,
        hypeBoostTicks: Math.max(0, next.event.hypeBoostTicks - boundedDt),
      },
    }
  }

  // No decay before the coin is launched.
  if (!next.currentCoin.launched) {
    return next
  }

  const passive = getPassiveGainPerSecond(next) * boundedDt

  if (passive > 0) {
    // Passive drives wallet + curve equally (no combo multiplier on idle income).
    next = awardLiquidity(next, passive)
    next = syncEvent(next)
  }

  // Chart Gravity runs every launched tick regardless of passive, so the idle
  // grace timer advances and decay can engage even with zero passive income.
  next = applyChartGravity(next, now, boundedDt)

  // v0.3.5: advance the Supercharge/Overdrive meters off the (now-updated) combo.
  return updateStreakMeters(next, now, boundedDt)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LAUNCH_COIN':
      return launchCoin(state)
    case 'SEND_CANDLE':
      return sendCandle(state, action.now)
    case 'BUY_UPGRADE':
      return buyUpgrade(state, action.upgradeId)
    case 'OPEN_COPE_CRATE':
      return openCopeCrate(state)
    case 'GRADUATE_COIN':
      return graduateCoin(state)
    case 'TICK':
      return runTick(state, action.now, action.dtSeconds)
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true }
    case 'ACK_CARDS':
      return state.newCardCount === 0 ? state : { ...state, newCardCount: 0 }
    case 'RESET_SAVE':
      return createInitialGame()
    default:
      return state
  }
}
