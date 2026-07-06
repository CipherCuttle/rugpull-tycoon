import type { TopdownHudState, TrashKind } from '../../game/topdown/types'

interface TopdownHudProps {
  hud: TopdownHudState
}

const TRASH_LABELS: Record<TrashKind, string> = {
  'frozen-waffle': 'Frozen Waffle',
}

function formatDollars(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function TopdownHud({ hud }: TopdownHudProps) {
  const trashLabel = hud.heldTrash ? TRASH_LABELS[hud.heldTrash] : 'none'
  const statusText = hud.deathCause ?? hud.lastDeathCause ?? hud.status
  const actionLabel = hud.heldTrash ? `Throw ${TRASH_LABELS[hud.heldTrash]}` : 'Shove'

  return (
    <aside className={`topdown-hud heat-tier-${hud.heatTier}`} aria-label="Run status">
      <div className="hud-pill">
        <span>Carried Bag</span>
        <strong>{formatDollars(hud.carriedBag)}</strong>
      </div>
      <div className="hud-pill rent">
        <span>Rent Banked</span>
        <strong>{formatDollars(hud.rentBanked)}</strong>
      </div>
      <div className={`hud-pill lost${hud.lostBag ? ' is-active' : ''}`}>
        <span>Lost Bag</span>
        <strong>{hud.lostBag ? formatDollars(hud.lostBag.value) : '—'}</strong>
      </div>
      <div className={`hud-pill trash${hud.heldTrash ? ' is-active' : ''}`}>
        <span>Trash</span>
        <strong>{trashLabel}</strong>
      </div>
      <div className={`hud-pill heat heat-${hud.heatTier}`}>
        <span>Heat</span>
        <strong>{hud.heatLabel}</strong>
      </div>
      <div className={`hud-pill rug-window rug-window-${hud.rugWindowState}`}>
        <span>RUG Window</span>
        <strong>{hud.rugWindowLabel}</strong>
      </div>
      <button className="hud-shove-button" type="button" onClick={() => window.dispatchEvent(new Event('rugpull-topdown-attack'))}>
        {actionLabel}
      </button>
      <p className={`hud-status hud-status-${hud.runState}`}>{statusText}</p>
    </aside>
  )
}
