import { getPrestigeReward } from '../game/economy'
import { playSound } from '../game/sound'
import type { GameState } from '../game/types'

interface PrestigeModalProps {
  state: GameState
  open: boolean
  onClose: () => void
  onGraduate: () => void
}

// Theatrical graduation modal (subtask 2). Gating stays the same
// (bondingCurveProgress >= 100 / tier 4), but the modal now only appears
// when explicitly opened from the GRADUATE button (see MainActionButton +
// HomeScreen), instead of auto-popping the instant the curve fills.
export function PrestigeModal({ state, open, onClose, onGraduate }: PrestigeModalProps) {
  const eligible = state.currentCoin.launched && state.bondingCurveProgress >= 100

  if (!open || !eligible) {
    return null
  }

  const reward = getPrestigeReward(state)
  const ticker = state.currentCoin.ticker
  // Matches the exact string reducer.ts's graduateCoin() stamps into
  // majorEvent.line on confirm, derived here ahead of time from the same
  // currentCoin.ticker so the preview copy never drifts out of sync.
  const graduationTitle = `${ticker} GRADUATED DIRECTLY INTO A CRIME SCENE`

  function handleGraduate() {
    playSound('graduate')
    onGraduate()
    onClose()
  }

  return (
    <div className="prestige-backdrop" role="dialog" aria-modal="true" aria-labelledby="prestige-title">
      <section className="prestige-modal theatrical">
        <span className="modal-kicker">Bonding curve filled</span>
        <h2 id="prestige-title">{graduationTitle}</h2>
        <div className="prestige-body">
          <p>KOLs ate first.</p>
          <p>Retail provided the calories.</p>
          <p>You were not early.</p>
          <p>You were the exit interface.</p>
        </div>
        <div className="prestige-rewards">
          <span>
            <span className="reward-label">Rug Prestige</span>
            <span className="reward-value">+{reward.rugPrestige}</span>
          </span>
          <span>
            <span className="reward-label">Exit Liq</span>
            <span className="reward-value">+{reward.exitLiquidity}</span>
          </span>
          <span>
            <span className="reward-label">Receipts</span>
            <span className="reward-value">+{reward.receipts}</span>
          </span>
        </div>
        <button type="button" onClick={handleGraduate}>
          LAUNCH NEXT HALLUCINATION
        </button>
      </section>
    </div>
  )
}
