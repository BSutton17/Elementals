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

/** The pip for each suit. A joker has no suit and takes its own mark. */
const SUIT_PIP: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

/** Hearts and diamonds are red; spades and clubs black. */
const RED_SUITS = new Set(['hearts', 'diamonds'])

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
  suit = null,
  className,
}: {
  /** "2".."10", "Ace", "Jack", "Queen", "King", or "Joker". */
  card: string
  /** The suit drawn. Null for a joker, which has none. */
  suit?: string | null
  className?: string
}) {
  const rarity = rarityOf(card)
  const corner = cornerOf(card)
  // The suit is real now — it decides what the hit leaves behind, so the card
  // has to show which one it actually was rather than a stock spade.
  const pip = card === 'Joker' ? '★' : (suit ? SUIT_PIP[suit] ?? '♠' : '♠')
  const red = suit != null && RED_SUITS.has(suit)
  return (
    <div
      className={`pcard pcard--face pcard--${rarity}${red ? ' pcard--red' : ''}${className ? ` ${className}` : ''}`}
      data-testid="playing-card-face"
      data-card={card}
      data-suit={suit ?? ''}
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
