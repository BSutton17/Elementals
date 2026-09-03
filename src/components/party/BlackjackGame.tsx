import { partyAct, type BlackjackState, type Card, type PartySnapshot } from '../../game/party'

/**
 * May the odds be ever in your favour.
 *
 * One hand, everything you own on it. Hit, stand, double, split — and split
 * again, and double a split hand, because the ceiling is where the fun is.
 *
 * ⚠️ THE DEALER'S SECOND CARD IS DRAWN FACE DOWN AND IT IS NOT HERE. The server
 * withholds it until the hand is over, so this side cannot show it even by
 * accident. The face-down card is a placeholder, not a hidden value.
 *
 * ⚠️ AND NOTHING HERE DECIDES A WINNER. The buttons send intent; the totals
 * shown are drawn from the state that comes back.
 */

const SUIT_MARK: Record<Card['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const RANK_MARK: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}

function rankOf(card: Card): string {
  return RANK_MARK[card.rank] ?? String(card.rank)
}

/** Mirrors the server's scoring, for display only. */
function valueOf(cards: Card[]): number {
  let total = 0
  let aces = 0
  for (const card of cards) {
    if (card.rank === 1) {
      aces += 1
      total += 11
    } else {
      total += Math.min(10, card.rank)
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

/**
 * One card, dealt.
 *
 * ⚠️ THE ANIMATION IS KEYED TO THE CARD'S POSITION IN THE HAND, and that is
 * what makes a hit look like a hit. React only mounts the element that was
 * added, so an entrance animation plays for the NEW card and not for the ones
 * already on the table — no bookkeeping, no "which cards are new" state. The
 * `--deal` delay staggers the opening deal so two cards arrive one after the
 * other rather than appearing together.
 */
function CardFace({
  card,
  hidden = false,
  index = 0,
}: {
  card?: Card
  hidden?: boolean
  /** Position in the hand — drives the deal stagger. */
  index?: number
}) {
  const style = { '--deal': `${Math.min(index, 5) * 110}ms` } as React.CSSProperties
  if (hidden || !card) {
    return (
      <span
        className="party-bj__card party-bj__card--down"
        style={style}
        aria-label="face down"
      />
    )
  }
  const red = card.suit === 'hearts' || card.suit === 'diamonds'
  return (
    <span className={`party-bj__card${red ? ' party-bj__card--red' : ''}`} style={style}>
      <span className="party-bj__rank">{rankOf(card)}</span>
      <span className="party-bj__suit">{SUIT_MARK[card.suit]}</span>
      <span className="party-bj__pip" aria-hidden="true">
        {SUIT_MARK[card.suit]}
      </span>
    </span>
  )
}

export function BlackjackGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const state = mine?.data.game as unknown as BlackjackState | undefined
  if (!state) return null

  const settled = state.settled
  const active = state.hands[state.active]
  const canSplit =
    !settled &&
    active !== undefined &&
    active.cards.length === 2 &&
    !active.doubled &&
    state.hands.length < 4 &&
    valueCard(active.cards[0]!) === valueCard(active.cards[1]!)
  const canDouble = !settled && active !== undefined && active.cards.length === 2 && !active.doubled

  return (
    <div className="party-bj">
      <p className="party-bj__stake" data-testid="bj-stake">
        Gambling <strong>{Math.round(state.stake).toLocaleString()}</strong> gold
      </p>

      <div className="party-bj__dealer">
        <span className="party-bj__label">Dealer</span>
        <div className="party-bj__cards">
          {settled ? (
            state.dealerCards.map((card, i) => <CardFace key={i} card={card} index={i} />)
          ) : (
            <>
              <CardFace card={state.dealerUp ?? undefined} index={0} />
              <CardFace hidden index={1} />
            </>
          )}
        </div>
        {settled && <span className="party-bj__total">{valueOf(state.dealerCards)}</span>}
      </div>

      <div className="party-bj__hands">
        {state.hands.map((hand, i) => {
          const total = valueOf(hand.cards)
          const isActive = !settled && i === state.active
          return (
            <div
              key={i}
              className={`party-bj__hand${isActive ? ' party-bj__hand--active' : ''}${
                hand.outcome ? ` party-bj__hand--${hand.outcome}` : ''
              }`}
              data-testid={`bj-hand-${i}`}
            >
              <div className="party-bj__cards">
                {hand.cards.map((card, j) => (
                  <CardFace key={j} card={card} index={j} />
                ))}
              </div>
              <div className="party-bj__hand-foot">
                <span className={`party-bj__total${total > 21 ? ' party-bj__total--bust' : ''}`}>
                  {total > 21 ? `Bust ${total}` : total}
                </span>
                <span className="party-bj__bet">{Math.round(hand.bet).toLocaleString()}g</span>
                {hand.outcome && (
                  <span className="party-bj__outcome">{outcomeWord(hand.outcome)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {settled ? (
        <div className="party-bj__settled" data-testid="bj-settled">
          <p className={`party-bj__net${state.net >= 0 ? ' party-bj__net--up' : ''}`}>
            {state.net >= 0
              ? `+${Math.round(state.net).toLocaleString()} gold`
              : `${Math.round(state.net).toLocaleString()} gold`}
          </p>
          {state.owed > 0 && (
            // The debt rule, said plainly. A player who overreached needs to
            // know why their income stopped, or it reads as a bug.
            <p className="party-bj__owed" data-testid="bj-owed">
              {Math.round(state.owed).toLocaleString()} more than you had — your production pays
              it off.
            </p>
          )}
        </div>
      ) : (
        <div className="party-bj__actions">
          <button
            type="button"
            className="party-bj__act"
            data-testid="bj-hit"
            onClick={() => void partyAct({ type: 'hit' })}
          >
            Hit
          </button>
          <button
            type="button"
            className="party-bj__act"
            data-testid="bj-stand"
            onClick={() => void partyAct({ type: 'stand' })}
          >
            Stand
          </button>
          <button
            type="button"
            className="party-bj__act party-bj__act--risky"
            data-testid="bj-double"
            disabled={!canDouble}
            onClick={() => void partyAct({ type: 'double' })}
          >
            Double
          </button>
          <button
            type="button"
            className="party-bj__act party-bj__act--risky"
            data-testid="bj-split"
            disabled={!canSplit}
            onClick={() => void partyAct({ type: 'split' })}
          >
            Split
          </button>
        </div>
      )}
    </div>
  )
}

function valueCard(card: Card): number {
  return card.rank === 1 ? 1 : Math.min(10, card.rank)
}

function outcomeWord(outcome: NonNullable<BlackjackState['hands'][number]['outcome']>): string {
  if (outcome === 'blackjack') return 'Blackjack'
  if (outcome === 'win') return 'Won'
  if (outcome === 'push') return 'Push'
  return 'Lost'
}
