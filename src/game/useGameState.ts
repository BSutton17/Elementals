import { useSyncExternalStore } from 'react'
import { getGameState, subscribeGame, type GameState } from './gameState'

/** Subscribe a component to the live gameplay state (`state:sync`). */
export function useGameState(): GameState {
  return useSyncExternalStore(subscribeGame, getGameState, getGameState)
}
