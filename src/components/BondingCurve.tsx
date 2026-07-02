interface BondingCurveProps {
  progress: number
}

export function BondingCurve({ progress }: BondingCurveProps) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <section className="curve-panel" aria-label="Bonding curve progress">
      <div className="curve-label">
        <span>Bonding Curve</span>
        <strong>{clamped.toFixed(1)}%</strong>
      </div>
      <div className="curve-track">
        <div className="curve-fill" style={{ width: `${clamped}%` }} />
      </div>
      <div className="curve-states">
        <span>Basement</span>
        <span>Crime Scene</span>
      </div>
    </section>
  )
}
