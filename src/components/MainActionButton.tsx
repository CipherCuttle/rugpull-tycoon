import { useEffect, useRef, useState } from 'react'
import { GRACE_TICKS, getIsNearTierFloor, getSurfZone, getTierFloor } from '../game/economy'
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
  // Grace warning: idle but not yet decaying, and there is fractional progress
  // above the floor that gravity could threaten.
  const graceWarning =
    launched &&
    !graduateReady &&
    !decaying &&
    state.idleTicks >= 1 &&
    state.idleTicks < GRACE_TICKS &&
    state.bondingCurveProgress > getTierFloor(state.bondingCurveTier) + 0.05

  // v0.3.2 Candle Chain state.
  const multiplier = state.comboMultiplier
  const comboActive = launched && !graduateReady && multiplier > 1
  // The chain is alive but you've gone quiet for a tick — one candle from a break.
  const chainAtRisk = launched && !graduateReady && state.combo > 0 && state.idleTicks >= 1
  const zone = getSurfZone(state.surfPressure)

  const label = !launched
    ? `LAUNCH ${state.currentCoin.ticker}`
    : graduateReady
      ? `GRADUATE ${state.currentCoin.ticker}`
      : comboActive
        ? `CANDLE CHAIN ×${multiplier.toFixed(1)}`
        : 'SEND THE CANDLE'

  const detail = !launched
    ? 'No wallets. No markets. Just satire.'
    : graduateReady
      ? 'The bonding curve is done pretending.'
      : chainAtRisk
        ? CHAIN_BREAKING_LINES[state.taps % CHAIN_BREAKING_LINES.length]
        : nearFloor
          ? 'ONE CANDLE FROM THE FLOOR — mash to hold it.'
          : decaying && almost
            ? 'SHOVE IT OVER BEFORE GRAVITY DOES.'
            : decaying
              ? 'CURVE BLEEDING — keep sending candles.'
              : almost
                ? 'Curve destabilizing. One more shove.'
                : comboActive
                  ? `${state.combo} candle chain · ${zone.label}`
                  : graceWarning
                    ? 'Chart Gravity engaging.'
                    : 'Mash to build a Candle Chain'

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
        } ${chainAtRisk ? 'chain-risk' : ''} ${chainClass}`}
        type="button"
        onClick={handleClick}
      >
        <span>{label}</span>
        <small>{detail}</small>
      </button>

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
