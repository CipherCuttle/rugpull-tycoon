import { chartPath } from '../game/tick'

interface FakeChartProps {
  points: number[]
}

export function FakeChart({ points }: FakeChartProps) {
  const width = 360
  const height = 150
  const path = chartPath(points, width, height)
  const last = points.at(-1) ?? 0
  const first = points[0] ?? last
  const isUp = last >= first

  return (
    <section className="chart-panel" aria-label="Fake chart">
      <div className="chart-header">
        <span>Fake Chart</span>
        <strong className={isUp ? 'chart-up' : 'chart-down'}>{isUp ? 'UP ONLY' : 'DUMPING'}</strong>
      </div>
      <svg className="fake-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fictional $EGG chart">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#52ff88" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#52ff88" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0,${height} L${path.replaceAll(' ', ' L')} L${width},${height} Z`} fill="url(#chartFill)" />
        <polyline points={path} fill="none" stroke={isUp ? '#52ff88' : '#ff4d5d'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" x2={width} y1="118" y2="118" stroke="#282828" strokeDasharray="7 8" />
        <line x1="0" x2={width} y1="72" y2="72" stroke="#282828" strokeDasharray="7 8" />
      </svg>
      <p className="safety-line">Fictional arcade chart. No market data, no trading signal.</p>
    </section>
  )
}
