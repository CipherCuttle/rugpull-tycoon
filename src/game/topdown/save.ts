import type { LostBagSnapshot, TopdownSaveV1 } from './types'
import { waffleBackroom } from './data/waffleBackroom.v1'

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
  const stats = isRecord(value) && isRecord(value.stats) ? value.stats : null
  const settings = isRecord(value) && isRecord(value.settings) ? value.settings : null

  return (
    isRecord(value) &&
    value.saveVersion === 1 &&
    typeof value.rentBanked === 'number' &&
    (value.lostBag === null || isRecord(value.lostBag)) &&
    Array.isArray(value.unlockedDistricts) &&
    isRecord(value.pawnUpgrades) &&
    stats !== null &&
    typeof stats.deaths === 'number' &&
    typeof stats.escapes === 'number' &&
    typeof stats.bagsRecovered === 'number' &&
    isRecord(stats.bestEscapeMsByRoom) &&
    settings !== null &&
    typeof settings.sound === 'boolean' &&
    typeof settings.reducedMotion === 'boolean'
  )
}

function normalizeLostBag(value: TopdownSaveV1['lostBag']): LostBagSnapshot | null {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.value !== 'number') {
    return null
  }

  const room = waffleBackroom.rooms.find((candidate) => candidate.id === value.roomId) ?? waffleBackroom.rooms[0]
  const inset = 28

  return {
    roomId: room.id,
    x: Math.max(room.bounds.x + inset, Math.min(room.bounds.x + room.bounds.width - inset, value.x)),
    y: Math.max(room.bounds.y + inset, Math.min(room.bounds.y + room.bounds.height - inset, value.y)),
    value: value.value,
  }
}

function normalizeSave(save: TopdownSaveV1): TopdownSaveV1 {
  return {
    ...save,
    lostBag: normalizeLostBag(save.lostBag),
  }
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
    return looksLikeTopdownSave(parsed) ? normalizeSave(parsed) : createFreshTopdownSave()
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
