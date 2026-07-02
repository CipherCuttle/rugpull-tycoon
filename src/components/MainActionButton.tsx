import type { GameState } from '../game/types'

interface MainActionButtonProps {
  state: GameState
  onLaunch: () => void
  onSend: () => void
}

export function MainActionButton({ state, onLaunch, onSend }: MainActionButtonProps) {
  const label = state.currentCoin.launched ? 'SEND THE CANDLE' : `LAUNCH ${state.currentCoin.ticker}`
  const detail = state.currentCoin.launched ? `Run ${state.currentCoin.runNumber} is live` : 'No wallets. No markets. Just satire.'

  return (
    <button className="main-action" type="button" onClick={state.currentCoin.launched ? onSend : onLaunch}>
      <span>{label}</span>
      <small>{detail}</small>
    </button>
  )
}
