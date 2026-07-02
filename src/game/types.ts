import type { ChartState } from './chart'

export const SAVE_VERSION = 1

export type ResourceKey =
  | 'liquidity'
  | 'hype'
  | 'heat'
  | 'copium'
  | 'receipts'
  | 'exitLiquidity'
  | 'lawyerTokens'

export type ResourceState = Record<ResourceKey, number>

export type UpgradeEffect =
  | 'click'
  | 'passive'
  | 'hype'
  | 'curve'
  | 'cardChance'
  | 'jeetShield'
  | 'heatShield'
  | 'allGains'
  // v0.3 Chart Gravity: dampens the idle bonding-curve decay rate.
  | 'decay'

export interface UpgradeDefinition {
  id: string
  name: string
  baseCost: number
  scaling: number
  effect: UpgradeEffect
  effectValue: number
  description: string
  iconPrompt: string
}

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface CardDefinition {
  id: string
  name: string
  rarity: CardRarity
  effect?: string
  flavorText: string
  iconPrompt: string
}

export interface CoinState {
  id: string
  ticker: string
  name: string
  launched: boolean
  runNumber: number
}

export interface EventProgress {
  sendCandle: number
  buyUpgrades: number
  reachLiquidity: number
  surviveJeets: number
  openCopeCrate: number
  graduateCoin: number
}

export interface EventTaskDefinition {
  id: keyof EventProgress
  label: string
  target: number
  rewardText: string
}

export interface EventTrackDefinition {
  id: string
  name: string
  description: string
  tasks: EventTaskDefinition[]
}

export interface EventState {
  id: string
  progress: EventProgress
  claimedTaskIds: string[]
  hypeBoostTicks: number
}

export type TapRating = 'perfect' | 'good' | 'weak' | 'rejected' | 'overheated'

// v0.4A Resistance Breakout Clarity Pass. The resistance target now walks a small
// arcade state machine so the player reads it as a boss weak-point, not a passive
// overlay. `waiting`/`approaching`/`smash` are derived from the live chart price;
// `broken`/`rejected`/`overheated` are short-lived event beats (held until
// `phaseUntil`) that a tap (or the anti-pin timer) stamps.
export type ResistancePhase = 'waiting' | 'approaching' | 'smash' | 'broken' | 'rejected' | 'overheated'

export interface ResistanceState {
  id: number
  price: number
  crossedAt: number
  windowUntil: number
  lastResistanceHitAt: number
  breakoutStreak: number
  perfectBreakouts: number
  rejections: number
  // v0.4A clarity pass.
  phase: ResistancePhase
  // ms epoch a transient beat (broken/rejected/overheated) holds until, after
  // which advanceResistance respawns a fresh target.
  phaseUntil: number
  // ms epoch the chart first climbed above the line without a clean break. Drives
  // the anti-pin forced rejection so the chart can't ride the line into the top.
  aboveSinceMs: number
  lastRating: TapRating | null
}

export interface TapEffect {
  id: number
  gain: number
  microLine: string | null
  // v0.2 juice: an occasional "critical" tap for a stronger visual + payout.
  // Optional so older saves that stored a lastTapEffect stay valid (defaults
  // to a non-crit when absent).
  crit?: boolean
  rating?: TapRating
  ratingLabel?: string
  // v0.4B: set only on a breakout tap, so the button can show a compact,
  // concrete "what just happened" readout instead of just a combat-text burst.
  breakoutReward?: { chain: number; superchargeGain: number; curvePercent: number } | null
  // v0.4C: set on a rejected/overheated tap so the Supercharge rail can explain
  // *why* the meter didn't move (or dropped) instead of just sitting there.
  superchargeNote?: { text: string; kind: 'loss' | 'blocked' } | null
}

export interface PurchaseEffect {
  id: number
  upgradeId: string
  level: number
}

export interface CardRevealEffect {
  id: number
  cardId: string
  isDuplicate: boolean
}

export interface MajorEvent {
  id: number
  line: string
}

export interface StreakEffect {
  id: number
  combo: number
  title: string
  line: string
}

// v0.3.5 Streak Fountain: a single floating-combat-text burst (WoW / MikScrolling
// BattleText style). The reducer appends these to a small capped ring; the
// StreakFountain component turns each new id into one short-lived DOM particle.
// Purely visual — never persisted meaningfully (cleared on load).
export type FountainKind =
  | 'gain'
  | 'crit'
  | 'chain'
  | 'milestone'
  | 'supercharge'
  | 'overdrive'
  // v0.4A: breakout success / resistance rejection combat text.
  | 'breakout'
  | 'reject'

export interface FountainEvent {
  id: number
  text: string
  kind: FountainKind
}

// v0.3.2 Chart Surf Combo: a single non-blocking toast slot. The reducer stamps
// the newest toast-worthy event here (evidence found, operator hired, chain
// tier-up); the UI shows exactly one at a time and auto-dismisses. Because each
// new event overwrites the field, "one toast at a time" falls out for free.
export type ToastKind = 'evidence' | 'operator' | 'chain'

export interface ToastEffect {
  id: number
  kind: ToastKind
  title: string
  line: string
}

export interface GameState {
  saveVersion: number
  resources: ResourceState
  currentCoin: CoinState
  bondingCurveProgress: number
  bondingCurveTier: number
  // v0.3 Chart Gravity pressure loop. `idleTicks` counts ticks since the last
  // SEND_CANDLE (reset to 0 on tap); once it exceeds the grace window the curve
  // begins to decay toward the current tier floor. `isDecaying` is set on any
  // tick where progress actually dropped, so the UI can react.
  idleTicks: number
  isDecaying: boolean
  // v0.3.2 Candle Chain combo. `combo` counts consecutive in-window taps;
  // `comboMultiplier` is the derived tier multiplier (x1..x3, cached for the UI
  // and reducer). `lastTapAt` is the ms timestamp of the last tap, used to keep
  // or break the chain across taps (SEND_CANDLE.now) and ticks (TICK.now).
  combo: number
  comboMultiplier: number
  lastTapAt: number
  maxComboThisRun: number
  // v0.3.5 Streak Fountain + Supercharge. `supercharge` (0–100) builds while a
  // Candle Chain is alive (faster at higher combo multipliers) and decays slowly
  // when it breaks; at 100 the run is "Supercharged" (cooler mashing, punchier
  // taps). `superchargeFullMs` accumulates while pinned at 100 and, past the
  // threshold, arms Overdrive: a timed window (`overdriveUntil`, ms epoch) where
  // overheat can't punish mashing. All three are cosmetic/feel — they shape the
  // visual chart and a small curve nudge, never the core bonding-curve pacing.
  supercharge: number
  superchargeFullMs: number
  overdriveUntil: number
  // v0.4C Overdrive Quality Gate. Tracks recent breakout *quality*, separate from
  // the Supercharge number itself: perfect/good breakouts raise it, rejected/
  // overheated taps and slow passive decay bring it back down. Overdrive can only
  // arm once this clears BREAKOUT_QUALITY_ARM_THRESHOLD (on top of Supercharge
  // being full) — see economy.ts and reducer.ts's updateStreakMeters. Consumed
  // (reset to 0) the instant Overdrive fires, so it must be re-earned per window.
  breakoutQualityScore: number
  // v0.3.5: capped ring of floating-combat-text bursts (visual only). See
  // FountainEvent. `fountainSeq` is the monotonic id source.
  fountainEvents: FountainEvent[]
  fountainSeq: number
  // v0.3.4 Candlestick Physics: the visual-only candle chart. Fully decoupled
  // from the economy — it reacts to taps (velocity impulse), gravity, and
  // overheat, and drives the surf zones off its `price`. See game/chart.ts.
  chart: ChartState
  // v0.4 Resistance Breakout visual contract. Slice 1/2 only stores and renders
  // the active target; tap rewards/punishments remain v0.3.5 until the next pass.
  resistance: ResistanceState
  upgrades: Record<string, number>
  cards: Record<string, number>
  event: EventState
  prestigeCount: number
  rugPrestige: number
  tickerHistory: string[]
  taps: number
  totalLiquidityEarned: number
  jeetEventsSurvived: number
  copeCratesOpened: number
  onboardingComplete: boolean
  lastTapEffect: TapEffect | null
  lastPurchaseEffect: PurchaseEffect | null
  pendingCardReveal: CardRevealEffect | null
  // v0.3.2: newest non-blocking toast (evidence / operator / chain tier-up).
  toast: ToastEffect | null
  // Count of new evidence cards found since the Cards drawer was last opened,
  // surfaced as a badge. Cleared by ACK_CARDS.
  newCardCount: number
  streakEffect: StreakEffect | null
  majorEvent: MajorEvent | null
  effectSeq: number
  lastOutcome?: string
  lastSavedAt?: number
}

export type GameAction =
  | { type: 'LAUNCH_COIN' }
  | { type: 'SEND_CANDLE'; now: number }
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'OPEN_COPE_CRATE' }
  | { type: 'GRADUATE_COIN' }
  | { type: 'TICK'; now: number; dtSeconds?: number }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'ACK_CARDS' }
  | { type: 'RESET_SAVE' }
