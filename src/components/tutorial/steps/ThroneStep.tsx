import { FaCrown } from 'react-icons/fa'
import { TutorialStep } from '../TutorialStep'
import { KINGDOMS } from '../../../game/kingdoms'
import { MAX_ACTIVE_PLAYERS, MIN_PLAYERS_TO_START } from '../../../game/lobby'
import { KINGDOM_ICONS } from '../kingdomIcons'
import { inkFor, outlineFor } from '../../../game/contrast'

// Page 1 — the hook. Every element in the game circles one throne.
//
// The ring is built from KINGDOMS itself and the icons come from the shared
// map, so adding a kingdom puts it in the orbit with a face automatically. The
// COUNT in the title is derived for the same reason — it read "Ten Kingdoms"
// for a while after there were thirteen.

/**
 * How long the pulse takes to travel all the way round the ring, in seconds.
 *
 * The per-orb delay is derived from this and the roster size, so the wave
 * always makes exactly ONE lap per cycle however many kingdoms there are. It
 * used to be a flat 0.35s per orb, which was tuned when the ring was much
 * smaller — at thirteen that overshot the cycle and the wave lapped itself,
 * reading as a fast flicker rather than a travelling pulse.
 */
const ORBIT_WAVE_SECONDS = 5.2

/** Spelled-out count, so the headline never disagrees with the ring below it. */
const COUNT_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
]

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n)
}

export function ThroneStep() {
  return (
    <TutorialStep
      kicker="Welcome to Elementals"
      title={`${countWord(KINGDOMS.length)} Kingdoms. One Throne.`}
      lead="Every match is a free-for-all between elemental kingdoms. Alliances are temporary. Grudges are forever. The last castle standing takes the throne."
    >
      <div
        className="howto-orbit"
        aria-hidden="true"
        style={{ '--orb-cycle': `${ORBIT_WAVE_SECONDS}s` } as React.CSSProperties}
      >
        <span className="howto-orbit__crown">
          <FaCrown />
        </span>
        {KINGDOMS.map((k, i) => {
          const Icon = KINGDOM_ICONS[k.id]
          const angle = (360 / KINGDOMS.length) * i
          return (
            <span
              key={k.id}
              className="howto-orbit__orb"
              style={
                {
                  '--orb-color': k.color,
                  '--orb-ink': inkFor(k.color),
                  '--orb-outline': outlineFor(k.color),
                  '--orb-angle': `${angle}deg`,
                  // One lap per cycle, spread across however many kingdoms
                  // there are — never a fixed step that can outrun the cycle.
                  '--orb-delay': `${(i / KINGDOMS.length) * ORBIT_WAVE_SECONDS}s`,
                } as React.CSSProperties
              }
            >
              <Icon />
            </span>
          )
        })}
      </div>
      <p className="howto-step__footnote">
        {MIN_PLAYERS_TO_START}–{MAX_ACTIVE_PLAYERS} players. Real time. No second place.
      </p>
    </TutorialStep>
  )
}
