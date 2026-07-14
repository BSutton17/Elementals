// Client mirror of the server's gameplay events (Epic 9 VFX transport). The
// server forwards its authoritative EventBus over Socket.IO as `evt:batch`; the
// Pixi layer visualizes these and never derives gameplay from them.
//
// Only the events the renderer currently consumes are typed here; the wire
// carries every event type, and unhandled ones pass through as RawGameEvent and
// are ignored. Add typed interfaces as later ability tickets visualize more.

export interface AbilityCastEvent {
  type: 'abilityCast'
  tick: number
  casterId: string
  abilityId: string
  targetIds: string[]
  cost: number
  chargesUsed?: number
}

export interface DamageEvent {
  type: 'damage'
  tick: number
  sourceId: string
  targetId: string
  amount: number
  dealtToHp: number
  overkill: number
  crit: boolean
  element?: string
  cause: string
}

export interface EliminatedEvent {
  type: 'eliminated'
  tick: number
  playerId: string
}

/** Any event as it arrives on the wire; decoded to a typed shape per handler. */
export type RawGameEvent = { type: string; tick: number } & Record<string, unknown>
