import { getPassiveGainPerSecond, getPrestigeMultiplier } from '../game/economy'
import { formatNumber } from '../game/format'
import type { GameState } from '../game/types'

interface ResourceBarProps {
  state: GameState
}

// Trimmed for the compact top area (subtask 2): only the 4 stats a player
// needs at a glance while tapping. Copium/Receipts/Exit live in the
// secondary-resources strip near the drawers instead (see HomeScreen).
// v0.4B: matches the "high heat" threshold already used for the gravity-decay
// flavor line (reducer.ts) — past this the coin's own decay is visibly worse, so
// the pill should look like it's actually threatening something.
const HOT_HEAT_THRESHOLD = 120

export function ResourceBar({ state }: ResourceBarProps) {
  const passive = getPassiveGainPerSecond(state)
  const prestigeMultiplier = getPrestigeMultiplier(state)
  const hot = state.resources.heat >= HOT_HEAT_THRESHOLD

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
      <div className={`resource-pill heat ${hot ? 'hot' : ''}`}>
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
