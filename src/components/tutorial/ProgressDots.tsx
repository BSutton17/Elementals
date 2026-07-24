// Clickable progress dots for the How to Play walkthrough.

interface ProgressDotsProps {
  labels: readonly string[]
  index: number
  onSelect: (index: number) => void
}

export function ProgressDots({ labels, index, onSelect }: ProgressDotsProps) {
  return (
    <div className="howto-dots" role="tablist" aria-label="Tutorial pages">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Page ${i + 1}: ${label}`}
          className={`howto-dots__dot${i === index ? ' howto-dots__dot--active' : ''}${i < index ? ' howto-dots__dot--done' : ''}`}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  )
}
