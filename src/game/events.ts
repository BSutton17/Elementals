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
  /**
   * Attacks Air's wind passive turned aside (Epic 9). Each entry maps the Air
   * castle that intercepted the shot (`via`) to where it was hurled instead
   * (`to`, also present in `targetIds`). Absent when nothing was redirected.
   */
  redirects?: { via: string; to: string }[]
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
  /** A decoy number that didn't actually land (Love's "Love Galore" stealth
   *  phase): shown to everyone EXCEPT the bearer, who wasn't really hurt. */
  phantom?: boolean
}

export interface ResourceTransferEvent {
  type: 'resourceTransfer'
  tick: number
  fromId: string
  toId: string
  resource: 'currency' | 'citizens'
  amount: number
  cause: string
}

export interface HealEvent {
  type: 'heal'
  tick: number
  targetId: string
  /** HP actually restored (effective healing). */
  amount: number
  /** Requested healing wasted because the castle was near full. */
  overheal: number
  cause: string
}

export interface StatusAppliedEvent {
  type: 'statusApplied'
  tick: number
  targetId: string
  sourceId: string
  statusId: string
  durationTicks: number
  stacks: number
}

export interface StatusExpiredEvent {
  type: 'statusExpired'
  tick: number
  playerId: string
  statusId: string
}

export interface StatusRevealedEvent {
  type: 'statusRevealed'
  tick: number
  /** The bearer whose two-phase status (Love's "Love Galore") just revealed. */
  playerId: string
  statusId: string
}

export interface StatusTickEvent {
  type: 'statusTick'
  tick: number
  playerId: string
  statusId: string
  /** The bearer avoided this interval's damage by landing a damaging attack —
   *  the countdown reset instead (Father Time's Mark). */
  interrupted: boolean
}

export interface AttackUndoneEvent {
  type: 'attackUndone'
  tick: number
  /** The Time kingdom whose last incoming attack was rewound. */
  playerId: string
  /** Attacker + ability of the undone attack (for the travel-attack rewind). */
  sourceId: string
  abilityId: string
  removedStatusIds: string[]
}

export interface ShieldDestroyedEvent {
  type: 'shieldDestroyed'
  tick: number
  playerId: string
  cause: string
}

export interface EliminatedEvent {
  type: 'eliminated'
  tick: number
  playerId: string
}

export interface SupernovaFiredEvent {
  type: 'supernovaFired'
  tick: number
  /** The Space kingdom that fired. */
  playerId: string
  /** Who it hit. */
  targetId: string
  /** Charge level (1–3) — scales the whole battlefield sequence. */
  level: number
}

export interface AttackMissedEvent {
  type: 'attackMissed'
  tick: number
  /** The belted defender the attack whiffed against. */
  playerId: string
  attackerId: string
  abilityId: string
  cause: string
}

/** Joker drew a Blackjack card. Fires on CAST; the damage lands later, when
 *  the card's cinematic delivers it. */
export interface CardDrawnEvent {
  type: 'cardDrawn'
  tick: number
  /** The Joker kingdom that drew. */
  playerId: string
  abilityId: string
  /** The card's label — "2".."10", "Ace", "Jack", "Queen", "King", "Joker". */
  card: string
  /** The suit drawn, or null for a joker. Decides the pip on the reveal and
   *  the rider the card leaves behind. */
  suit?: string | null
  /** Pre-pipeline damage the card rolled (display only). */
  damage: number
}

/** Joker's Lucky Draw landed a face. `outcome` names it (a status id, or
 *  "shield"/"heal"); null can only appear if the odds are ever made uncertain. */
export interface LuckyDrawEvent {
  type: 'luckyDraw'
  tick: number
  playerId: string
  abilityId: string
  outcome: string | null
}

export interface BlackHoleOpenedEvent {
  type: 'blackHoleOpened'
  tick: number
  /** The Space kingdom that opened it. */
  playerId: string
  durationTicks: number
}

export interface BlackHoleAbsorbedEvent {
  type: 'blackHoleAbsorbed'
  tick: number
  ownerId: string
  /** Whose attack it swallowed. */
  attackerId: string
  amount: number
}

export interface BlackHoleCollapsedEvent {
  type: 'blackHoleCollapsed'
  tick: number
  ownerId: string
  /** The kingdom the stored damage dumps onto, or null if nobody fed it. */
  victimId: string | null
  amount: number
}

/**
 * A delayed strike has been armed and is hanging over the field (Light's Light
 * Show). The warning is PUBLIC and is half the ability — `resolveTick` is when
 * it comes down, which is what the countdown cinematic runs against.
 */
export interface StrikeIncomingEvent {
  type: 'strikeIncoming'
  tick: number
  /** The caster — the one kingdom the strike will spare. */
  ownerId: string
  abilityId: string
  /** The tick the strike lands on. */
  resolveTick: number
}

/**
 * A status was turned away before it could land — Light's Fireflies bouncing
 * off a shield. Announced so the cast doesn't look like it simply did nothing,
 * and so the defender learns their shield is what saved them.
 */
export interface StatusRepelledEvent {
  type: 'statusRepelled'
  tick: number
  /** The kingdom that shrugged it off. */
  playerId: string
  sourceId: string
  statusId: string
  abilityId: string
  /** What repelled it — currently always 'shield'. */
  cause: string
}

/** Any event as it arrives on the wire; decoded to a typed shape per handler. */
export type RawGameEvent = { type: string; tick: number } & Record<string, unknown>
