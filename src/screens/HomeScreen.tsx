import { useState, type Dispatch } from 'react'
import { CardAlbum } from '../components/CardAlbum'
import { CardRevealModal } from '../components/CardRevealModal'
import { EventPanel } from '../components/EventPanel'
import { FakeChart } from '../components/FakeChart'
import { MainActionButton } from '../components/MainActionButton'
import { OnboardingOverlay } from '../components/OnboardingOverlay'
import { PrestigeModal } from '../components/PrestigeModal'
import { ResourceBar } from '../components/ResourceBar'
import { TickerFeed } from '../components/TickerFeed'
import { UpgradeList } from '../components/UpgradeList'
import { formatNumber } from '../game/format'
import { getMilestoneLabel, getNextObjective } from '../game/objective'
import { clearSave } from '../game/save'
import { isSoundEnabled, setSoundEnabled } from '../game/sound'
import type { GameAction, GameState } from '../game/types'

interface HomeScreenProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

type Drawer = 'upgrades' | 'cards' | 'event'

export function HomeScreen({ state, dispatch }: HomeScreenProps) {
  const [drawer, setDrawer] = useState<Drawer>('upgrades')
  const [isPrestigeOpen, setPrestigeOpen] = useState(false)
  // Audio placeholder toggle (v0.2). Persists via game/sound.ts; the actual
  // playback is still a no-op until real samples land.
  const [soundOn, setSoundOn] = useState(isSoundEnabled)

  function toggleSound() {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
  }

  const milestoneLabel = getMilestoneLabel(state.bondingCurveTier)
  const objective = getNextObjective(state)

  function handleResetSave() {
    const confirmed = window.confirm('Delete this save and start a brand-new basement launch? This cannot be undone.')

    if (!confirmed) {
      return
    }

    clearSave()
    dispatch({ type: 'RESET_SAVE' })
  }

  return (
    <main className="game-shell">
      {/* 1. TOP AREA: ticker, milestone label, compact resource row */}
      <header className="top-area">
        <div className="top-area-heading">
          <span className="ticker-symbol">{state.currentCoin.ticker}</span>
          <span className="milestone-pill">{milestoneLabel}</span>
        </div>
        <ResourceBar state={state} />
      </header>

      <TickerFeed history={state.tickerHistory} majorEvent={state.majorEvent} />

      {/* 2. CENTER HERO AREA: chart + bonding curve rail merged into one card */}
      <FakeChart
        points={state.chartPoints}
        progress={state.bondingCurveProgress}
        tier={state.bondingCurveTier}
        milestoneLabel={milestoneLabel}
        tapEffect={state.lastTapEffect}
        isDecaying={state.isDecaying}
      />

      {/* 3. MAIN ACTION AREA */}
      <MainActionButton
        state={state}
        onLaunch={() => dispatch({ type: 'LAUNCH_COIN' })}
        onSend={() => dispatch({ type: 'SEND_CANDLE' })}
        onGraduateClick={() => setPrestigeOpen(true)}
      />

      {/* 4. BOTTOM OBJECTIVE */}
      <p className="objective-line">{objective}</p>

      {/* 5. SECONDARY AREAS: existing drawer-tabs, de-emphasized */}
      <section className="secondary-area">
        <div className="secondary-resources" aria-label="Secondary resources">
          <span>Copium {formatNumber(state.resources.copium)}</span>
          <span>Receipts {formatNumber(state.resources.receipts)}</span>
          <span>Exit {formatNumber(state.resources.exitLiquidity)}</span>
        </div>

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

        {drawer === 'upgrades' ? (
          <UpgradeList state={state} onBuy={(upgradeId) => dispatch({ type: 'BUY_UPGRADE', upgradeId })} />
        ) : null}
        {drawer === 'cards' ? <CardAlbum state={state} onOpenCrate={() => dispatch({ type: 'OPEN_COPE_CRATE' })} /> : null}
        {drawer === 'event' ? <EventPanel state={state} /> : null}
      </section>

      <footer className="safety-footer">
        <p>Fictional satire. No wallets. No trading. No deposits. No withdrawals.</p>
        <div className="footer-controls">
          <button
            type="button"
            className={`sound-toggle ${soundOn ? 'on' : ''}`}
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            {soundOn ? 'Sound: On' : 'Sound: Off'}
          </button>
          <button type="button" className="reset-save-button" onClick={handleResetSave}>
            Delete My Bags
          </button>
        </div>
      </footer>

      {/* 9. Onboarding overlay */}
      <OnboardingOverlay
        visible={!state.onboardingComplete}
        ticker={state.currentCoin.ticker}
        onComplete={() => dispatch({ type: 'COMPLETE_ONBOARDING' })}
      />

      {/* 5. Card reveal modal, mounted once regardless of active drawer */}
      <CardRevealModal pendingCardReveal={state.pendingCardReveal} />

      {/* 7. Theatrical graduation modal */}
      <PrestigeModal
        state={state}
        open={isPrestigeOpen}
        onClose={() => setPrestigeOpen(false)}
        onGraduate={() => dispatch({ type: 'GRADUATE_COIN' })}
      />
    </main>
  )
}
