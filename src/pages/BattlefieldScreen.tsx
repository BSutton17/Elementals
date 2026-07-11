import { BattlefieldView } from '../components/BattlefieldView'
import { useLobby } from '../game/useLobby'
import { useGameState } from '../game/useGameState'

/** Battlefield container: joins the lobby roster with the live synchronized
 *  gameplay state and hands both to the renderer (tickets #192–#199). */
export function BattlefieldScreen() {
  const { match, youId } = useLobby()
  const game = useGameState()
  if (!match) return null
  return <BattlefieldView match={match} youId={youId} players={game.players} />
}
