import { useEffect, useReducer } from 'react'
import { createInitialGame, gameReducer } from './game/reducer'
import { loadGame, saveGame } from './game/save'
import type { GameState } from './game/types'
import { HomeScreen } from './screens/HomeScreen'
import './styles/theme.css'

const initialState = createInitialGame()

function loadInitialGame(fallback: GameState) {
  return loadGame() ?? fallback
}

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState, loadInitialGame)

  useEffect(() => {
    saveGame(state)
  }, [state])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return <HomeScreen state={state} dispatch={dispatch} />
}

export default App
