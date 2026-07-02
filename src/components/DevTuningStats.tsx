import { useEffect, useRef, useState } from 'react'
import {
  getBondingCurveDelta,
  getClickGain,
  getDecayRate,
  getPassiveGainPerSecond,
  getTierFloor,
} from '../game/economy'
import type { GameState } from '../game/types'

interface DevTuningStatsProps {
  state: GameState
}

// v0.3.1 dev-only tuning readout. Rendered exclusively behind
// `import.meta.env.DEV` (see HomeScreen), so it is tree-shaken out of production
// builds and never reaches players. Collapsible + non-prominent — purely a knob
// for balancing the Chart Gravity / graduation pacing pass.
export function DevTuningStats({ state }: DevTuningStatsProps) {
  const [open, setOpen] = useState(false)

  // Run duration derived from a timestamp captured whenever the run changes
  // (runNumber ticks on graduation). No extra interval — the 1s game TICK
  // already re-renders us roughly once per second.
  const runStartRef = useRef<{ run: number; at: number }>({ at: Date.now(), run: state.currentCoin.runNumber })
  if (runStartRef.current.run !== state.currentCoin.runNumber) {
    runStartRef.current = { at: Date.now(), run: state.currentCoin.runNumber }
  }
  const [, force] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const runSeconds = Math.floor((Date.now() - runStartRef.current.at) / 1000)

  const curvePerTap = getBondingCurveDelta(state, getClickGain(state))
  const passivePerSec = getPassiveGainPerSecond(state)
  const passiveCurvePerSec = getBondingCurveDelta(state, passivePerSec)
  const decayPerSec = getDecayRate(state)
  const floor = getTierFloor(state.bondingCurveTier)
  const remaining = Math.max(0, 100 - state.bondingCurveProgress)
  // Estimated time to graduation assuming a steady 3 taps/sec of active play
  // (idle never decays while tapping, so decay is excluded from the active rate).
  // ETA now factors the Candle Chain: curve pressure = base × combo multiplier.
  // Assume a sustained x2 (typical continuous mashing) at 3 taps/sec.
  const assumedMultiplier = 2
  const activeCurvePerSec = curvePerTap * 3 * assumedMultiplier
  const etaSeconds = activeCurvePerSec > 0 ? Math.ceil(remaining / activeCurvePerSec) : Infinity

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 4,
        left: 4,
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#9fe',
        background: 'rgba(0,0,0,0.72)',
        border: '1px solid rgba(159,255,238,0.35)',
        borderRadius: 6,
        padding: open ? '6px 8px' : '2px 6px',
        maxWidth: 220,
        pointerEvents: 'auto',
        opacity: 0.85,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          color: '#9fe',
          fontFamily: 'monospace',
          fontSize: 10,
        }}
      >
        {open ? '▾ dev tuning' : '▸ dev'}
      </button>
      {open ? (
        <div>
          <div>curve: {state.bondingCurveProgress.toFixed(2)}% (tier {state.bondingCurveTier})</div>
          <div>tier floor: {floor}%</div>
          <div>idleTicks: {state.idleTicks} {state.isDecaying ? '(DECAYING)' : ''}</div>
          <div>decay/sec: {decayPerSec.toFixed(3)}%</div>
          <div>curve/tap (x1): {curvePerTap.toFixed(3)}%</div>
          <div>passive/sec: {passiveCurvePerSec.toFixed(3)}% curve</div>
          <div>combo: {state.combo} (x{state.comboMultiplier.toFixed(1)}) max {state.maxComboThisRun}</div>
          <div>
            chart: {state.chart.price.toFixed(1)} v{state.chart.velocity.toFixed(1)} h{state.chart.heat.toFixed(0)}
          </div>
          <div>ETA @3tps·x2: {Number.isFinite(etaSeconds) ? `${etaSeconds}s` : '—'}</div>
          <div>taps (run): {state.taps}</div>
          <div>run time: {runSeconds}s</div>
        </div>
      ) : null}
    </div>
  )
}
