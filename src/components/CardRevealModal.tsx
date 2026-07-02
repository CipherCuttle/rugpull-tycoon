import { useState } from 'react'
import { getCard } from '../data/cards'
import type { CardRevealEffect } from '../game/types'

interface CardRevealModalProps {
  pendingCardReveal: CardRevealEffect | null
}

// reducer.ts's unlockCard() grants exactly +1 Copium for a duplicate pull
// (`copium: state.resources.copium + (isDuplicate ? 1 : 0)`). That literal
// isn't exported as a named constant from economy.ts/reducer.ts (both are
// out of scope for this subtask), so it's mirrored here with a pointer back
// to the source of truth rather than re-deriving/guessing it.
const DUPLICATE_CARD_COPIUM_REWARD = 1

export function CardRevealModal({ pendingCardReveal }: CardRevealModalProps) {
  // Purely local "have I shown this id yet" acknowledgment — no new
  // game-state dismiss action, per subtask 2 scope.
  const [acknowledgedId, setAcknowledgedId] = useState<number | null>(null)

  if (!pendingCardReveal || pendingCardReveal.id === acknowledgedId) {
    return null
  }

  const card = getCard(pendingCardReveal.cardId)

  if (!card) {
    return null
  }

  return (
    <div className="card-reveal-backdrop" role="dialog" aria-modal="true" aria-labelledby="card-reveal-title">
      <section className="card-reveal-modal">
        <span className="modal-kicker">Card Found</span>
        <h2 id="card-reveal-title">{card.name}</h2>
        <span className="card-rarity">{card.rarity}</span>
        <p>{card.flavorText}</p>
        {pendingCardReveal.isDuplicate ? (
          <p className="card-reveal-duplicate">Duplicate receipt. +{DUPLICATE_CARD_COPIUM_REWARD} Copium.</p>
        ) : null}
        <button type="button" onClick={() => setAcknowledgedId(pendingCardReveal.id)}>
          Neat
        </button>
      </section>
    </div>
  )
}
