interface TickerFeedProps {
  lines: string[]
}

export function TickerFeed({ lines }: TickerFeedProps) {
  return (
    <section className="ticker-feed" aria-label="Ticker feed">
      <div className="section-heading">
        <h2>Ticker Feed</h2>
        <span>basement tape</span>
      </div>
      <ol>
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ol>
    </section>
  )
}
