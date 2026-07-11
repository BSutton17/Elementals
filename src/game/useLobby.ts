import { useSyncExternalStore } from 'react'
import { getLobbyState, subscribeLobby, type MatchState } from './lobbyStore'

/** Subscribe a component to the match store. Actions live in `lobbyStore`. */
export function useLobby(): MatchState {
  return useSyncExternalStore(subscribeLobby, getLobbyState, getLobbyState)
}
