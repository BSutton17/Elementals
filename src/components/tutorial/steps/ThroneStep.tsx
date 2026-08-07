import { FaCrown } from 'react-icons/fa'
import { TutorialStep } from '../TutorialStep'
import { KINGDOMS } from '../../../game/kingdoms'
import { MAX_ACTIVE_PLAYERS, MIN_PLAYERS_TO_START } from '../../../game/lobby'
import { KINGDOM_ICONS } from '../../../game/kingdomIcons'
import { inkFor, outlineFor } from '../../../game/contrast'

// Page 1 — the hook. Every element in the game circles one throne.
//
// The ring is built from KINGDOMS itself and the icons come from the shared
// map, so adding a kingdom puts it in the orbit with a face automatically. The
// COUNT in the title is derived for the same reason — it read "Ten Kingdoms"
// for a while after there were thirteen.

/**
 * Gap between one orb lighting up and the next — the wave's travel SPEED, kept
 * at its original value regardless of how many kingdoms are on the ring.
 */
const ORB_STEP_SECONDS = 0.35

/**
 * How often the wave fires. Each orb pulses (the original 2.6s shape) and then
 * rests until the next pass, rather than shimmering continuously.
 *
 * The rest is what stops thirteen orbs reading as constant flicker: at a 0.35s
 * step the lap takes 4.2s, so without a pause between passes the tail of one
 * wave runs into the head of the next.
 */
const ORBIT_CYCLE_SECONDS = 4

/**
 * How much of the cycle the pulse itself occupies; the remainder is the rest.
 * The keyframes in HowToPlay.css encode this as literal percentages (32.5% and
 * 65%) because CSS forbids `var()` in a keyframe offset — a test keeps the two
 * from drifting apart.
 */
export const PULSE_FRACTION = 2.6 / ORBIT_CYCLE_SECONDS

/** Exported for that test. */
export const ORBIT_TIMING = {
  stepSeconds: ORB_STEP_SECONDS,
  cycleSeconds: ORBIT_CYCLE_SECONDS,
}

/** Spelled-out count, so the headline never disagrees with the ring below it. */
const COUNT_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
]

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n)
}

export function ThroneStep() {
  return (
    <TutorialStep
      kicker="Welcome to Elementals"
      title={`${countWord(KINGDOMS.length)} Kingdoms. One Throne.`}
      lead="Every match is a free-for-all between elemental kingdoms. The last castle standing takes the throne."
    >
      <div
        className="howto-orbit"
        aria-hidden="true"
        style={
          { '--orb-cycle': `${ORBIT_CYCLE_SECONDS}s` } as React.CSSProperties
        }
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
                  // A constant step, so the wave travels at the same speed
                  // whatever the roster size.
                  '--orb-delay': `${i * ORB_STEP_SECONDS}s`,
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
