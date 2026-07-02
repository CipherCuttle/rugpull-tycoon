import { useEffect, useRef, useState } from 'react'
import { playSound } from '../game/sound'
import type { ToastEffect, ToastKind } from '../game/types'

interface ToastHostProps {
  toast: ToastEffect | null
}

// One non-blocking toast at a time (subtask 6). Because the reducer keeps a
// single `toast` slot that each new event overwrites, honoring "one at a time"
// is just: show the newest id, auto-dismiss, and debounce an identical line so a
// repeat doesn't re-animate on top of itself.
const TOAST_MS = 1900

const KIND_CHIP: Record<ToastKind, string> = {
  evidence: 'EVIDENCE',
  operator: 'HIRED',
  chain: 'CHAIN',
}

const KIND_SOUND: Record<ToastKind, Parameters<typeof playSound>[0]> = {
  evidence: 'card',
  operator: 'upgrade',
  chain: 'crit',
}

export function ToastHost({ toast }: ToastHostProps) {
  const [current, setCurrent] = useState<ToastEffect | null>(null)
  const lastId = useRef<number | null>(null)

  useEffect(() => {
    if (!toast || toast.id === lastId.current) {
      return
    }

    lastId.current = toast.id
    setCurrent(toast)
    playSound(KIND_SOUND[toast.kind])

    const timeout = window.setTimeout(() => setCurrent(null), TOAST_MS)

    return () => window.clearTimeout(timeout)
  }, [toast])

  if (!current) {
    return null
  }

  return (
    <div className={`toast toast-${current.kind}`} role="status" aria-live="polite" key={current.id}>
      <span className="toast-chip">{KIND_CHIP[current.kind]}</span>
      <strong className="toast-title">{current.title}</strong>
      <span className="toast-line">{current.line}</span>
    </div>
  )
}
