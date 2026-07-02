import { useEffect, useRef, useState } from 'react'
import { playSound } from '../game/sound'
import type { StreakEffect } from '../game/types'

interface StreakBurstProps {
  effect: StreakEffect | null
}

const STREAK_BURST_MS = 1350

function streakClass(combo: number): string {
  if (combo >= 100) {
    return 'legend'
  }

  if (combo >= 50) {
    return 'hot'
  }

  if (combo >= 20) {
    return 'surf'
  }

  return 'started'
}

export function StreakBurst({ effect }: StreakBurstProps) {
  const [current, setCurrent] = useState<StreakEffect | null>(null)
  const lastId = useRef<number | null>(null)

  useEffect(() => {
    if (!effect) {
      setCurrent(null)
      lastId.current = null
      return
    }

    if (effect.id === lastId.current) {
      return
    }

    lastId.current = effect.id
    setCurrent(effect)
    playSound('milestone')

    const timeout = window.setTimeout(() => setCurrent(null), STREAK_BURST_MS)

    return () => window.clearTimeout(timeout)
  }, [effect])

  if (!current) {
    return null
  }

  return (
    <div className={`streak-burst streak-burst-${streakClass(current.combo)}`} role="status" aria-live="polite" key={current.id}>
      <span>CANDLE CHAIN {current.combo}</span>
      <strong>{current.title}</strong>
      <small>{current.line}</small>
    </div>
  )
}
