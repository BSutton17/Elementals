import { BattlefieldView } from '../components/BattlefieldView'
import { HackOverlay } from '../components/HackOverlay'
import { FogOverlay } from '../components/FogOverlay'
import { BlizzardOverlay } from '../components/BlizzardOverlay'
import { ScrambleOverlay } from '../components/scramble/ScrambleOverlay'
import { FatherTimeOverlay } from '../components/fatherTime/FatherTimeOverlay'
import { BlipOverlay } from '../components/blip/BlipOverlay'
import { BackToTheFutureOverlay } from '../components/backToTheFuture/BackToTheFutureOverlay'
import { useLobby } from '../game/useLobby'
import { useGameState } from '../game/useGameState'

/** Battlefield container: joins the lobby roster with the live synchronized
 *  gameplay state and hands both to the renderer (tickets #192–#199). */
export function BattlefieldScreen() {
  const { match, youId } = useLobby()
  const game = useGameState()
  if (!match) return null
  // Spectators watch the full battlefield with no UI: no controls and none of
  // the victim-only screen overlays (they have no castle to be afflicted).
  const spectator = match.players.find((p) => p.id === youId)?.spectator === true
  if (spectator) {
    return (
      <BattlefieldView match={match} youId={youId} players={game.players} spectator />
    )
  }
  // Thick Fog blinds only its victim: the local player carries the `vision:fog`
  // status (synced state) → their own screen fogs over. Nature's Toxic Gas
  // (status `toxicGas`) does the same in green, and each lasts its own duration.
  const you = game.players.find((p) => p.id === youId)
  const fogged = you?.statuses?.some((s) => s.id === 'vision:fog') ?? false
  const gassed = you?.statuses?.some((s) => s.id === 'toxicGas') ?? false
  // Time's Half Past 12 scrambles ONLY its victim's interface (status
  // `scrambled`) for its duration — a local, cosmetic temporal-instability layer.
  const scrambled = you?.statuses?.some((s) => s.id === 'scrambled') ?? false
  // Time's Father Time marks its victim (`fatherTimeMark`): the pressure overlay
  // hovers a counting clock and escalates until they attack or the mark ends.
  const fatherTimeMarked = you?.statuses?.some((s) => s.id === 'fatherTimeMark') ?? false
  // Time's Back to the Future (`goldRewind`): a giant backward clock while the
  // victim's treasury is being rewound.
  const goldRewinding = you?.statuses?.some((s) => s.id === 'goldRewind') ?? false
  // Blizzard is a GLOBAL weather event: the storm covers every player's screen
  // for as long as any kingdom carries the `blizzard` status.
  const blizzard = game.players.some((p) => p.statuses?.some((s) => s.id === 'blizzard'))
  return (
    <>
      <BattlefieldView match={match} youId={youId} players={game.players} />
      {/* Full-screen "you've been hacked" flash for the local victim. */}
      <HackOverlay youId={youId} />
      {/* Full-screen haze while the local player is blinded by Thick Fog (grey)
          or choking in Nature's Toxic Gas (green) — independent, own durations. */}
      <FogOverlay active={fogged} />
      <FogOverlay active={gassed} variant="toxic" />
      {/* Global arctic storm — every screen, whenever a Blizzard is raging. */}
      <BlizzardOverlay active={blizzard} />
      {/* Victim-only temporal scramble while Half Past 12's `scrambled` holds. */}
      <ScrambleOverlay active={scrambled} />
      {/* Victim-only Father Time pressure while `fatherTimeMark` holds. */}
      <FatherTimeOverlay active={fatherTimeMarked} youId={youId} />
      {/* Blip! rewind flourish when the local Time kingdom undoes an attack. */}
      <BlipOverlay youId={youId} />
      {/* Back to the Future: giant backward clock while your gold is rewound. */}
      <BackToTheFutureOverlay active={goldRewinding} />
    </>
  )
}
