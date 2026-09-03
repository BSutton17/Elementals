import { partyAct, type PartySnapshot } from '../../game/party'
import { countdownSeconds } from './countdown'

/**
 * Keep or steal.
 *
 * ⚠️ NOBODY ELSE'S CHOICE IS ON THIS SCREEN, AND IT CANNOT BE. The server holds
 * every pick back until the whole table has committed, so what is shown here is
 * only how many kingdoms have DECIDED — never what they decided. That count is
 * itself part of the game: watching four of six commit is pressure, and it
 * gives away nothing.
 */
export function KingdomThiefGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const chosen = mine?.data.choice as 'keep' | 'steal' | null | undefined
  const done = mine?.done ?? false
  const seconds = countdownSeconds(party.ticksRemaining)

  const total = Object.keys(party.players).length
  const committed = Object.values(party.players).filter((p) => p.done).length

  if (done) {
    const defaulted = mine?.data.defaulted === true
    return (
      <div className="party-thief party-thief--waiting">
        <p className="party-thief__locked" data-testid="thief-locked">
          {chosen === 'steal' ? 'You chose to STEAL' : 'You chose to KEEP'}
        </p>
        {defaulted && (
          // Said plainly: a player who ran out of time must not think they
          // picked this.
          <p className="party-thief__note">Time ran out — you kept by default.</p>
        )}
        <p className="party-thief__count">
          {committed} of {total} kingdoms have decided
        </p>
      </div>
    )
  }

  return (
    <div className="party-thief">
      {seconds !== null && (
        <p className="party-thief__clock" data-testid="thief-clock">
          {seconds}
        </p>
      )}

      <div className="party-thief__options">
        <button
          type="button"
          className="party-thief__option party-thief__option--keep"
          data-testid="thief-keep"
          onClick={() => void partyAct({ type: 'choose', choice: 'keep' })}
        >
          <span className="party-thief__word">KEEP</span>
          <span className="party-thief__hint">
            If everyone keeps, everyone takes 1,000 gold
          </span>
        </button>

        <button
          type="button"
          className="party-thief__option party-thief__option--steal"
          data-testid="thief-steal"
          onClick={() => void partyAct({ type: 'choose', choice: 'steal' })}
        >
          <span className="party-thief__word">STEAL</span>
          <span className="party-thief__hint">
            2,000 gold — unless everybody steals, and everybody bleeds
          </span>
        </button>
      </div>

      <p className="party-thief__count" data-testid="thief-committed">
        {committed} of {total} kingdoms have decided
      </p>
    </div>
  )
}
