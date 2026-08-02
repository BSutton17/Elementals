import './PlayingCard.css'

// The playing card both Joker cinematics are built from — Blackjack's reveal
// and Lucky Draw's five-card fan. One component, two faces: a rich casino BACK
// in Joker's red-and-gold, and a FRONT that shows whatever the gameplay logic
// drew.
//
// Everything is CSS/SVG rather than an image so it stays crisp at the enormous
// scale the reveal blows it up to.

/** How valuable a card is — drives how loud its reveal gets. */
export type CardRarity = 'number' | 'face' | 'joker'

/** The rarity of a Blackjack card label (mirrors `engine/blackjack.ts`). */
export function rarityOf(card: string): CardRarity {
  if (card === 'Joker') return 'joker'
  if (card === 'Jack' || card === 'Queen' || card === 'King' || card === 'Ace') {
    return 'face'
  }
  return 'number'
}

/** The pip a card front shows. Aces and numbers take spades; faces get their
 *  own letter, and the Joker its own mark. */
const PIP: Record<string, string> = {
  Joker: '★',
  Ace: '♠',
  Jack: '♠',
  Queen: '♠',
  King: '♠',
}

/** The corner letter/number for a card. */
function cornerOf(card: string): string {
  switch (card) {
    case 'Ace':
      return 'A'
    case 'Jack':
      return 'J'
    case 'Queen':
      return 'Q'
    case 'King':
      return 'K'
    case 'Joker':
      return '★'
    default:
      return card
  }
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div className={`pcard pcard--back${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div className="pcard__trim">
        <div className="pcard__weave" />
        <div className="pcard__crest">
          <span className="pcard__crest-pip">♠</span>
        </div>
        {/* Faint magical motes drifting under the lacquer. */}
        <span className="pcard__motes" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="pcard__mote" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </span>
      </div>
    </div>
  )
}

export function CardFace({
  card,
  className,
}: {
  /** "2".."10", "Ace", "Jack", "Queen", "King", or "Joker". */
  card: string
  className?: string
}) {
  const rarity = rarityOf(card)
  const corner = cornerOf(card)
  const pip = PIP[card] ?? '♠'
  return (
    <div
      className={`pcard pcard--face pcard--${rarity}${className ? ` ${className}` : ''}`}
      data-testid="playing-card-face"
      data-card={card}
    >
      <span className="pcard__corner pcard__corner--tl">
        {corner}
        <span className="pcard__corner-pip">{pip}</span>
      </span>
      <span className="pcard__centre">{card === 'Joker' ? '🃏' : pip}</span>
      <span className="pcard__name">{card}</span>
      <span className="pcard__corner pcard__corner--br">
        {corner}
        <span className="pcard__corner-pip">{pip}</span>
      </span>
    </div>
  )
}
