import { BattlefieldView } from '../components/BattlefieldView'
import { HackOverlay } from '../components/HackOverlay'
import { FogOverlay } from '../components/FogOverlay'
import { BlizzardOverlay } from '../components/BlizzardOverlay'
import { useLobby } from '../game/useLobby'
import { useGameState } from '../game/useGameState'

/** Battlefield container: joins the lobby roster with the live synchronized
 *  gameplay state and hands both to the renderer (tickets #192–#199). */
export function BattlefieldScreen() {
  const { match, youId } = useLobby()
  const game = useGameState()
  if (!match) return null
  // Thick Fog blinds only its victim: the local player carries the `vision:fog`
  // status (synced state) → their own screen fogs over. Nature's Toxic Gas
  // (status `toxicGas`) does the same in green, and each lasts its own duration.
  const you = game.players.find((p) => p.id === youId)
  const fogged = you?.statuses?.some((s) => s.id === 'vision:fog') ?? false
  const gassed = you?.statuses?.some((s) => s.id === 'toxicGas') ?? false
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
    </>
  )
}
