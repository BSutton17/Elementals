import { FaAngleDoubleUp, FaAngleDoubleDown } from 'react-icons/fa'
import { KINGDOM_ICONS } from '../game/kingdomIcons'
import { getKingdomTheme } from '../game/kingdomThemes'
import { strongAgainst, weakAgainst, kingdomName } from '../game/elementalCycle'
import type { KingdomId } from '../game/kingdoms'
import './MatchupBadge.css'

/**
 * Who you beat and who beats you, under the kingdom name.
 *
 * ⚠️ ONLY WHEN THE RULE IS ON. Every kingdom has a matchup in the rings all the
 * time; it only MEANS anything while "Elemental's Elementaled" is running.
 * Showing it in an ordinary match would be advertising a mechanic that is not
 * in play, which is worse than showing nothing.
 *
 * ⚠️ AND IT NAMES THE KINGDOM, NOT JUST THE DIRECTION. An up arrow on its own
 * tells a player they are strong at something without saying what — useless in
 * the two seconds they have to pick a target. The whole point of the badge is
 * answering "who should I be hitting", so it leads with the kingdom's own icon
 * and colour, which is how every other kingdom is identified on this screen.
 */
export function MatchupBadge({ kingdomId }: { kingdomId: string | null }) {
  const strong = strongAgainst(kingdomId)
  const weak = weakAgainst(kingdomId)
  if (!strong && !weak) return null

  const row = (
    id: string | null,
    kind: 'strong' | 'weak',
    Arrow: typeof FaAngleDoubleUp,
    label: string,
  ) => {
    if (!id) return null
    const Icon = KINGDOM_ICONS[id as KingdomId]
    const theme = getKingdomTheme(id)
    return (
      <span
        className={`matchup__row matchup__row--${kind}`}
        data-testid={`matchup-${kind}`}
        // Read out in full, because the visual version is an arrow and two
        // icons — which says nothing at all to a screen reader.
        aria-label={`${label} ${kingdomName(id)}`}
      >
        <Arrow className="matchup__arrow" aria-hidden />
        {Icon && (
          <Icon
            className="matchup__kingdom-icon"
            style={{ color: theme?.primary }}
            aria-hidden
          />
        )}
        <span className="matchup__kingdom">{kingdomName(id)}</span>
      </span>
    )
  }

  return (
    <div className="matchup" data-testid="matchup-badge">
      {row(strong, 'strong', FaAngleDoubleUp, 'Strong against')}
      {row(weak, 'weak', FaAngleDoubleDown, 'Weak against')}
    </div>
  )
}
