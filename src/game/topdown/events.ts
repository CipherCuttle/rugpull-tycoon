import type { TopdownHudState, TopdownSaveV1 } from './types'

export interface TopdownGameCallbacks {
  onHudChange: (hud: TopdownHudState) => void
  onSaveChange: (save: TopdownSaveV1) => void
  onSliceReady: () => void
}
