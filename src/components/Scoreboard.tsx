import { getKingdomTheme } from '../game/kingdomThemes'
import type { MatchResult } from '../game/lobby'
import './Scoreboard.css'

/**
 * The end-of-match scoreboard.
 *
 * Before this, fifteen minutes of play produced one word — VICTORY or DEFEAT.
 * This is the record of what everyone actually did.
 *
 * Ordered by placement, because that is the result. Damage is the headline
 * number because it is the one players compare out loud; gold and casts sit
 * behind it as supporting detail rather than competing for attention.
 */

const nf = new Intl.NumberFormat()

/** "4m 12s" — a duration people read, not a tick count. */
function duration(ticks: number, tickRate: number): string {
  const seconds = Math.max(0, Math.round(ticks / Math.max(1, tickRate)))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

/** 1st, 2nd, 3rd, 4th… */
function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

export function Scoreboard({ result, youId }: { result: MatchResult; youId: string | null }) {
  return (
    <div className="scoreboard">
      <div className="scoreboard__meta">
        <span>{duration(result.durationTicks, result.tickRate)}</span>
        <span aria-hidden="true">·</span>
        <span>
          {result.playerCount} {result.playerCount === 1 ? 'kingdom' : 'kingdoms'}
        </span>
      </div>

      <div className="scoreboard__scroll">
        <table className="scoreboard__table">
          <caption className="scoreboard__caption">Final standings</caption>
          <thead>
            <tr>
              <th scope="col" className="scoreboard__rank-h">
                #
              </th>
              <th scope="col">Kingdom</th>
              <th scope="col" className="num">
                Damage
              </th>
              <th scope="col" className="num">
                Taken
              </th>
              <th scope="col" className="num">
                Gold
              </th>
              <th scope="col" className="num">
                Casts
              </th>
            </tr>
          </thead>
          <tbody>
            {result.participants.map((p) => {
              const theme = getKingdomTheme(p.kingdomId)
              const isYou = p.playerId === youId
              return (
                <tr
                  key={p.playerId}
                  className={`scoreboard__row${isYou ? ' scoreboard__row--you' : ''}`}
                >
                  <td className="scoreboard__rank">{ordinal(p.placement)}</td>
                  <td className="scoreboard__who">
                    {/* Colour carries the kingdom, but never alone — the name
                        is always written out beside it. */}
                    <span
                      className="scoreboard__swatch"
                      style={{ background: theme?.primary ?? '#6b7385' }}
                      aria-hidden="true"
                    />
                    <span className="scoreboard__name">
                      {p.name}
                      {isYou && <span className="scoreboard__you"> (you)</span>}
                      {p.isBot && <span className="scoreboard__bot"> BOT</span>}
                    </span>
                    <span className="scoreboard__kingdom">{theme?.name ?? '—'}</span>
                  </td>
                  <td className="num">{nf.format(p.stats.damageDealt)}</td>
                  <td className="num">{nf.format(p.stats.damageTaken)}</td>
                  <td className="num">{nf.format(Math.round(p.stats.goldEarned))}</td>
                  <td className="num">{nf.format(p.stats.abilitiesCast)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
