import { UPGRADES } from '../data/upgrades'
import { getUpgradeCost } from '../game/economy'
import type { GameState } from '../game/types'

interface UpgradeListProps {
  state: GameState
  onBuy: (upgradeId: string) => void
}

function formatCost(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()
}

export function UpgradeList({ state, onBuy }: UpgradeListProps) {
  return (
    <section className="drawer-panel" aria-label="Upgrades">
      <div className="section-heading">
        <h2>Operators</h2>
        <span>12 starter upgrades</span>
      </div>
      <div className="upgrade-list">
        {UPGRADES.map((upgrade) => {
          const level = state.upgrades[upgrade.id] ?? 0
          const cost = getUpgradeCost(state, upgrade.id)
          const canBuy = state.currentCoin.launched && state.resources.liquidity >= cost

          return (
            <article className="upgrade-row" key={upgrade.id}>
              <div className="upgrade-copy">
                <div className="upgrade-title">
                  <strong>{upgrade.name}</strong>
                  <span>Lv {level}</span>
                </div>
                <p>{upgrade.description}</p>
              </div>
              <button type="button" disabled={!canBuy} onClick={() => onBuy(upgrade.id)}>
                Buy {formatCost(cost)}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
