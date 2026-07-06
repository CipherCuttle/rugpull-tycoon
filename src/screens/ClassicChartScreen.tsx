import { useEffect, useReducer } from 'react'
import { createInitialGame, gameReducer } from '../game/reducer'
import { loadGame, saveGame } from '../game/save'
import type { GameState } from '../game/types'
import { HomeScreen } from './HomeScreen'

const initialState = createInitialGame()
// v0.3.4: the classic loop also drives the visual candle chart, so it runs at
// ~120ms for a lively refresh. Economy-side work is dt-scaled.
const TICK_INTERVAL_MS = 120

function loadInitialGame(fallback: GameState) {
  return loadGame() ?? fallback
}

export function ClassicChartScreen() {
  const [state, dispatch] = useReducer(gameReducer, initialState, loadInitialGame)

  useEffect(() => {
    saveGame(state)
  }, [state])

  useEffect(() => {
    let lastTickAt = Date.now()
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const dtSeconds = (now - lastTickAt) / 1000
      lastTickAt = now
      dispatch({ type: 'TICK', now, dtSeconds })
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return <HomeScreen state={state} dispatch={dispatch} />
}
