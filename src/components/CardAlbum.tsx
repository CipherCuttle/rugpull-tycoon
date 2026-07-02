import { CARDS, STARTER_SET_NAME } from '../data/cards'
import { COPE_CRATE_COST } from '../game/economy'
import type { GameState } from '../game/types'

interface CardAlbumProps {
  state: GameState
  onOpenCrate: () => void
}

export function CardAlbum({ state, onOpenCrate }: CardAlbumProps) {
  const owned = CARDS.filter((card) => (state.cards[card.id] ?? 0) > 0).length
  const canOpen = state.resources.copium >= COPE_CRATE_COST

  return (
    <section className="drawer-panel" aria-label="Card album">
      <div className="section-heading">
        <h2>Cards</h2>
        <span>
          {owned}/{CARDS.length} {STARTER_SET_NAME}
        </span>
      </div>
      <button className="crate-button" type="button" disabled={!canOpen} onClick={onOpenCrate}>
        Open Cope Crate - {COPE_CRATE_COST} Copium
      </button>
      <div className="card-grid">
        {CARDS.map((card) => {
          const count = state.cards[card.id] ?? 0

          return (
            <article className={`card-tile ${count > 0 ? 'owned' : 'locked'}`} key={card.id}>
              <div className="card-rarity">{card.rarity}</div>
              <strong>{count > 0 ? card.name : 'Locked Receipt'}</strong>
              <p>{count > 0 ? card.flavorText : 'Find it by sending candles or opening crates.'}</p>
              <span>{count > 0 ? `x${count}` : '?'}</span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
