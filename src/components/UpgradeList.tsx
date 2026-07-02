import { useEffect, useRef, useState } from 'react'
import { getUpgrade, UPGRADES } from '../data/upgrades'
import { getUpgradeCost } from '../game/economy'
import type { GameState } from '../game/types'

interface UpgradeListProps {
  state: GameState
  onBuy: (upgradeId: string) => void
}

const FLASH_MS = 600
const TOAST_MS = 2800

function formatCost(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()
}

export function UpgradeList({ state, onBuy }: UpgradeListProps) {
  const [flashUpgradeId, setFlashUpgradeId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: number; upgradeId: string } | null>(null)
  const lastPurchaseId = useRef<number | null>(null)

  useEffect(() => {
    const effect = state.lastPurchaseEffect

    if (!effect || effect.id === lastPurchaseId.current) {
      return
    }

    lastPurchaseId.current = effect.id
    setFlashUpgradeId(effect.upgradeId)
    setToast({ id: effect.id, upgradeId: effect.upgradeId })

    const flashTimeout = window.setTimeout(() => setFlashUpgradeId(null), FLASH_MS)
    const toastTimeout = window.setTimeout(() => setToast(null), TOAST_MS)

    return () => {
      window.clearTimeout(flashTimeout)
      window.clearTimeout(toastTimeout)
    }
  }, [state.lastPurchaseEffect])

  const toastUpgrade = toast ? getUpgrade(toast.upgradeId) : null

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
            <article
              className={`upgrade-row ${canBuy ? 'affordable' : 'too-expensive'} ${
                flashUpgradeId === upgrade.id ? 'purchase-flash' : ''
              }`}
              key={upgrade.id}
            >
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

      {toastUpgrade ? (
        <div className="purchase-toast" key={toast?.id} role="status">
          <span className="modal-kicker">Upgrade bought</span>
          <strong>{toastUpgrade.name}</strong>
          <p>{toastUpgrade.description}</p>
        </div>
      ) : null}
    </section>
  )
}
