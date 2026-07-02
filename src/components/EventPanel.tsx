import { BULL_TRAP_WEEK } from '../data/events'
import type { GameState } from '../game/types'

interface EventPanelProps {
  state: GameState
}

export function EventPanel({ state }: EventPanelProps) {
  const claimed = new Set(state.event.claimedTaskIds)

  return (
    <section className="drawer-panel" aria-label="Event track">
      <div className="section-heading">
        <h2>{BULL_TRAP_WEEK.name}</h2>
        <span>{state.event.hypeBoostTicks > 0 ? `${state.event.hypeBoostTicks}s boost` : 'starter track'}</span>
      </div>
      <p className="event-copy">{BULL_TRAP_WEEK.description}</p>
      <div className="task-list">
        {BULL_TRAP_WEEK.tasks.map((task) => {
          const value = state.event.progress[task.id]
          const done = claimed.has(task.id)
          const progress = Math.min(100, (value / task.target) * 100)

          return (
            <article className={`task-row ${done ? 'done' : ''}`} key={task.id}>
              <div>
                <strong>{task.label}</strong>
                <span>{task.rewardText}</span>
              </div>
              <div className="task-meter" aria-label={`${task.label} progress`}>
                <div style={{ width: `${progress}%` }} />
              </div>
              <small>
                {Math.min(value, task.target)}/{task.target}
              </small>
            </article>
          )
        })}
      </div>
    </section>
  )
}
