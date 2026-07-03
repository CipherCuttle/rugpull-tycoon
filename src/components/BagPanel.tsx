import { useEffect, useRef, useState } from 'react'
import { OVERHEAT } from '../game/chart'
import { formatNumber } from '../game/format'
import type { GameState } from '../game/types'

interface BagPanelProps {
  state: GameState
  onRugIt: () => void
}

// v0.5A Bag + Rug It + Lost Bag: a compact risk/reward strip that sits right
// below the main action button. THE BAG is unbanked run currency built from
// clean crack hits/shatters (see reducer.ts resolveResistanceTap); RUG IT
// converts it into permanent RENT. Fictional arcade satire only — no real
// crypto, wallets, or trading.
const EVENT_VISIBLE_MS = 2200

type RugVariant = 'quiet' | 'normal' | 'urgent' | 'panic'

export function BagPanel({ state, onRugIt }: BagPanelProps) {
  const [eventText, setEventText] = useState<{ title: string; line: string; kind: string } | null>(null)
  const lastEventId = useRef<number | null>(null)

  useEffect(() => {
    const event = state.lastRugEvent

    if (!event || event.id === lastEventId.current) {
      return
    }

    lastEventId.current = event.id
    setEventText({ title: event.title, line: event.line, kind: event.kind })
    const timeout = window.setTimeout(() => setEventText(null), EVENT_VISIBLE_MS)

    return () => window.clearTimeout(timeout)
  }, [state.lastRugEvent])

  const nowMs = Date.now()
  const rugWindowOpen = nowMs < state.rugWindowUntil
  const dangerousHeat = state.chart.heat > OVERHEAT || state.resistance.phase === 'overheated' || state.resistance.phase === 'rejected'
  const hasBag = state.runBag > 0

  let variant: RugVariant = 'normal'
  if (rugWindowOpen && hasBag) {
    variant = 'urgent'
  } else if (!hasBag) {
    variant = 'quiet'
  } else if (dangerousHeat) {
    variant = 'panic'
  }

  let detail: string
  if (variant === 'quiet') {
    detail = 'NOTHING TO RUG'
  } else if (variant === 'urgent') {
    detail = '+35% WINDOW OPEN'
  } else if (variant === 'panic') {
    detail = 'PANIC RUG — BANKS LESS'
  } else {
    detail = 'BANK THE BAG'
  }

  return (
    <div className={`bag-panel bag-panel-${variant}`}>
      <div className="bag-stats">
        <div className="bag-pill bag">
          <span>The Bag</span>
          <strong>${formatNumber(state.runBag)}</strong>
        </div>
        <div className="bag-pill rent">
          <span>Rent</span>
          <strong>${formatNumber(state.rentMoney)}</strong>
        </div>
        {state.lostBag > 0 ? (
          <div className="bag-pill lost">
            <span>Lost Bag</span>
            <strong>${formatNumber(state.lostBag)}</strong>
          </div>
        ) : null}
      </div>

      <button type="button" className={`rug-it-button ${variant}`} onClick={onRugIt}>
        <span>Rug It</span>
        <small>{detail}</small>
      </button>

      {eventText ? (
        <div className={`rug-event-toast rug-event-${eventText.kind}`}>
          {eventText.title}
          {eventText.line ? ` · ${eventText.line}` : ''}
        </div>
      ) : null}
    </div>
  )
}
