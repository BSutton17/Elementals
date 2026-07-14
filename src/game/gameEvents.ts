import { socket } from '../sockets/socket'
import type { RawGameEvent } from './events'

// Transient gameplay-event stream (Epic 9). Unlike `gameState` (a mirrored
// snapshot store), events are one-shot signals for the Pixi VFX layer, so this
// is a plain fan-out pub/sub rather than React state — no re-render churn.

type Handler = (events: RawGameEvent[], tick: number) => void

const handlers = new Set<Handler>()

/** Subscribe to authoritative gameplay-event batches. Returns an unsubscribe. */
export function onGameEvents(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

/** Dispatches a received batch. Exported so tests can drive it without a socket. */
export function applyEventBatch(payload: { tick: number; events: RawGameEvent[] }): void {
  for (const handler of handlers) handler(payload.events, payload.tick)
}

socket.on('evt:batch', applyEventBatch)
