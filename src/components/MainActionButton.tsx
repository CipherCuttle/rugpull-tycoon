import { useEffect, useRef, useState } from 'react'
import { GRACE_TICKS, getIsNearTierFloor, getTierFloor } from '../game/economy'
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
  // "Almost there" pressure: the curve is nearly full but not graduated yet.
  const almost = state.currentCoin.launched && !graduateReady && state.bondingCurveProgress >= 85

  // v0.3 Chart Gravity pressure states.
  const decaying = state.currentCoin.launched && !graduateReady && state.isDecaying
  const nearFloor = decaying && getIsNearTierFloor(state)
  const panic = decaying && (nearFloor || almost)
  // Grace warning: idle but not yet decaying, and there is fractional progress
  // above the floor that gravity could threaten.
  const graceWarning =
    state.currentCoin.launched &&
    !graduateReady &&
    !decaying &&
    state.idleTicks >= 1 &&
    state.idleTicks < GRACE_TICKS &&
    state.bondingCurveProgress > getTierFloor(state.bondingCurveTier) + 0.05

  const label = !state.currentCoin.launched
    ? `LAUNCH ${state.currentCoin.ticker}`
    : graduateReady
      ? `GRADUATE ${state.currentCoin.ticker}`
      : 'SEND THE CANDLE'
  const detail = !state.currentCoin.launched
    ? 'No wallets. No markets. Just satire.'
    : graduateReady
      ? 'The bonding curve is done pretending.'
      : nearFloor
        ? 'ONE CANDLE FROM THE FLOOR — mash to hold it.'
        : decaying && almost
          ? 'SHOVE IT OVER BEFORE GRAVITY DOES.'
          : decaying
            ? 'CURVE BLEEDING — keep sending candles.'
            : almost
              ? 'Curve destabilizing. One more shove.'
              : graceWarning
                ? 'Chart Gravity engaging.'
                : `Run ${state.currentCoin.runNumber} is live`

  function handleClick() {
    if (!state.currentCoin.launched) {
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

  return (
    <div className="main-action-wrap">
      <button
        className={`main-action ${pulsing ? 'pulse' : ''} ${crit ? 'crit' : ''} ${
          graduateReady ? 'graduate-ready' : ''
        } ${almost ? 'almost' : ''} ${decaying ? 'decaying' : ''} ${panic ? 'panic' : ''} ${
          recovering ? 'recovering' : ''
        }`}
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
          {effect.microLine ? <span className="tap-float-micro">{effect.microLine}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
