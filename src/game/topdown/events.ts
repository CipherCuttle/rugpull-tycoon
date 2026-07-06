import type { TopdownHudState } from './types'

export interface TopdownGameCallbacks {
  onHudChange: (hud: TopdownHudState) => void
  onSliceReady: () => void
}
