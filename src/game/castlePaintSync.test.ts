import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyStateSync,
  setCastlePaints,
  clearGameState,
  getGameState,
  type GamePlayer,
} from './gameState'

/**
 * Skins have to survive the gameplay sync.
 *
 * ⚠️ THIS IS THE BUG THAT MADE EVERY CASTLE STANDARD. Paint is resolved by the
 * server and delivered on the rosters — `match:started` and `state:full` — but
 * the live channel is `state:sync`, which is built from the engine's
 * PlayerState, carries no cosmetics, and REPLACES the whole player list twenty
 * times a second. So a skin arrived once and was wiped 50ms later. Bots showed
 * standard castles, and so did every player's own equipped skin; it was only
 * ever visible in the shop, which reads the catalogue directly.
 *
 * The odds test and the snapshot test both passed throughout, because neither
 * of them goes anywhere near the channel the battlefield actually renders from.
 */

const player = (id: string): GamePlayer =>
  ({
    id,
    name: id,
    kingdomId: 'fire',
    castle: { hp: 100, maxHp: 100, shield: 0 },
    economy: { gold: 0, citizens: 0 },
    target: null,
    eliminated: false,
  }) as unknown as GamePlayer

const sync = (players: GamePlayer[]) =>
  applyStateSync({ tick: 1, serverTime: 0, players })

describe('castle paint across the gameplay sync', () => {
  beforeEach(() => clearGameState())

  it('survives a sync that carries no paint of its own', () => {
    setCastlePaints([{ id: 'bot-1', castlePaint: { decor: 'fire.phoenix', accent: '#fff' } }])

    sync([player('bot-1'), player('p2')])

    const [bot, human] = getGameState().players
    expect(bot!.castlePaint?.decor).toBe('fire.phoenix')
    expect(human!.castlePaint).toBeUndefined()
  })

  it('still holds after many syncs', () => {
    setCastlePaints([{ id: 'bot-1', castlePaint: { decor: 'water.leviathan' } }])
    for (let i = 0; i < 25; i++) sync([player('bot-1')])
    expect(getGameState().players[0]!.castlePaint?.decor).toBe('water.leviathan')
  })

  it('applies to players already on screen when the roster arrives late', () => {
    // state:full can land after the first syncs on a reconnect.
    sync([player('bot-1')])
    expect(getGameState().players[0]!.castlePaint).toBeUndefined()

    setCastlePaints([{ id: 'bot-1', castlePaint: { decor: 'ice.crown' } }])
    expect(getGameState().players[0]!.castlePaint?.decor).toBe('ice.crown')
  })

  it('a roster without paint does not wipe a skin already known', () => {
    setCastlePaints([{ id: 'bot-1', castlePaint: { decor: 'time.eternal' } }])
    setCastlePaints([{ id: 'bot-1' }, { id: 'p2' }])
    sync([player('bot-1')])
    expect(getGameState().players[0]!.castlePaint?.decor).toBe('time.eternal')
  })

  it('is forgotten when the match is left', () => {
    setCastlePaints([{ id: 'bot-1', castlePaint: { decor: 'space.nexus' } }])
    clearGameState()
    sync([player('bot-1')])
    expect(getGameState().players[0]!.castlePaint).toBeUndefined()
  })
})
