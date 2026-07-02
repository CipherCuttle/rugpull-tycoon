// v0.3.2: the chart line now visualizes Surf Pressure directly. Each tap/tick
// appends the current surf value (with a little deterministic wobble so the line
// has texture), so the sparkline oscillates and drifts instead of ratcheting to
// the 96 ceiling the old delta model pinned it at.
export function nextChartPoint(points: number[], surfPressure: number) {
  const wobble = ((points.length * 17) % 9) - 4
  const next = Math.max(4, Math.min(96, surfPressure + wobble * 0.4))

  return [...points.slice(-31), Number(next.toFixed(2))]
}

export function chartPath(points: number[], width: number, height: number) {
  if (!points.length) {
    return ''
  }

  const max = Math.max(...points, 100)
  const min = Math.min(...points, 0)
  const range = Math.max(1, max - min)
  const step = width / Math.max(1, points.length - 1)

  return points
    .map((point, index) => {
      const x = index * step
      const y = height - ((point - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}
