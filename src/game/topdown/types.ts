export type TopdownRunState = 'playing' | 'failed' | 'escaped'
export type HeatTier = 0 | 1 | 2 | 3
export type RugWindowState = 'no-bag' | 'open' | 'hot' | 'unstable'
export type RoomId = 'grease-entrance' | 'side-greed' | 'rug-exit'

export interface RoomDefinition {
  id: RoomId
  name: string
  bounds: RoomRect
  spawn: RoomPoint
  safeDrop: RoomPoint
}

export interface FloorResult {
  banked: number
  fakeAlphaTaken: number
  lostBagRecovered: boolean
  deaths: number
}

export interface LostBagSnapshot {
  roomId: string
  x: number
  y: number
  value: number
}

export type TrashKind = 'frozen-waffle'
export type FakeAlphaKind = 'insider-tip' | 'free-mint' | 'green-candle' | 'dev-wallet'
export type FakeAlphaSideEffect = 'slow' | 'auditor-pulse'

export interface TopdownHudState {
  status: string
  rentBanked: number
  carriedBag: number
  lostBag: LostBagSnapshot | null
  heldTrash: TrashKind | null
  heatTier: HeatTier
  heatLabel: string
  rugWindowState: RugWindowState
  rugWindowLabel: string
  deathCause: string | null
  lastDeathCause: string | null
  runState: TopdownRunState
  floorResult: FloorResult | null
}

export interface RoomPoint {
  x: number
  y: number
}

export interface RoomRect extends RoomPoint {
  id: string
  width: number
  height: number
}

export interface JeetSpawn extends RoomPoint {
  id: string
  patrol: RoomPoint[]
}

export interface AuditorSpawn extends RoomPoint {
  id: string
  patrol: RoomPoint[]
}

export interface TrashSpawn extends RoomPoint {
  id: string
  kind: TrashKind
}

export interface FakeAlphaSpawn extends RoomPoint {
  id: string
  kind: FakeAlphaKind
  label: string
  bagValue: number
  heatBump: number
  status: string
  tint: number
  labelColor: string
  sideEffect?: FakeAlphaSideEffect
}

export interface TopdownRoomData {
  id: string
  name: string
  world: {
    width: number
    height: number
  }
  playerSpawn: RoomPoint
  bagSpawn: RoomPoint
  rugExit: RoomRect
  walls: RoomRect[]
  props: RoomRect[]
  jeets: JeetSpawn[]
  auditors: AuditorSpawn[]
  trash: TrashSpawn[]
  fakeAlpha: FakeAlphaSpawn[]
  rooms: RoomDefinition[]
}

export interface TopdownSaveV1 {
  saveVersion: 1
  rentBanked: number
  lostBag: LostBagSnapshot | null
  unlockedDistricts: string[]
  pawnUpgrades: Record<string, number>
  stats: {
    deaths: number
    escapes: number
    bagsRecovered: number
    bestEscapeMsByRoom: Record<string, number>
  }
  settings: {
    sound: boolean
    reducedMotion: boolean
  }
}
