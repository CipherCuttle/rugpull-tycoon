import { useState, type Dispatch } from 'react'
import { BondingCurve } from '../components/BondingCurve'
import { CardAlbum } from '../components/CardAlbum'
import { EventPanel } from '../components/EventPanel'
import { FakeChart } from '../components/FakeChart'
import { MainActionButton } from '../components/MainActionButton'
import { PrestigeModal } from '../components/PrestigeModal'
import { ResourceBar } from '../components/ResourceBar'
import { TickerFeed } from '../components/TickerFeed'
import { UpgradeList } from '../components/UpgradeList'
import type { GameAction, GameState } from '../game/types'

interface HomeScreenProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

type Drawer = 'upgrades' | 'cards' | 'event'

export function HomeScreen({ state, dispatch }: HomeScreenProps) {
  const [drawer, setDrawer] = useState<Drawer>('upgrades')

  return (
    <main className="game-shell">
      <ResourceBar state={state} />

      <section className="coin-panel" aria-label="$EGG launch panel">
        <div className="coin-heading">
          <div>
            <span className="kicker">Basement Launch</span>
            <h1>{state.currentCoin.ticker}</h1>
          </div>
          <div className={`launch-status ${state.currentCoin.launched ? 'live' : ''}`}>
            {state.currentCoin.launched ? 'Live' : 'Not launched'}
          </div>
        </div>
        <p className="coin-copy">
          A fictional satire coin with no chain, no wallet, no market, and extremely loud candles.
        </p>
        {state.lastOutcome ? <p className="outcome-strip">{state.lastOutcome}</p> : null}
      </section>

      <FakeChart points={state.chartPoints} />
      <BondingCurve progress={state.bondingCurveProgress} />

      <MainActionButton
        state={state}
        onLaunch={() => dispatch({ type: 'LAUNCH_COIN' })}
        onSend={() => dispatch({ type: 'SEND_CANDLE' })}
      />

      <TickerFeed lines={state.tickerHistory} />

      <nav className="drawer-tabs" aria-label="Bottom drawers">
        <button className={drawer === 'upgrades' ? 'active' : ''} type="button" onClick={() => setDrawer('upgrades')}>
          Upgrades
        </button>
        <button className={drawer === 'cards' ? 'active' : ''} type="button" onClick={() => setDrawer('cards')}>
          Cards
        </button>
        <button className={drawer === 'event' ? 'active' : ''} type="button" onClick={() => setDrawer('event')}>
          Event
        </button>
      </nav>

      {drawer === 'upgrades' ? <UpgradeList state={state} onBuy={(upgradeId) => dispatch({ type: 'BUY_UPGRADE', upgradeId })} /> : null}
      {drawer === 'cards' ? <CardAlbum state={state} onOpenCrate={() => dispatch({ type: 'OPEN_COPE_CRATE' })} /> : null}
      {drawer === 'event' ? <EventPanel state={state} /> : null}

      <footer className="safety-footer">Fictional satire. No wallets. No trading. No deposits. No withdrawals.</footer>

      <PrestigeModal state={state} onGraduate={() => dispatch({ type: 'GRADUATE_COIN' })} />
    </main>
  )
}
