import { getClickGain, getPassiveGainPerSecond, getPrestigeMultiplier } from '../game/economy'
import type { GameState } from '../game/types'

interface ResourceBarProps {
  state: GameState
}

function formatNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return Math.floor(value).toString()
}

export function ResourceBar({ state }: ResourceBarProps) {
  const passive = getPassiveGainPerSecond(state)

  return (
    <header className="resource-bar" aria-label="Resources">
      <div className="resource-pill primary">
        <span>Liquidity</span>
        <strong>{formatNumber(state.resources.liquidity)}</strong>
      </div>
      <div className="resource-pill">
        <span>Hype</span>
        <strong>{formatNumber(state.resources.hype)}</strong>
      </div>
      <div className="resource-pill heat">
        <span>Heat</span>
        <strong>{formatNumber(state.resources.heat)}</strong>
      </div>
      <div className="resource-pill">
        <span>Copium</span>
        <strong>{formatNumber(state.resources.copium)}</strong>
      </div>
      <div className="resource-pill">
        <span>Receipts</span>
        <strong>{formatNumber(state.resources.receipts)}</strong>
      </div>
      <div className="resource-pill">
        <span>Exit</span>
        <strong>{formatNumber(state.resources.exitLiquidity)}</strong>
      </div>
      <div className="stat-strip" aria-label="Run stats">
        <span>Tap +{formatNumber(getClickGain(state))}</span>
        <span>{passive.toFixed(1)}/sec</span>
        <span>{getPrestigeMultiplier(state).toFixed(2)}x reset</span>
      </div>
    </header>
  )
}
