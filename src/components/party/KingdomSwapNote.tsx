import { KINGDOM_THEMES } from '../../game/kingdomThemes'
import { KINGDOM_ICONS } from '../../game/kingdomIcons'
import type { PartySnapshot } from '../../game/party'

/**
 * Whose abilities you are holding, and for how long.
 *
 * ⚠️ IT SAYS ITS PIECE AND LEAVES. Kingdom Swap runs for thirty seconds and is
 * meant to be PLAYED — a panel sitting over the board for half a minute would
 * be the opposite of what the swap is for. This shows the hand-over, then the
 * stage dismisses it and the player goes and uses the kit; the ability bar has
 * already changed underneath, because the server sends the borrowed one.
 */
export function KingdomSwapNote({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const borrowed = mine?.data.borrowedFrom as string | null | undefined
  const label = (mine?.data.borrowedLabel as string | undefined) ?? borrowed

  if (!borrowed) {
    // A table of one has nobody to swap with — say so rather than showing an
    // empty card.
    return (
      <div className="party-swap">
        <p className="party-swap__line">Nobody to swap with.</p>
      </div>
    )
  }

  const theme = KINGDOM_THEMES[borrowed as keyof typeof KINGDOM_THEMES]
  const Icon = KINGDOM_ICONS[borrowed as keyof typeof KINGDOM_ICONS]

  return (
    <div className="party-swap">
      <p className="party-swap__lead">You now have</p>
      <div className="party-swap__crest" style={{ color: theme?.primary ?? '#ece7fb' }}>
        {Icon && <Icon className="party-swap__icon" aria-hidden />}
        <span className="party-swap__kingdom" data-testid="swap-kingdom">
          {label}
        </span>
      </div>
      <p className="party-swap__line">…abilities for 30 seconds.</p>
      <p className="party-swap__note">
        Your castle, gold and health are your own — only the kit changed.
      </p>
    </div>
  )
}
