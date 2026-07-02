import { useEffect, useRef, useState } from 'react'
import { UPGRADES } from '../data/upgrades'
import { getUpgradeCost } from '../game/economy'
import { playSound } from '../game/sound'
import type { UpgradeDefinition, UpgradeEffect, GameState } from '../game/types'

interface UpgradeListProps {
  state: GameState
  onBuy: (upgradeId: string) => void
}

const FLASH_MS = 600

function formatCost(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()
}

// Role tag shown first on every row (subtask 5) so what a hire *does* is legible
// before any flavor. Maps the raw effect key to the player-facing category.
function roleTag(effect: UpgradeEffect): string {
  switch (effect) {
    case 'click':
      return 'TAP POWER'
    case 'passive':
      return 'PASSIVE'
    case 'hype':
      return 'HYPE'
    case 'curve':
      return 'CURVE'
    case 'cardChance':
      return 'CARDS'
    case 'jeetShield':
      return 'JEET SHIELD'
    case 'heatShield':
      return 'HEAT'
    case 'allGains':
      return 'ALL GAINS'
    case 'decay':
      return 'GRAVITY'
    default:
      return 'BOOST'
  }
}

// Human-readable effect for an arbitrary magnitude, reused for both the
// per-level ("next") value and the cumulative ("now") value.
function formatEffect(effect: UpgradeEffect, value: number): string {
  switch (effect) {
    case 'click':
      return `+${Math.round(value)} tap`
    case 'passive':
      return `+${value.toFixed(1)}/sec`
    case 'hype':
      return `+${Math.round(value * 100)}% hype`
    case 'curve':
      return `+${Math.round(value * 100)}% curve`
    case 'cardChance':
      return `+${(value * 100).toFixed(1)}% cards`
    case 'jeetShield':
      return `-${Math.round(value * 100)}% jeet loss`
    case 'heatShield':
      return `-${Math.round(value * 100)}% heat`
    case 'allGains':
      return `+${Math.round(value * 100)}% all gains`
    case 'decay':
      return `-${value.toFixed(2)} gravity/sec`
    default:
      return 'boost'
  }
}

function CurrentEffect({ upgrade, level }: { upgrade: UpgradeDefinition; level: number }) {
  const perLevel = formatEffect(upgrade.effect, upgrade.effectValue)

  return (
    <div className="upgrade-effect-line">
      <span className="upgrade-role">{roleTag(upgrade.effect)}</span>
      <span className="upgrade-effect-now">
        {level > 0 ? formatEffect(upgrade.effect, upgrade.effectValue * level) : 'not hired yet'}
      </span>
      <span className="upgrade-effect-next">{perLevel}/lv</span>
    </div>
  )
}

export function UpgradeList({ state, onBuy }: UpgradeListProps) {
  const [flashUpgradeId, setFlashUpgradeId] = useState<string | null>(null)
  const lastPurchaseId = useRef<number | null>(null)

  // Row pulse only — the non-blocking purchase toast is handled globally by
  // ToastHost so it shows regardless of which drawer is open (subtask 1/6).
  useEffect(() => {
    const effect = state.lastPurchaseEffect

    if (!effect || effect.id === lastPurchaseId.current) {
      return
    }

    lastPurchaseId.current = effect.id
    setFlashUpgradeId(effect.upgradeId)

    const flashTimeout = window.setTimeout(() => setFlashUpgradeId(null), FLASH_MS)

    return () => window.clearTimeout(flashTimeout)
  }, [state.lastPurchaseEffect])

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
                <CurrentEffect upgrade={upgrade} level={level} />
                <p>{upgrade.description}</p>
              </div>
              <button type="button" disabled={!canBuy} onClick={() => handleBuy(upgrade.id)}>
                Buy {formatCost(cost)}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
