export type TopdownRunState = 'playing' | 'failed' | 'escaped'

export interface LostBagSnapshot {
  roomId: string
  x: number
  y: number
  value: number
}

export interface TopdownHudState {
  status: string
  rentBanked: number
  carriedBag: number
  lostBag: LostBagSnapshot | null
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
}
