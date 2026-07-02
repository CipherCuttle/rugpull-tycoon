import { useEffect, useRef, useState } from 'react'
import type { MajorEvent } from '../game/types'

interface TickerFeedProps {
  history: string[]
  majorEvent: MajorEvent | null
}

const ROTATE_MS = 5000
const MAJOR_EVENT_MS = 4000
const VISIBLE_COUNT = 8
const FALLBACK_LINE = 'Fictional satire mode armed. No wallets, no trading, no real money.'

// Single-line rotating ticker (subtask 2): internally rotates through the
// most recent tickerHistory entries on a local timer, and temporarily
// overrides with `majorEvent.line` whenever a new major event id appears.
export function TickerFeed({ history, majorEvent }: TickerFeedProps) {
  const recent = history.slice(0, VISIBLE_COUNT)
  const [index, setIndex] = useState(0)
  const [overrideLine, setOverrideLine] = useState<string | null>(null)
  const lastMajorEventId = useRef<number | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => prev + 1)
    }, ROTATE_MS)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!majorEvent || majorEvent.id === lastMajorEventId.current) {
      return
    }

    lastMajorEventId.current = majorEvent.id
    setOverrideLine(majorEvent.line)
    const timeout = window.setTimeout(() => setOverrideLine(null), MAJOR_EVENT_MS)

    return () => window.clearTimeout(timeout)
  }, [majorEvent])

  const rotatingLine = recent.length > 0 ? recent[index % recent.length] : FALLBACK_LINE
  const displayLine = overrideLine ?? rotatingLine ?? FALLBACK_LINE

  return (
    <section className={`ticker-feed-line ${overrideLine ? 'major' : ''}`} aria-label="Ticker feed" aria-live="polite">
      <span>{displayLine}</span>
    </section>
  )
}
