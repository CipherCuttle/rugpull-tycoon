import { useEffect, useRef, useState } from 'react'
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
    const timeout = window.setTimeout(() => setPulsing(false), PULSE_MS)

    return () => window.clearTimeout(timeout)
  }, [state.lastTapEffect])

  const graduateReady = state.bondingCurveProgress >= 100
  const label = !state.currentCoin.launched
    ? `LAUNCH ${state.currentCoin.ticker}`
    : graduateReady
      ? `GRADUATE ${state.currentCoin.ticker}`
      : 'SEND THE CANDLE'
  const detail = !state.currentCoin.launched
    ? 'No wallets. No markets. Just satire.'
    : graduateReady
      ? 'The bonding curve is done pretending.'
      : `Run ${state.currentCoin.runNumber} is live`

  function handleClick() {
    if (!state.currentCoin.launched) {
      onLaunch()
      return
    }

    if (graduateReady) {
      onGraduateClick()
      return
    }

    onSend()
  }

  const effect = state.lastTapEffect

  return (
    <div className="main-action-wrap">
      <button
        className={`main-action ${pulsing ? 'pulse' : ''} ${graduateReady ? 'graduate-ready' : ''}`}
        type="button"
        onClick={handleClick}
      >
        <span>{label}</span>
        <small>{detail}</small>
      </button>

      {effect ? (
        <div className="tap-float" key={effect.id}>
          <span className="tap-float-gain">+{effect.gain} Liquidity</span>
          {effect.microLine ? <span className="tap-float-micro">{effect.microLine}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
