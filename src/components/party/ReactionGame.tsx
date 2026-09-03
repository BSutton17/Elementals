import { partyAct, type PartySnapshot } from '../../game/party'

/**
 * Click when the button turns green.
 *
 * ⚠️ THE BUTTON'S COLOUR COMES OFF THE WIRE, NOT OFF A TIMER HERE. The server
 * sends a boolean that flips when it says so, and never the moment it will flip
 * at — hand a client the deadline and the game becomes a one-line script, in a
 * minigame that deals two thousand damage.
 *
 * That also makes the race fair in the only way it can be: everybody learns on
 * the same broadcast rather than each running their own countdown.
 */
export function ReactionGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const green = party.shared.green === true
  const mine = youId ? party.players[youId] : undefined
  const done = mine?.done ?? false
  const jumped = mine?.data.jumped === true
  const reactionTicks = mine?.data.reactionTicks as number | undefined

  if (done) {
    return (
      <div className={`party-react party-react--${jumped ? 'jumped' : 'clicked'}`}>
        <p className="party-react__verdict">{jumped ? 'Too early!' : 'Clicked'}</p>
        {!jumped && reactionTicks !== undefined && (
          <p className="party-react__time" data-testid="reaction-time">
            {(reactionTicks / 20).toFixed(2)}s
          </p>
        )}
        <p className="party-react__note">
          {jumped
            ? 'You jumped the gun — that one cost you.'
            : 'Last kingdom to click takes the hit.'}
        </p>
      </div>
    )
  }

  return (
    <div className="party-react">
      <button
        type="button"
        className={`party-react__button${green ? ' party-react__button--go' : ''}`}
        onPointerDown={() => void partyAct({ type: 'click' })}
        data-testid="reaction-button"
        data-green={green || undefined}
        // ⚠️ NOT `disabled` BEFORE IT TURNS. Clicking early is a MOVE — it is how
        // you lose — so the button has to accept the press and let the server
        // judge it. A disabled button would quietly protect the player from the
        // rule the game is built on.
        aria-label={green ? 'Click now' : 'Wait for green'}
      >
        {green ? 'CLICK!' : 'WAIT…'}
      </button>
    </div>
  )
}
