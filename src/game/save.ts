import { createInitialChart, createInitialResistance, RESISTANCE_MAX_CRACK_PIPS } from './chart'
import { getBondingCurveTier } from './economy'
import type { GameState, ResistanceState } from './types'
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
    Array.isArray(value.tickerHistory)
  )
}

function looksLikeResistance(value: unknown): value is ResistanceState {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.id === 'number' && typeof value.price === 'number'
}

// Saves written before the v0.1 interaction-rebuild fields existed will
// still pass looksLikeGameState() (the new fields are additive, so the
// shape check above never required them). This backfills sensible
// defaults for those saves. onboardingComplete is deliberately forced to
// `true` here (never `false`) because v0.3.3 keeps input unblocked from the
// first screen; only the graduation/prestige flow should open a modal.
//
// SAVE_VERSION is intentionally NOT bumped for the v0.3 Chart Gravity fields:
// looksLikeGameState() gates loading on `saveVersion === SAVE_VERSION`, so a
// bump would make every existing v1 save fail validation and be silently
// discarded into a fresh game — the opposite of preserving compatibility. The
// new fields are additive and default cleanly below, so no bump is needed.
function migrateGameState(value: GameState): GameState {
  const raw = value as Partial<GameState>
  const chart = raw.chart ?? createInitialChart()
  const freshResistance = looksLikeResistance(raw.resistance)
    ? createInitialResistance(chart.price, raw.resistance.id)
    : createInitialResistance(chart.price)
  const resistance = looksLikeResistance(raw.resistance)
    ? {
        ...freshResistance,
        price: raw.resistance.price,
        lastResistanceHitAt: raw.resistance.lastResistanceHitAt ?? 0,
        breakoutStreak: raw.resistance.breakoutStreak ?? 0,
        perfectBreakouts: raw.resistance.perfectBreakouts ?? 0,
        rejections: raw.resistance.rejections ?? 0,
        crackPips:
          typeof raw.resistance.crackPips === 'number'
            ? Math.max(0, Math.min(RESISTANCE_MAX_CRACK_PIPS, raw.resistance.crackPips))
            : RESISTANCE_MAX_CRACK_PIPS,
        crackPos:
          typeof raw.resistance.crackPos === 'number'
            ? Math.max(0.12, Math.min(0.88, raw.resistance.crackPos))
            : freshResistance.crackPos,
        crackTargetSeq: raw.resistance.crackTargetSeq ?? freshResistance.crackTargetSeq,
        crackHitStreak: raw.resistance.crackHitStreak ?? raw.resistance.breakoutStreak ?? 0,
        focusStartedAt: 0,
      }
    : freshResistance

  return {
    ...value,
    bondingCurveTier: raw.bondingCurveTier ?? getBondingCurveTier(value.bondingCurveProgress),
    onboardingComplete: true,
    lastTapEffect: raw.lastTapEffect ?? null,
    lastPurchaseEffect: raw.lastPurchaseEffect ?? null,
    pendingCardReveal: raw.pendingCardReveal ?? null,
    majorEvent: raw.majorEvent ?? null,
    effectSeq: raw.effectSeq ?? 0,
    // v0.3 Chart Gravity fields. Purely additive: an old save simply starts a
    // fresh grace window (idle 0, not decaying) on next load. See note above on
    // why SAVE_VERSION is NOT bumped for this.
    idleTicks: raw.idleTicks ?? 0,
    isDecaying: raw.isDecaying ?? false,
    // v0.3.2 Chart Surf Combo fields. Also additive: an old save loads with a
    // cold chain (combo 0, x1), no surf pressure, and an empty toast/badge — all
    // of which the next tap/tick fills in normally.
    combo: raw.combo ?? 0,
    comboMultiplier: raw.comboMultiplier ?? 1,
    lastTapAt: raw.lastTapAt ?? 0,
    maxComboThisRun: raw.maxComboThisRun ?? 0,
    // v0.3.5 Streak Fountain + Supercharge. Additive: an old save loads with an
    // empty supercharge meter and no Overdrive. `overdriveUntil` is an absolute
    // ms epoch, so any saved value is already in the past on load (Overdrive is a
    // few-second window) and reads as inactive — no need to clamp it. Fountain
    // events are purely visual, so they're always cleared on load, never replayed.
    supercharge: raw.supercharge ?? 0,
    superchargeFullMs: raw.superchargeFullMs ?? 0,
    overdriveUntil: raw.overdriveUntil ?? 0,
    // v0.4C Overdrive Quality Gate. Additive: an old save simply starts the gate
    // closed (0) on next load — no different from a fresh run that hasn't landed
    // a breakout yet.
    breakoutQualityScore: raw.breakoutQualityScore ?? 0,
    fountainEvents: [],
    fountainSeq: raw.fountainSeq ?? 0,
    // v0.3.4 Candlestick Physics: additive. Old saves (which stored surfPressure
    // + a chartPoints line) load with a fresh, pre-rolled candle chart; the next
    // tap/tick drives it normally. The stale surfPressure/chartPoints fields are
    // simply ignored.
    chart,
    resistance,
    bonusTarget: null,
    toast: raw.toast ?? null,
    newCardCount: raw.newCardCount ?? 0,
    streakEffect: raw.streakEffect ?? null,
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
