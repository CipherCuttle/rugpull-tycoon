export type TopdownRunState = 'playing' | 'failed' | 'escaped'

export interface LostBagSnapshot {
  roomId: string
  x: number
  y: number
  value: number
}

export type TrashKind = 'frozen-waffle'

export interface TopdownHudState {
  status: string
  rentBanked: number
  carriedBag: number
  lostBag: LostBagSnapshot | null
  heldTrash: TrashKind | null
  deathCause: string | null
  runState: TopdownRunState
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

export interface GreedSpawn extends RoomPoint {
  id: string
  value: number
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
  greed: GreedSpawn[]
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
