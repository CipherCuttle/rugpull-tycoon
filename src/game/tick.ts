export function nextChartPoint(points: number[], delta: number) {
  const last = points.at(-1) ?? 28
  const wobble = ((points.length * 17) % 9) - 4
  const next = Math.max(4, Math.min(96, last + delta + wobble * 0.35))

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
