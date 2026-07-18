import { useEffect, useRef, useState } from 'react'
import { TopdownHud } from '../components/topdown/TopdownHud'
import { mountTopdownGame } from '../game/topdown/TopdownGame'
import { loadTopdownSave, saveTopdownSave } from '../game/topdown/save'
import type { TopdownHudState } from '../game/topdown/types'
import '../styles/topdown.css'

const initialHud: TopdownHudState = {
  status: 'Booting Waffle Mausoleum...',
  rentBanked: 0,
  carriedBag: 0,
  lostBag: null,
  heldTrash: null,
  heatTier: 0,
  heatLabel: 'Cold / Broke',
  rugWindowState: 'no-bag',
  rugWindowLabel: 'NO BAG',
  deathCause: null,
  lastDeathCause: null,
  runState: 'playing',
  floorResult: null,
}

function formatDollars(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function TopdownExtractionScreen() {
  const gameHostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const saveRef = useRef(loadTopdownSave())
  const [hud, setHud] = useState<TopdownHudState>(initialHud)

  useEffect(() => {
    const host = gameHostRef.current

    if (!host || gameRef.current) {
      return
    }

    gameRef.current = mountTopdownGame(host, saveRef.current, {
      onHudChange: setHud,
      onSaveChange: (nextSave) => {
        saveRef.current = nextSave
        saveTopdownSave(nextSave)
      },
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

      <div className="topdown-cabinet">
        <div className={`topdown-quick-strip heat-tier-${hud.heatTier} rug-window-${hud.rugWindowState}`} aria-label="Compact run status">
          <span>Bag {formatDollars(hud.carriedBag)}</span>
          <span>Rent {formatDollars(hud.rentBanked)}</span>
          <span>Heat {hud.heatLabel}</span>
          <span>{hud.rugWindowLabel}</span>
        </div>

        <div className="topdown-play-layout">
          <section className="topdown-stage" aria-label="Top-down extraction game">
            <div ref={gameHostRef} className="topdown-game-host" />
          </section>
          <TopdownHud hud={hud} />
        </div>
      </div>

      <footer className="topdown-safety">
        Fictional arcade satire. No wallets. No trading. No deposits. No withdrawals.
      </footer>
    </main>
  )
}
