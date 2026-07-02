import { useEffect, useRef, useState } from 'react'
import { playSound } from '../game/sound'
import type { GameState } from '../game/types'

interface MainActionButtonProps {
  state: GameState
  onLaunch: () => void
  onSend: () => void
  onGraduateClick: () => void
}

const PULSE_MS = 220

export function MainActionButton({ state, onLaunch, onSend, onGraduateClick }: MainActionButtonProps) {
  const [pulsing, setPulsing] = useState(false)
  const lastTapId = useRef<number | null>(null)

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

  const graduateReady = state.bondingCurveProgress >= 100
  // "Almost there" pressure: the curve is nearly full but not graduated yet.
  const almost = state.currentCoin.launched && !graduateReady && state.bondingCurveProgress >= 85

  const label = !state.currentCoin.launched
    ? `LAUNCH ${state.currentCoin.ticker}`
    : graduateReady
      ? `GRADUATE ${state.currentCoin.ticker}`
      : 'SEND THE CANDLE'
  const detail = !state.currentCoin.launched
    ? 'No wallets. No markets. Just satire.'
    : graduateReady
      ? 'The bonding curve is done pretending.'
      : almost
        ? 'Curve destabilizing. One more shove.'
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
        } ${almost ? 'almost' : ''}`}
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
