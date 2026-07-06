import type { TopdownSaveV1 } from './types'

export const TOPDOWN_SAVE_KEY = 'rugpull-tycoon.topdown.v1'

export function createFreshTopdownSave(): TopdownSaveV1 {
  return {
    saveVersion: 1,
    rentBanked: 0,
    lostBag: null,
    unlockedDistricts: ['waffle-mausoleum'],
    pawnUpgrades: {},
    stats: {
      deaths: 0,
      escapes: 0,
      bagsRecovered: 0,
      bestEscapeMsByRoom: {},
    },
    settings: {
      sound: true,
      reducedMotion: false,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeTopdownSave(value: unknown): value is TopdownSaveV1 {
  return (
    isRecord(value) &&
    value.saveVersion === 1 &&
    typeof value.rentBanked === 'number' &&
    (value.lostBag === null || isRecord(value.lostBag)) &&
    Array.isArray(value.unlockedDistricts) &&
    isRecord(value.pawnUpgrades) &&
    isRecord(value.stats) &&
    isRecord(value.settings)
  )
}

export function loadTopdownSave() {
  if (typeof window === 'undefined') {
    return createFreshTopdownSave()
  }

  try {
    const raw = window.localStorage.getItem(TOPDOWN_SAVE_KEY)
    if (!raw) {
      return createFreshTopdownSave()
    }

    const parsed: unknown = JSON.parse(raw)
    return looksLikeTopdownSave(parsed) ? parsed : createFreshTopdownSave()
  } catch {
    return createFreshTopdownSave()
  }
}

export function saveTopdownSave(save: TopdownSaveV1) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TOPDOWN_SAVE_KEY, JSON.stringify(save))
}
