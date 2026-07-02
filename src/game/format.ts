// Small UI-only number formatting helper, split out of ResourceBar.tsx so
// that component file only exports a component (keeps react-refresh/oxlint
// happy) while still being shared with HomeScreen's secondary-resources row.
export function formatNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return Math.floor(value).toString()
}
