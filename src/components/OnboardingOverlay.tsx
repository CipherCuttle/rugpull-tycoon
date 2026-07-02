import { useState } from 'react'

interface OnboardingOverlayProps {
  visible: boolean
  ticker: string
  onComplete: () => void
}

interface OnboardingStep {
  title: string
  body: string
}

function buildSteps(ticker: string): OnboardingStep[] {
  return [
    { title: `Launch ${ticker}`, body: 'Your first hallucination needs liquidity.' },
    { title: 'Send the candle', body: 'Press the button. Watch the chart lie.' },
    { title: 'Buy cursed upgrades', body: 'Shill bots, KOLs, and bad decisions make numbers go up.' },
  ]
}

// 3-step skippable onboarding (subtask 2). Mounted from HomeScreen and only
// visible while `!state.onboardingComplete`; finishing or skipping dispatches
// COMPLETE_ONBOARDING (subtask 1 action, consumed here as-is).
export function OnboardingOverlay({ visible, ticker, onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0)

  if (!visible) {
    return null
  }

  const steps = buildSteps(ticker)
  const current = steps[step] ?? steps[0]
  const isLast = step >= steps.length - 1

  function handleNext() {
    if (isLast) {
      onComplete()
      return
    }

    setStep((prev) => prev + 1)
  }

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <section className="onboarding-card">
        <span className="modal-kicker">
          Step {step + 1}/{steps.length}
        </span>
        <h2 id="onboarding-title">{current.title}</h2>
        <p>{current.body}</p>
        <div className="onboarding-controls">
          <button type="button" className="onboarding-skip" onClick={onComplete}>
            Skip
          </button>
          <button type="button" className="onboarding-next" onClick={handleNext}>
            {isLast ? 'Start' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  )
}
