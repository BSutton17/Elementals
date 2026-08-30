import { LobbyView } from '../components/LobbyView'
import { useLobby } from '../game/useLobby'
import { useIsAdmin } from '../game/adminStore'
import {
  addBot,
  leaveRoom,
  removeBot,
  setBotDifficulty,
  selectKingdom,
  selectPerks,
  setRoomRules,
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
  const isAdmin = useIsAdmin()
  if (!match) return null

  return (
    <LobbyView
      match={match}
      youId={youId}
      onToggleReady={() => void toggleReady()}
      onSelectKingdom={(k) => void selectKingdom(k)}
      onSelectPerks={(p) => void selectPerks(p)}
      onSetRules={(rules) => void setRoomRules(rules)}
      isAdmin={isAdmin}
      onSpectate={() => void spectate()}
      onStart={() => void startMatch()}
      onLeave={() => void leaveRoom()}
      onAddBot={(d) => void addBot(d)}
      onSetBotDifficulty={(id, d) => void setBotDifficulty(id, d)}
      onRemoveBot={(id) => void removeBot(id)}
    />
  )
}
