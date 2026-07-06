import type { TopdownSaveV1 } from './types'

export interface TopdownDebugSnapshot {
  roomId: string
  player: { x: number; y: number; velocityX: number; velocityY: number; heldKeys: string[]; facingDegrees: number }
  enemies: { id: string; x: number; y: number; stunned: boolean }[]
  carriedBag: number
  save: TopdownSaveV1
  failed: boolean
  escaped: boolean
}

export interface TopdownDebugActions {
  movePlayerTo: (x: number, y: number) => void
  forceFailure: (cause: string) => void
}

declare global {
  interface Window {
    __rugpullTopdown?: TopdownDebugSnapshot
    __rugpullTopdownActions?: TopdownDebugActions
  }
}

export function updateTopdownDebug(snapshot: TopdownDebugSnapshot) {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return
  }

  window.__rugpullTopdown = snapshot
}

export function updateTopdownDebugActions(actions: TopdownDebugActions | null) {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return
  }

  if (actions) {
    window.__rugpullTopdownActions = actions
    return
  }

  delete window.__rugpullTopdownActions
}
