import { getPrestigeReward } from '../game/economy'
import type { GameState } from '../game/types'

interface PrestigeModalProps {
  state: GameState
  onGraduate: () => void
}

export function PrestigeModal({ state, onGraduate }: PrestigeModalProps) {
  if (!state.currentCoin.launched || state.bondingCurveProgress < 100) {
    return null
  }

  const reward = getPrestigeReward(state)

  return (
    <div className="prestige-backdrop" role="dialog" aria-modal="true" aria-labelledby="prestige-title">
      <section className="prestige-modal">
        <span className="modal-kicker">Bonding curve filled</span>
        <h2 id="prestige-title">Graduate {state.currentCoin.ticker}</h2>
        <p>Outcome: basement confidence graduates directly into a reset. The next launch starts stronger.</p>
        <div className="prestige-rewards">
          <span>+{reward.exitLiquidity} Exit Liquidity</span>
          <span>+{reward.receipts} Receipts</span>
          <span>+{reward.rugPrestige} Rug Prestige</span>
        </div>
        <button type="button" onClick={onGraduate}>
          Graduate {state.currentCoin.ticker}
        </button>
      </section>
    </div>
  )
}
