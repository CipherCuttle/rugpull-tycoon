import type { TopdownHudState } from '../../game/topdown/types'

interface TopdownHudProps {
  hud: TopdownHudState
}

function formatDollars(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function TopdownHud({ hud }: TopdownHudProps) {
  return (
    <aside className="topdown-hud" aria-label="Run status">
      <div className="hud-pill">
        <span>The Bag</span>
        <strong>{formatDollars(hud.carriedBag)}</strong>
      </div>
      <div className="hud-pill rent">
        <span>Rent</span>
        <strong>{formatDollars(hud.rentBanked)}</strong>
      </div>
      <div className="hud-pill lost">
        <span>Lost Bag</span>
        <strong>{hud.lostBag ? formatDollars(hud.lostBag.value) : 'None'}</strong>
      </div>
      <button className="hud-shove-button" type="button" onClick={() => window.dispatchEvent(new Event('rugpull-topdown-attack'))}>
        Shove
      </button>
      <p className={`hud-status hud-status-${hud.runState}`}>{hud.deathCause ?? hud.status}</p>
    </aside>
  )
}
