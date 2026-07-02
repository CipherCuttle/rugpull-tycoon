import { getBondingCurveTier } from './economy'
import type { GameState } from './types'
import { SAVE_VERSION } from './types'

const STORAGE_KEY = 'rugpull-tycoon.basement-launch.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.saveVersion === SAVE_VERSION &&
    isRecord(value.resources) &&
    isRecord(value.currentCoin) &&
    isRecord(value.upgrades) &&
    isRecord(value.cards) &&
    isRecord(value.event) &&
    Array.isArray(value.tickerHistory) &&
    Array.isArray(value.chartPoints)
  )
}

// Saves written before the v0.1 interaction-rebuild fields existed will
// still pass looksLikeGameState() (the new fields are additive, so the
// shape check above never required them). This backfills sensible
// defaults for those saves. onboardingComplete is deliberately forced to
// `true` here (never `false`) so returning players never see onboarding
// replayed — only a brand-new createInitialGame() defaults it to `false`.
function migrateGameState(value: GameState): GameState {
  const raw = value as Partial<GameState>
  const hadOnboardingField = typeof raw.onboardingComplete === 'boolean'

  return {
    ...value,
    bondingCurveTier: raw.bondingCurveTier ?? getBondingCurveTier(value.bondingCurveProgress),
    onboardingComplete: hadOnboardingField ? value.onboardingComplete : true,
    lastTapEffect: raw.lastTapEffect ?? null,
    lastPurchaseEffect: raw.lastPurchaseEffect ?? null,
    pendingCardReveal: raw.pendingCardReveal ?? null,
    majorEvent: raw.majorEvent ?? null,
    effectSeq: raw.effectSeq ?? 0,
  }
}

export function loadGame() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (!looksLikeGameState(parsed)) {
      return null
    }

    return migrateGameState(parsed)
  } catch {
    return null
  }
}

export function saveGame(state: GameState) {
  if (typeof window === 'undefined') {
    return
  }

  const payload: GameState = {
    ...state,
    lastSavedAt: Date.now(),
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearSave() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}
