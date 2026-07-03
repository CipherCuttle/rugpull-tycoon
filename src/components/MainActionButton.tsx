import { useEffect, useRef, useState } from 'react'
import {
  getResistanceFocusMs,
  getResistanceWallPrice,
  isResistanceFocusReady,
  RESISTANCE_FOCUS_BAND,
  RESISTANCE_FOCUS_START_MS,
} from '../game/chart'
import {
  BREAKOUT_QUALITY_ARM_THRESHOLD,
  getComboCritBonus,
  getIsNearTierFloor,
  getSurfZone,
  OVERDRIVE_DURATION_MS,
} from '../game/economy'
import { playSound } from '../game/sound'
import type { GameState } from '../game/types'

interface MainActionButtonProps {
  state: GameState
  onLaunch: () => void
  onSend: () => void
  onGraduateClick: () => void
}

const PULSE_MS = 220
const RECOVER_MS = 520

// Rotating "your chain is about to die" copy (subtask 4).
const CHAIN_BREAKING_LINES = ['CHAIN BREAKING — FEED THE CURVE', 'GRAVITY IS BACK', 'KEEP SURFING THE LIE']

// Multiplier → intensity class. Higher tiers get a louder pulse/glow in CSS.
function chainTierClass(multiplier: number): string {
  if (multiplier >= 3) {
    return 'chain-t4'
  }
  if (multiplier >= 2) {
    return 'chain-t3'
  }
  if (multiplier >= 1.5) {
    return 'chain-t2'
  }
  if (multiplier >= 1.2) {
    return 'chain-t1'
  }
  return ''
}

// v0.4B: how long the Supercharge-rail swaps to the BREAKOUT reward readout —
// its own (longer) window, separate from the CSS box-shadow pulse (480ms). The
// rail has a stable dedicated slot below the button, so the reward reads there
// instead of stacking another line into tap-float, which already carries
// gain/chain/micro text directly over the button's own big label.
const SUPERCHARGE_PULSE_MS = 480
const BREAKOUT_REWARD_TEXT_MS = 1500
// v0.4C: how long a rejected/overheated tap's "why didn't that charge" note holds
// the rail before it falls back to the live Supercharge/quality-gate readout.
const SUPERCHARGE_NOTE_TEXT_MS = 1400
const TIMING_LABEL_TEXT_MS = 950

export function MainActionButton({ state, onLaunch, onSend, onGraduateClick }: MainActionButtonProps) {
  const [pulsing, setPulsing] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [superchargePulse, setSuperchargePulse] = useState(false)
  const [breakoutReward, setBreakoutReward] = useState<NonNullable<GameState['lastTapEffect']>['breakoutReward'] | null>(null)
  const [superchargeNote, setSuperchargeNote] = useState<{ text: string; kind: 'loss' | 'blocked' } | null>(null)
  const [timingLabel, setTimingLabel] = useState<string | null>(null)
  const lastTapId = useRef<number | null>(null)
  const lastTimingId = useRef<number | null>(null)
  const wasDecaying = useRef(false)

  useEffect(() => {
    const effect = state.lastTapEffect

    if (!effect || effect.id === lastTapId.current) {
      return
    }

    lastTapId.current = effect.id
    setPulsing(true)

    if (effect.crit) {
      playSound('crit')
    }

    const timeout = window.setTimeout(() => setPulsing(false), PULSE_MS)

    return () => window.clearTimeout(timeout)
  }, [state.lastTapEffect])

  // v0.4B: BREAKOUT should visibly do something — pulse the Supercharge meter
  // (it's already been nudged numerically by the reducer) and swap its label to
  // a concrete "what just happened" readout, instead of leaving that gain silent.
  useEffect(() => {
    const reward = state.lastTapEffect?.breakoutReward

    if (!reward) {
      return
    }

    setSuperchargePulse(true)
    setBreakoutReward(reward)
    const pulseTimeout = window.setTimeout(() => setSuperchargePulse(false), SUPERCHARGE_PULSE_MS)
    const textTimeout = window.setTimeout(() => setBreakoutReward(null), BREAKOUT_REWARD_TEXT_MS)

    return () => {
      window.clearTimeout(pulseTimeout)
      window.clearTimeout(textTimeout)
    }
  }, [state.lastTapEffect])

  // v0.4C: a rejected/overheated tap explains itself on the same rail slot the
  // breakout reward uses — "why didn't the meter move" instead of a silent no-op.
  useEffect(() => {
    const note = state.lastTapEffect?.superchargeNote

    if (!note) {
      return
    }

    setSuperchargeNote(note)
    const noteTimeout = window.setTimeout(() => setSuperchargeNote(null), SUPERCHARGE_NOTE_TEXT_MS)

    return () => window.clearTimeout(noteTimeout)
  }, [state.lastTapEffect])

  useEffect(() => {
    const effect = state.lastTapEffect

    if (!effect || effect.id === lastTimingId.current) {
      return
    }

    lastTimingId.current = effect.id
    setTimingLabel(effect.timingLabel ?? null)

    if (!effect.timingLabel) {
      return
    }

    const timeout = window.setTimeout(() => setTimingLabel(null), TIMING_LABEL_TEXT_MS)

    return () => window.clearTimeout(timeout)
  }, [state.lastTapEffect])

  // v0.3: brief green "recovering" flash the moment an active decay is broken.
  useEffect(() => {
    if (wasDecaying.current && !state.isDecaying) {
      setRecovering(true)
      const timeout = window.setTimeout(() => setRecovering(false), RECOVER_MS)
      wasDecaying.current = state.isDecaying
      return () => window.clearTimeout(timeout)
    }

    wasDecaying.current = state.isDecaying
  }, [state.isDecaying])

  const graduateReady = state.bondingCurveProgress >= 100
  const launched = state.currentCoin.launched
  // "Almost there" pressure: the curve is nearly full but not graduated yet.
  const almost = launched && !graduateReady && state.bondingCurveProgress >= 85

  // v0.3 Chart Gravity pressure states.
  const decaying = launched && !graduateReady && state.isDecaying
  const nearFloor = decaying && getIsNearTierFloor(state)
  const panic = decaying && (nearFloor || almost)

  // v0.3.2 Candle Chain state.
  const multiplier = state.comboMultiplier
  const comboActive = launched && !graduateReady && multiplier > 1
  const comboCritBonus = getComboCritBonus(multiplier)
  // The chain is alive but you've gone quiet for a tick — one candle from a break.
  const chainAtRisk = launched && !graduateReady && state.combo > 0 && state.idleTicks >= 1
  const zone = getSurfZone(state.chart.price)

  // v0.3.5 Supercharge / Overdrive. overdriveUntil is an ms epoch; the ~120ms
  // game tick re-renders us, so the countdown ticks down smoothly.
  const nowMs = Date.now()
  const overdrive = launched && !graduateReady && state.overdriveUntil > nowMs
  const supercharged = launched && !graduateReady && !overdrive && state.supercharge >= 100
  const superchargePct = Math.min(100, Math.round(state.supercharge))
  const overdriveRemaining = overdrive ? Math.max(0, state.overdriveUntil - nowMs) : 0
  const overdriveSeconds = Math.ceil(overdriveRemaining / 1000)
  const overdrivePct = Math.min(100, (overdriveRemaining / OVERDRIVE_DURATION_MS) * 100)

  // v0.4C Overdrive Quality Gate: the meter alone no longer arms Overdrive — it
  // also needs recent breakout quality. Only surfaced once Supercharge is close
  // to full so early-game doesn't get a wall of gate copy it can't act on yet.
  const qualityRemaining = Math.max(0, Math.ceil(BREAKOUT_QUALITY_ARM_THRESHOLD - state.breakoutQualityScore))
  const qualityReady = qualityRemaining <= 0
  const showQualityHint = launched && !graduateReady && !overdrive && superchargePct >= 60
  const cleanBreakoutsCopy = `${qualityRemaining} MORE CRACK HIT${qualityRemaining === 1 ? '' : 'S'}`
  let superchargeLabel: string
  if (supercharged) {
    superchargeLabel = qualityReady
      ? 'OVERDRIVE READY'
      : qualityRemaining >= BREAKOUT_QUALITY_ARM_THRESHOLD
        ? 'CRACKS ARM OVERDRIVE'
        : `WEAK SPOTS — ${cleanBreakoutsCopy}`
  } else if (showQualityHint) {
    superchargeLabel = qualityReady ? 'CRACKS ARM OVERDRIVE' : cleanBreakoutsCopy
  } else {
    superchargeLabel = 'SUPERCHARGE'
  }

  // v0.4A: the button is the main instruction surface for the Resistance loop.
  // Its copy is keyed to the resistance phase (with launch / graduate / overdrive
  // and the Chart-Gravity decay warnings layered on top), so it always tells the
  // player what to do, when to tap, and what just happened. Kept short for mobile.
  const phase = state.resistance.phase
  const resistancePhase = launched && !graduateReady && !overdrive ? phase : null
  const focusMs = launched && !graduateReady && !overdrive ? getResistanceFocusMs(state.resistance, nowMs) : 0
  const focusReady = launched && !graduateReady && !overdrive && isResistanceFocusReady(state.resistance, nowMs)
  const focusBuilding = focusMs >= RESISTANCE_FOCUS_START_MS && !focusReady
  const focusNear =
    phase === 'approaching' && getResistanceWallPrice(state.resistance, nowMs, overdrive) - state.chart.price <= RESISTANCE_FOCUS_BAND

  let label: string
  let detail: string
  if (!launched) {
    label = `LAUNCH ${state.currentCoin.ticker}`
    detail = 'No wallets. No markets. Just satire.'
  } else if (graduateReady) {
    label = `GRADUATE ${state.currentCoin.ticker}`
    detail = 'The bonding curve is done pretending.'
  } else if (overdrive) {
    label = 'OVERDRIVE'
    detail = 'HIT EVERY WEAK SPOT'
  } else if (phase === 'smash') {
    label = 'SMASH RESISTANCE'
    detail = focusReady ? 'PERFECT CRACK READY' : 'AIM FOR THE CRACK'
  } else if (phase === 'broken') {
    label = state.resistance.lastRating === 'perfect' ? 'PERFECT CRACK' : 'CRACK HIT'
    detail =
      state.resistance.crackPips === 1
        ? 'ONE CLEAN HIT TO SHATTER'
        : `${state.resistance.crackPips} PIPS LEFT`
  } else if (phase === 'missed') {
    label = 'MISSED CRACK'
    detail = 'MOMENTUM LOST'
  } else if (phase === 'shattered') {
    label = 'WALL SHATTERED'
    detail = 'JACKPOT'
  } else if (phase === 'rejected') {
    label = 'REJECTED'
    detail = 'RECOVER THE CHART'
  } else if (phase === 'overheated') {
    label = 'TOO HOT'
    detail = 'LET IT BREATHE'
  } else if (decaying && (nearFloor || almost)) {
    label = 'SEND THE CANDLE'
    detail = nearFloor ? 'ONE CANDLE FROM THE FLOOR — mash to hold it.' : 'SHOVE IT OVER BEFORE GRAVITY DOES.'
  } else if (decaying) {
    label = 'SEND THE CANDLE'
    detail = 'CURVE BLEEDING — keep sending candles.'
  } else if (chainAtRisk) {
    label = 'SEND THE CANDLE'
    detail = CHAIN_BREAKING_LINES[state.taps % CHAIN_BREAKING_LINES.length]
  } else if (phase === 'approaching') {
    label = focusNear ? (focusReady ? 'PERFECT READY' : focusBuilding ? 'FOCUSING' : 'HOLD YOUR NERVE') : 'SEND THE CANDLE'
    detail = focusNear ? (focusReady ? 'STRIKE THE CRACK' : focusBuilding ? 'WAIT FOR THE WEAK SPOT' : 'DO NOT PANIC TAP') : 'GET READY — LINE UP THE CRACK'
  } else {
    label = 'SEND THE CANDLE'
    detail = 'BUILD MOMENTUM TO RESISTANCE'
  }

  function handleClick() {
    if (!launched) {
      playSound('tap')
      onLaunch()
      return
    }

    if (graduateReady) {
      playSound('graduate')
      onGraduateClick()
      return
    }

    // Generic tap cue here; the crit-specific cue fires from the effect
    // watcher above once the reducer resolves whether this tap critted.
    playSound('tap')
    onSend()
  }

  const effect = state.lastTapEffect
  const crit = effect?.crit === true
  const chainClass = comboActive ? chainTierClass(multiplier) : ''

  return (
    <div className="main-action-wrap">
      <button
        className={`main-action ${pulsing ? 'pulse' : ''} ${crit ? 'crit' : ''} ${
          graduateReady ? 'graduate-ready' : ''
        } ${almost ? 'almost' : ''} ${decaying ? 'decaying' : ''} ${panic ? 'panic' : ''} ${
          recovering ? 'recovering' : ''
        } ${chainAtRisk ? 'chain-risk' : ''} ${chainClass} ${supercharged ? 'supercharged' : ''} ${
          overdrive ? 'overdrive' : ''
        } ${resistancePhase === 'smash' ? 'breakout-ready' : ''} ${resistancePhase === 'broken' ? 'broken' : ''} ${
          resistancePhase === 'shattered' ? 'shattered' : ''
        } ${focusReady ? 'focus-ready' : ''} ${
          resistancePhase === 'rejected' || resistancePhase === 'overheated' || resistancePhase === 'missed'
            ? 'breakout-rejected'
            : ''
        }`}
        type="button"
        onClick={handleClick}
      >
        <span>{label}</span>
        <small>{detail}</small>
      </button>

      {launched && !graduateReady ? (
        <div className={`chain-meter ${chainAtRisk ? 'risk' : ''}`} aria-label="Candle Chain status">
          <span>
            <strong>CANDLE CHAIN {state.combo}</strong>
            <small>{zone.label}</small>
          </span>
          <span>
            <strong>×{multiplier.toFixed(1)}</strong>
            <small>Curve Push</small>
          </span>
          <span>
            <strong>+{Math.round(comboCritBonus * 100)}%</strong>
            <small>Crit Chance · +18% Rescue</small>
          </span>
        </div>
      ) : null}

      {launched && !graduateReady ? (
        <div
          className={`supercharge-rail ${supercharged ? 'full' : ''} ${overdrive ? 'overdrive' : ''} ${
            superchargePulse ? 'breakout-pulse' : ''
          } ${breakoutReward?.shattered ? 'shatter-reward' : ''} ${supercharged && !qualityReady ? 'blocked' : ''} ${
            superchargeNote ? `charge-${superchargeNote.kind}` : ''
          }`}
          aria-label={overdrive ? 'Overdrive countdown' : 'Supercharge meter'}
        >
          {overdrive ? (
            <>
              <span className="supercharge-label">OVERDRIVE — CRACKS WIDE OPEN</span>
              <div className="supercharge-track">
                <div className="supercharge-fill overdrive-countdown" style={{ width: `${overdrivePct}%` }} />
              </div>
              <strong className="supercharge-value">{overdriveSeconds}s</strong>
            </>
          ) : breakoutReward ? (
            <>
              <span className="supercharge-label breakout">
                {breakoutReward.shattered ? 'SHATTERED' : breakoutReward.focusPerfect ? 'PERFECT CRACK' : 'CRACK HIT'} +
                {breakoutReward.superchargeGain}⚡ · +{breakoutReward.curvePercent.toFixed(2)}% CURVE
                {breakoutReward.crackStreak && breakoutReward.crackStreak >= 2 ? ` · ×${breakoutReward.crackStreak}` : ''}
              </span>
              <div className="supercharge-track">
                <div className="supercharge-fill" style={{ width: `${superchargePct}%` }} />
              </div>
              <strong className="supercharge-value">{superchargePct}%</strong>
            </>
          ) : superchargeNote ? (
            <>
              <span className={`supercharge-label note-${superchargeNote.kind}`}>{superchargeNote.text}</span>
              <div className="supercharge-track">
                <div className="supercharge-fill" style={{ width: `${superchargePct}%` }} />
              </div>
              <strong className="supercharge-value">{superchargePct}%</strong>
            </>
          ) : (
            <>
              <span className="supercharge-label">{superchargeLabel}</span>
              <div className="supercharge-track">
                <div className="supercharge-fill" style={{ width: `${superchargePct}%` }} />
              </div>
              <strong className="supercharge-value">{superchargePct}%</strong>
            </>
          )}
        </div>
      ) : null}

      {timingLabel ? <div className={`timing-chip timing-${timingLabel.toLowerCase().replace(/\s+/g, '-')}`}>{timingLabel}</div> : null}

      {effect ? (
        <div className={`tap-float ${crit ? 'crit' : ''}`} key={effect.id}>
          <span className="tap-float-gain">
            {crit ? 'CRIT ' : ''}+{effect.gain} Liquidity
          </span>
          {comboActive ? <span className="tap-float-chain">CHAIN ×{multiplier.toFixed(1)}</span> : null}
          {effect.microLine ? <span className="tap-float-micro">{effect.microLine}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
