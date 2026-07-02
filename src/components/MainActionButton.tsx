import { useEffect, useRef, useState } from 'react'
import { getComboCritBonus, getIsNearTierFloor, getSurfZone, OVERDRIVE_DURATION_MS } from '../game/economy'
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

export function MainActionButton({ state, onLaunch, onSend, onGraduateClick }: MainActionButtonProps) {
  const [pulsing, setPulsing] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const lastTapId = useRef<number | null>(null)
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
  const overdrive = launched && !graduateReady && state.overdriveUntil > Date.now()
  const supercharged = launched && !graduateReady && !overdrive && state.supercharge >= 100
  const superchargePct = Math.min(100, Math.round(state.supercharge))
  const overdriveRemaining = overdrive ? Math.max(0, state.overdriveUntil - Date.now()) : 0
  const overdriveSeconds = Math.ceil(overdriveRemaining / 1000)
  const overdrivePct = Math.min(100, (overdriveRemaining / OVERDRIVE_DURATION_MS) * 100)

  // v0.4A: the button is the main instruction surface for the Resistance loop.
  // Its copy is keyed to the resistance phase (with launch / graduate / overdrive
  // and the Chart-Gravity decay warnings layered on top), so it always tells the
  // player what to do, when to tap, and what just happened. Kept short for mobile.
  const phase = state.resistance.phase
  const breakoutStreak = state.resistance.breakoutStreak
  const resistancePhase = launched && !graduateReady && !overdrive ? phase : null

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
    detail = 'MASH WITHOUT CONSEQUENCES'
  } else if (phase === 'smash') {
    label = 'SMASH RESISTANCE'
    detail = 'TAP NOW FOR BREAKOUT'
  } else if (phase === 'broken') {
    label = `BREAKOUT CHAIN ×${breakoutStreak}`
    detail = 'NEXT RESISTANCE INCOMING'
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
    label = 'SEND THE CANDLE'
    detail = 'GET READY — SMASH INCOMING'
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
          resistancePhase === 'rejected' || resistancePhase === 'overheated' ? 'breakout-rejected' : ''
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
          className={`supercharge-rail ${supercharged ? 'full' : ''} ${overdrive ? 'overdrive' : ''}`}
          aria-label={overdrive ? 'Overdrive countdown' : 'Supercharge meter'}
        >
          {overdrive ? (
            <>
              <span className="supercharge-label">OVERDRIVE — JEETS ARE ILLEGAL</span>
              <div className="supercharge-track">
                <div className="supercharge-fill overdrive-countdown" style={{ width: `${overdrivePct}%` }} />
              </div>
              <strong className="supercharge-value">{overdriveSeconds}s</strong>
            </>
          ) : (
            <>
              <span className="supercharge-label">{supercharged ? 'MASH WINDOW OPEN' : 'SUPERCHARGE'}</span>
              <div className="supercharge-track">
                <div className="supercharge-fill" style={{ width: `${superchargePct}%` }} />
              </div>
              <strong className="supercharge-value">{superchargePct}%</strong>
            </>
          )}
        </div>
      ) : null}

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
