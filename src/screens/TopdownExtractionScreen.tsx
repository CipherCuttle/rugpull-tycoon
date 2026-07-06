import { useEffect, useRef, useState } from 'react'
import { TopdownHud } from '../components/topdown/TopdownHud'
import { mountTopdownGame } from '../game/topdown/TopdownGame'
import type { TopdownHudState } from '../game/topdown/types'
import '../styles/topdown.css'

const initialHud: TopdownHudState = {
  status: 'Booting Waffle Mausoleum...',
  rentBanked: 0,
  carriedBag: 0,
  lostBag: null,
  deathCause: null,
  runState: 'playing',
}

export function TopdownExtractionScreen() {
  const gameHostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [hud, setHud] = useState<TopdownHudState>(initialHud)

  useEffect(() => {
    const host = gameHostRef.current

    if (!host || gameRef.current) {
      return
    }

    gameRef.current = mountTopdownGame(host, {
      onHudChange: setHud,
      onSliceReady: () => setHud((current) => ({ ...current, status: 'Waffle Mausoleum backroom online.' })),
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <main className="topdown-shell">
      <header className="topdown-header">
        <div>
          <span className="topdown-kicker">Rugpull Tycoon</span>
          <h1>Waffle Mausoleum Backroom Extraction</h1>
        </div>
        <a className="classic-link" href="/classic">
          Classic
        </a>
      </header>

      <section className="topdown-stage" aria-label="Top-down extraction game">
        <div ref={gameHostRef} className="topdown-game-host" />
        <TopdownHud hud={hud} />
      </section>

      <footer className="topdown-safety">
        Fictional arcade satire. No wallets. No trading. No deposits. No withdrawals.
      </footer>
    </main>
  )
}
