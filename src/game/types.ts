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

export interface TapEffect {
  id: number
  gain: number
  microLine: string | null
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

export interface GameState {
  saveVersion: number
  resources: ResourceState
  currentCoin: CoinState
  bondingCurveProgress: number
  bondingCurveTier: number
  upgrades: Record<string, number>
  cards: Record<string, number>
  event: EventState
  prestigeCount: number
  rugPrestige: number
  tickerHistory: string[]
  chartPoints: number[]
  taps: number
  totalLiquidityEarned: number
  jeetEventsSurvived: number
  copeCratesOpened: number
  onboardingComplete: boolean
  lastTapEffect: TapEffect | null
  lastPurchaseEffect: PurchaseEffect | null
  pendingCardReveal: CardRevealEffect | null
  majorEvent: MajorEvent | null
  effectSeq: number
  lastOutcome?: string
  lastSavedAt?: number
}

export type GameAction =
  | { type: 'LAUNCH_COIN' }
  | { type: 'SEND_CANDLE' }
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'OPEN_COPE_CRATE' }
  | { type: 'GRADUATE_COIN' }
  | { type: 'TICK'; now: number }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESET_SAVE' }
