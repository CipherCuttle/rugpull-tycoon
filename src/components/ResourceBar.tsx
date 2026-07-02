import { getPassiveGainPerSecond, getPrestigeMultiplier } from '../game/economy'
import { formatNumber } from '../game/format'
import type { GameState } from '../game/types'

interface ResourceBarProps {
  state: GameState
}

// Trimmed for the compact top area (subtask 2): only the 4 stats a player
// needs at a glance while tapping. Copium/Receipts/Exit live in the
// secondary-resources strip near the drawers instead (see HomeScreen).
export function ResourceBar({ state }: ResourceBarProps) {
  const passive = getPassiveGainPerSecond(state)
  const prestigeMultiplier = getPrestigeMultiplier(state)

  return (
    <div className="resource-bar" aria-label="Resources">
      <div className="resource-pill primary">
        <span>Liquidity</span>
        <strong>{formatNumber(state.resources.liquidity)}</strong>
      </div>
      <div className="resource-pill">
        <span>Liquidity/sec</span>
        <strong>{passive.toFixed(1)}</strong>
      </div>
      <div className="resource-pill heat">
        <span>Heat</span>
        <strong>{formatNumber(state.resources.heat)}</strong>
      </div>
      <div className="resource-pill">
        <span>Prestige</span>
        <strong>{prestigeMultiplier.toFixed(2)}x</strong>
      </div>
    </div>
  )
}
