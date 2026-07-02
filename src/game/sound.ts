// v0.2 audio placeholder layer.
//
// There are no real audio assets yet (per scope). This module is the single
// hook point where future click / upgrade / graduation / card / crit sounds
// will fire, plus a persisted `soundEnabled` toggle so the UI already has a
// working mute switch. Everything here is intentionally a no-op except the
// setting itself — wiring a real <audio> / WebAudio sample is a later pass.

export type SoundKind =
  | 'tap'
  | 'crit'
  | 'upgrade'
  | 'card'
  | 'graduate'
  | 'milestone'
  // v0.3.5 Streak Fountain + Supercharge. Still no-ops; wired at the fountain /
  // meter / overdrive moments so real clips can drop in later.
  | 'streak'
  | 'supercharge'
  | 'overdrive'

const STORAGE_KEY = 'rugpull-tycoon.sound-enabled.v1'

// Default OFF: a degen slot machine that autoplays sound on first paint is
// hostile on mobile. The player opts in via the footer toggle.
let enabled = false

if (typeof window !== 'undefined') {
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    enabled = false
  }
}

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(next: boolean): void {
  enabled = next

  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
  } catch {
    // Storage unavailable (private mode / quota): keep the in-memory value.
  }
}

// Call at every juicy moment. No-op today; when real samples land, switch on
// `kind` here and play the matching clip. Keeping every call site pointed at
// this one function means audio can be added later without touching the UI.
export function playSound(_kind: SoundKind): void {
  if (!enabled) {
    return
  }

  // TODO(v0.3): trigger the sample for `_kind` here.
}
