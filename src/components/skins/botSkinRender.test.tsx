import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { socket } from '../../sockets/socket'
import { BattlefieldView } from '../BattlefieldView'
import { clearGameState } from '../../game/gameState'
import { useGameState } from '../../game/useGameState'
import '../../game/lobbyStore'
import type { LobbyMatch } from '../../game/lobby'

// The whole delivery path, driven the way the server drives it: the real socket
// handlers get the real payloads, and the assertion is on the DOM.
//
// ⚠️ THIS IS THE TEST THE EARLIER ONES SHOULD HAVE BEEN. Unit tests around the
// paint helpers passed the entire time bots were rendering as plain castles,
// because they called the store functions directly and never went through the
// events the app actually receives.

/** Fires an event at the app's own socket listeners, as the server would. */
function serverEmits(event: string, payload: unknown): void {
  const listeners = socket.listeners(event)
  expect(listeners.length, `nothing is listening for ${event}`).toBeGreaterThan(0)
  for (const l of listeners) l(payload)
}

const BOT_PAINT = {
  gradient: { from: '#5a3a2a', to: '#1c100c' },
  accent: '#ff7a18',
  outline: '#0d0806',
  strokeScale: 1.1,
  decor: 'fire.foundry',
}

const match: LobbyMatch = {
  roomCode: '1234',
  phase: 'active',
  hostId: 'a',
  playerCount: 2,
  maxPlayers: 8,
  tick: 1,
  winnerId: null,
  config: { roomCode: '1234', maxPlayers: 8, tickRate: 20, startingCitizens: 10, startingCastleHp: 10_000 },
  players: [
    { id: 'a', name: 'Alice', kingdomId: 'water', ready: true, connected: true, socketId: 's1' },
    { id: 'bot-1', name: 'Rook', kingdomId: 'fire', ready: true, connected: true, socketId: null, isBot: true },
  ],
}

const livePlayer = (id: string, kingdomId: string) => ({
  id,
  name: id,
  kingdomId,
  castle: { hp: 10_000, maxHp: 10_000, shield: 0 },
  economy: { citizens: 10, currency: 0, incomePerTick: 1 },
  target: null,
  eliminated: false,
})

function Harness() {
  const game = useGameState()
  return <BattlefieldView match={match} youId="a" players={game.players} tick={game.tick} />
}

describe('bot castle skins reach the battlefield', () => {
  beforeEach(() => clearGameState())

  it('renders the decor a bot was given in match:started', () => {
    serverEmits('match:started', {
      roomCode: '1234',
      serverTime: Date.now(),
      config: match.config,
      tick: 1,
      players: [
        { id: 'a', castlePaint: undefined },
        { id: 'bot-1', isBot: true, castlePaint: BOT_PAINT },
      ],
    })
    // ...and then the 20 Hz channel, which carries no cosmetics at all.
    serverEmits('state:sync', {
      tick: 2,
      serverTime: Date.now(),
      players: [livePlayer('a', 'water'), livePlayer('bot-1', 'fire')],
    })

    const { container } = render(<Harness />)
    const bot = container.querySelector('[data-player-id="bot-1"]')
    expect(bot, 'the bot has no site on the battlefield').toBeTruthy()
    expect(
      bot!.querySelector('.skin'),
      'the bot rendered as a plain castle: no skin decor in the DOM',
    ).toBeTruthy()
  })

  it('keeps the skin after a hundred more syncs', () => {
    serverEmits('match:started', {
      roomCode: '1234',
      serverTime: Date.now(),
      config: match.config,
      tick: 1,
      players: [{ id: 'bot-1', isBot: true, castlePaint: BOT_PAINT }],
    })
    for (let t = 2; t < 102; t++) {
      serverEmits('state:sync', {
        tick: t,
        serverTime: Date.now(),
        players: [livePlayer('a', 'water'), livePlayer('bot-1', 'fire')],
      })
    }
    const { container } = render(<Harness />)
    expect(container.querySelector('[data-player-id="bot-1"] .skin')).toBeTruthy()
  })
})
