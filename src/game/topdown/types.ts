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
