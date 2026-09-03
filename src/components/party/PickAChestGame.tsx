import { GiTreasureMap, GiOpenChest, GiChest } from 'react-icons/gi'
import { partyAct, type PartySnapshot } from '../../game/party'
import { countdownSeconds } from './countdown'

/**
 * Pick a chest.
 *
 * ⚠️ WHAT IS INSIDE IS NOT ON THIS SIDE. The server holds all three prizes and
 * sends back only what THIS player opened — so there is nothing here to read
 * ahead, and the two chests left unopened stay shut forever. That is also why
 * the unopened ones are never revealed afterwards: knowing you dodged the trap
 * turns a clean loss into a taunt, and knowing you missed the big one turns a
 * win into a regret.
 */

const PRIZE_WORD: Record<string, string> = {
  big: '+500 gold',
  small: '+150 gold',
  trap: '−2,000 gold',
}

export function PickAChestGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const picked = mine?.data.picked as number | null | undefined
  const prize = mine?.data.prize as string | null | undefined
  const owed = mine?.data.owed as number | undefined
  const done = mine?.done ?? false
  const seconds = countdownSeconds(party.ticksRemaining)

  if (done && prize) {
    const good = prize !== 'trap'
    return (
      <div className={`party-chest party-chest--${good ? 'good' : 'bad'}`}>
        <GiOpenChest className="party-chest__opened" aria-hidden />
        <p className="party-chest__prize" data-testid="chest-prize">
          {PRIZE_WORD[prize] ?? prize}
        </p>
        {mine?.data.defaulted === true && (
          <p className="party-chest__note">Time ran out — a chest was picked for you.</p>
        )}
        {owed !== undefined && owed > 0 && (
          <p className="party-chest__note" data-testid="chest-owed">
            {Math.round(owed).toLocaleString()} more than you had — your production pays it off.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="party-chest">
      <div className="party-chest__head">
        <GiTreasureMap className="party-chest__map" aria-hidden />
        {seconds !== null && (
          <span className="party-chest__clock" data-testid="chest-clock">
            {seconds}
          </span>
        )}
      </div>

      <div className="party-chest__row">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            type="button"
            className={`party-chest__one${picked === index ? ' party-chest__one--picked' : ''}`}
            data-testid={`chest-${index}`}
            onClick={() => void partyAct({ type: 'open', index })}
            aria-label={`Chest ${index + 1}`}
          >
            <GiChest className="party-chest__icon" aria-hidden />
          </button>
        ))}
      </div>

      <p className="party-chest__odds">One is generous. One is stingy. One bites.</p>
    </div>
  )
}
