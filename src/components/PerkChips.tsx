import { perkDescription, resolvePerks } from '../game/perks'
import './PerkChips.css'

// The perks you locked in at the lobby, pinned to the top-left of the HUD.
//
// Perks are always-on and silent — they change attack, damage taken, cooldowns,
// income and shield health without ever announcing themselves. Ten minutes into
// a match it is easy to forget which two you took, and that matters: whether
// you picked Sharper Swords or Extra Guards changes how a trade will go. So
// they sit next to the numbers they alter rather than in a menu.

export function PerkChips({
  perks,
  seats,
}: {
  perks?: readonly string[]
  /** Seats in the match, so Better Construction's tooltip shows what the perk
   *  is actually worth at this table rather than its duel value. */
  seats?: number
}) {
  const resolved = resolvePerks(perks as string[] | undefined)
  if (resolved.length === 0) return null

  return (
    <div className="perk-chips" data-testid="perk-chips">
      {resolved.map((perk) => (
        <span
          key={perk.id}
          className="perk-chips__chip"
          style={{ '--perk': perk.color } as React.CSSProperties}
          // Hover for the full effect; the icon alone carries it at a glance.
          title={`${perk.name} — ${perkDescription(perk, seats)}`}
          data-testid={`perk-chip-${perk.id}`}
        >
          <span className="perk-chips__icon" aria-hidden="true">
            <perk.icon />
          </span>
          <span className="perk-chips__name">{perk.name}</span>
        </span>
      ))}
    </div>
  )
}
