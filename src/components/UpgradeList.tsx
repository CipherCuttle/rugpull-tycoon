import { useEffect, useRef, useState } from 'react'
import { getUpgrade, UPGRADES } from '../data/upgrades'
import { getUpgradeCost } from '../game/economy'
import { playSound } from '../game/sound'
import type { UpgradeDefinition, GameState } from '../game/types'

interface UpgradeListProps {
  state: GameState
  onBuy: (upgradeId: string) => void
}

const FLASH_MS = 600
const TOAST_MS = 2800

function formatCost(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()
}

// Short, human effect tag shown on each operator row so the payoff is legible
// at a glance instead of hidden inside flavor text.
function effectLabel(upgrade: UpgradeDefinition): string {
  switch (upgrade.effect) {
    case 'click':
      return `+${upgrade.effectValue} tap`
    case 'passive':
      return `+${upgrade.effectValue}/sec`
    case 'hype':
      return `+${Math.round(upgrade.effectValue * 100)}% hype`
    case 'curve':
      return `+${Math.round(upgrade.effectValue * 100)}% curve`
    case 'cardChance':
      return `+${(upgrade.effectValue * 100).toFixed(1)}% cards`
    case 'jeetShield':
      return `-${Math.round(upgrade.effectValue * 100)}% jeet loss`
    case 'heatShield':
      return `-${Math.round(upgrade.effectValue * 100)}% heat`
    case 'allGains':
      return `+${Math.round(upgrade.effectValue * 100)}% all gains`
    default:
      return 'boost'
  }
}

// Rewarding + funny confirmation lines, rotated by the purchase effect id.
const HIRE_LINES = [
  'Onboarded with zero background checks.',
  'Signed a contract nobody will honor.',
  'Added to the payroll. Standards not included.',
  'Cleared to operate. Ethics pending forever.',
]

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

  function handleBuy(upgradeId: string) {
    playSound('upgrade')
    onBuy(upgradeId)
  }

  return (
    <section className="drawer-panel" aria-label="Upgrades">
      <div className="section-heading">
        <h2>Operators</h2>
        <span>Cursed payroll</span>
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
                <span className="upgrade-effect">{effectLabel(upgrade)}</span>
              </div>
              <button type="button" disabled={!canBuy} onClick={() => handleBuy(upgrade.id)}>
                Buy {formatCost(cost)}
              </button>
            </article>
          )
        })}
      </div>

      {toastUpgrade && toast ? (
        <div className="purchase-toast" key={toast.id} role="status">
          <span className="modal-kicker">Operator Hired</span>
          <strong>{toastUpgrade.name}</strong>
          <p>{HIRE_LINES[toast.id % HIRE_LINES.length]}</p>
          <span className="toast-effect">{effectLabel(toastUpgrade)}</span>
        </div>
      ) : null}
    </section>
  )
}
