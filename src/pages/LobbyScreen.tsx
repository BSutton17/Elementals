import { LobbyView } from '../components/LobbyView'
import { useLobby } from '../game/useLobby'
import {
  leaveRoom,
  selectKingdom,
  selectPerks,
  setEliminatedSeeAllHealth,
  spectate,
  startMatch,
  toggleReady,
} from '../game/lobbyStore'

/**
 * Lobby container: wires the socket-backed lobby store to the presentational
 * LobbyView. Re-renders automatically on the server's `lobby:updated` broadcast.
 */
export function LobbyScreen() {
  const { match, youId } = useLobby()
  if (!match) return null

  return (
    <LobbyView
      match={match}
      youId={youId}
      onToggleReady={() => void toggleReady()}
      onSelectKingdom={(k) => void selectKingdom(k)}
      onSelectPerks={(p) => void selectPerks(p)}
      onSetEliminatedSeeAllHealth={(on) => void setEliminatedSeeAllHealth(on)}
      onSpectate={() => void spectate()}
      onStart={() => void startMatch()}
      onLeave={() => void leaveRoom()}
    />
  )
}
