/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, it, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LobbyView } from './LobbyView'
import { SELECTABLE_KINGDOMS } from '../game/kingdoms'
import { KINGDOM_DIFFICULTY, MAX_DIFFICULTY } from '../game/kingdomInfo'
import { nextDifficulty, type LobbyMatch, type LobbyPlayer } from '../game/lobby'

/** A full perk selection, so a fixture player can ready up. */
const PERKS = ['sharperSwords', 'extraGuards']

const match: LobbyMatch = {
  roomCode: '1234',
  phase: 'lobby',
  hostId: 'a',
  playerCount: 2,
  maxPlayers: 8,
  tick: 0,
  winnerId: null,
  players: [
    { id: 'a', name: 'Alice', kingdomId: 'fire', perks: PERKS, ready: true, connected: true, socketId: 's1' },
    { id: 'b', name: 'Bob', kingdomId: null, perks: [], ready: false, connected: true, socketId: 's2' },
  ],
}

const noop = () => {}

/** Renders the view with every callback stubbed unless overridden. */
function renderLobby(props: Partial<Parameters<typeof LobbyView>[0]> = {}) {
  return render(
    <LobbyView
      match={match}
      youId="b"
      onToggleReady={noop}
      onSelectKingdom={noop}
      onSelectPerks={noop}
      onSpectate={noop}
      onStart={noop}
      onLeave={noop}
      {...props}
    />,
  )
}

describe('LobbyView', () => {
  it('shows the room code, players, host status, and ready status', () => {
    renderLobby()
    expect(screen.getByLabelText('Room code 1234')).toBeTruthy()
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('Host')).toBeTruthy() // Alice
    expect(screen.getByText('You')).toBeTruthy() // Bob (youId)
    expect(screen.getByText('Ready')).toBeTruthy() // Alice's ready label
  })

  it('fires callbacks for kingdom select, ready, and leave', () => {
    const onSelectKingdom = vi.fn()
    const onToggleReady = vi.fn()
    const onLeave = vi.fn()
    // Bob has a kingdom and both perks here, so Ready Up is unlocked.
    const readyable: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, kingdomId: 'water', perks: PERKS } : p,
      ),
    }
    renderLobby({ match: readyable, onSelectKingdom, onToggleReady, onLeave })

    fireEvent.click(screen.getByRole('button', { name: 'Water' }))
    expect(onSelectKingdom).toHaveBeenCalledWith('water')

    fireEvent.click(screen.getByRole('button', { name: /ready up/i }))
    expect(onToggleReady).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('disables a kingdom already taken by another player', () => {
    // Alice (a) holds "fire"; from Bob's view it should be disabled, others free.
    renderLobby()
    const fire = screen.getByRole('button', { name: /fire/i }) as HTMLButtonElement
    expect(fire.disabled).toBe(true)
    const water = screen.getByRole('button', { name: 'Water' }) as HTMLButtonElement
    expect(water.disabled).toBe(false)
  })

  it('only the host sees Start, and it is gated until everyone is ready', () => {
    // Bob (not host) sees no Start button.
    const { unmount } = renderLobby()
    expect(
      screen.queryByRole('button', { name: /start match|everyone must|need \d/i }),
    ).toBeNull()
    unmount()

    // Alice (host) sees the Start button, disabled with a reason (Bob has no
    // kingdom in the fixture).
    renderLobby({ youId: 'a', onStart: vi.fn() })
    const start = screen.getByRole('button', {
      name: /everyone must pick a kingdom/i,
    }) as HTMLButtonElement
    expect(start.disabled).toBe(true)
  })

  it('blocks Start while someone still owes perks', () => {
    const kingdomsOnly: LobbyMatch = {
      ...match,
      players: match.players.map((p, i) => ({
        ...p,
        ready: true,
        kingdomId: p.kingdomId ?? (i === 0 ? 'fire' : 'water'),
        perks: i === 0 ? PERKS : ['sharperSwords'], // Bob is one perk short
      })),
    }
    renderLobby({ match: kingdomsOnly, youId: 'a' })
    // The reason no longer names a number: the allowance is per kingdom now
    // (Kitsune picks three), so a fixed count would be wrong for some tables.
    const start = screen.getByRole('button', {
      name: /must pick a full set of perks/i,
    }) as HTMLButtonElement
    expect(start.disabled).toBe(true)
  })

  it('enables Start for the host once all connected players are ready with a kingdom and perks', () => {
    const allReady: LobbyMatch = {
      ...match,
      players: match.players.map((p, i) => ({
        ...p,
        ready: true,
        kingdomId: p.kingdomId ?? (i === 0 ? 'fire' : 'water'),
        perks: PERKS,
      })),
    }
    const onStart = vi.fn()
    renderLobby({ match: allReady, youId: 'a', onStart })
    const start = screen.getByRole('button', { name: 'Start Match' }) as HTMLButtonElement
    expect(start.disabled).toBe(false)
    fireEvent.click(start)
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

describe('LobbyView perks', () => {
  it('cannot ready up without a kingdom or without a full perk set', () => {
    // Bob: no kingdom, no perks.
    const { unmount } = renderLobby()
    const noKingdom = screen.getByRole('button', {
      name: /pick a kingdom first/i,
    }) as HTMLButtonElement
    expect(noKingdom.disabled).toBe(true)
    unmount()

    // Bob: kingdom + one perk — still one short.
    const onePerk: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, kingdomId: 'water', perks: ['deepPockets'] } : p,
      ),
    }
    renderLobby({ match: onePerk })
    const onePerkBtn = screen.getByRole('button', {
      name: /pick 1 more perk/i,
    }) as HTMLButtonElement
    expect(onePerkBtn.disabled).toBe(true)
  })

  it('toggles a perk on, and reports the whole new selection', () => {
    const onSelectPerks = vi.fn()
    renderLobby({ onSelectPerks })
    fireEvent.click(screen.getByRole('button', { name: /deep pockets/i }))
    expect(onSelectPerks).toHaveBeenCalledWith(['deepPockets'])
  })

  it('toggles a picked perk back off', () => {
    const onSelectPerks = vi.fn()
    const picked: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, perks: ['deepPockets', 'extraMedics'] } : p,
      ),
    }
    renderLobby({ match: picked, onSelectPerks })
    fireEvent.click(screen.getByRole('button', { name: /deep pockets/i }))
    expect(onSelectPerks).toHaveBeenCalledWith(['extraMedics'])
  })

  it('locks the unpicked perks once two are chosen', () => {
    const picked: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, perks: ['deepPockets', 'extraMedics'] } : p,
      ),
    }
    renderLobby({ match: picked })
    const chosen = screen.getByRole('button', { name: /deep pockets/i }) as HTMLButtonElement
    const other = screen.getByRole('button', { name: /sharper swords/i }) as HTMLButtonElement
    expect(chosen.disabled).toBe(false) // still swappable
    expect(other.disabled).toBe(true)
  })

  it("shows every player's chosen perks next to their name", () => {
    renderLobby()
    // Alice's two perks are labelled in the roster.
    expect(screen.getAllByLabelText('Sharper Swords').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Extra Guards').length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Layout: the kingdom picker has to keep working as the roster grows. Fifteen
// kingdoms in one text column pushed the description down to a scrolling
// sliver, so these pin the structure that fixed it.
// ---------------------------------------------------------------------------

describe('the kingdom picker layout', () => {
  it('gives every kingdom a tile with its signature mark', () => {
    const { container } = renderLobby()
    const tiles = container.querySelectorAll('.lobby__kingdom-btn')
    expect(tiles.length).toBeGreaterThanOrEqual(15)
    for (const tile of tiles) {
      // The same mark that is stamped on that kingdom's castle — the lobby is
      // where a player learns the battlefield's shorthand.
      expect(tile.querySelector('.lobby__kingdom-icon')).not.toBeNull()
      expect(tile.querySelector('.lobby__kingdom-name')?.textContent).toBeTruthy()
    }
  })

  it('tints each mark so a near-black kingdom is still visible', () => {
    const { container } = renderLobby()
    const inks = [...container.querySelectorAll<HTMLElement>('.lobby__kingdom-btn')].map((t) =>
      t.style.getPropertyValue('--k-ink'),
    )
    for (const ink of inks) expect(ink).toBeTruthy()
    // Dark's own colour would vanish against the panel, so its mark is swapped
    // for white — meaning not every tile can be carrying its raw kingdom hue.
    expect(new Set(inks).size).toBeGreaterThan(1)
    expect(inks).toContain('#f7f7f2')
  })

  it('separates the picker from the description so both get room', () => {
    const { container } = renderLobby()
    const split = container.querySelector('.lobby__kingdoms-split')
    expect(split).not.toBeNull()
    const picker = split!.querySelector('.lobby__kingdom-picker')
    const detail = split!.querySelector('.lobby__kingdom-detail')
    expect(picker).not.toBeNull()
    expect(detail).not.toBeNull()
    // The tiles belong to the picker and the dossier to the detail column; if
    // they share a parent the description is back under the wall of buttons.
    expect(picker!.querySelector('.lobby__kingdom-grid')).not.toBeNull()
    expect(detail!.querySelector('.lobby__kingdom-grid')).toBeNull()
  })

  it('puts the selected kingdom’s dossier in the description column', () => {
    const { container } = renderLobby({
      match: {
        ...match,
        players: [
          match.players[0]!,
          { ...match.players[1]!, kingdomId: 'kitsune' },
        ],
      },
    })
    const detail = container.querySelector('.lobby__kingdom-detail')!
    const dossier = detail.querySelector('[data-testid="kingdom-details"]')
    expect(dossier).not.toBeNull()
    // Scoped to the dossier: "Kitsune" is also the label on its picker tile.
    expect(dossier!.querySelector('.lobby__details-title')?.textContent).toBe('Kitsune')
    // The dossier is the thing that needed room — it must actually carry the
    // passives and abilities text, not just a title.
    expect(dossier!.querySelectorAll('.lobby__details-desc').length).toBeGreaterThan(4)
  })

  it('rates how hard the kingdom is, above the passives', () => {
    const { container } = renderLobby({
      match: {
        ...match,
        players: [match.players[0]!, { ...match.players[1]!, kingdomId: 'kitsune' }],
      },
    })
    const dossier = container.querySelector('[data-testid="kingdom-details"]')!
    const rating = dossier.querySelector('[data-testid="kingdom-difficulty"]')
    expect(rating).not.toBeNull()
    // Kitsune is a 2: two earned stars and one left empty. Both halves matter —
    // showing only the earned stars reads as "2" rather than "2 of 3".
    expect(dossier.querySelectorAll('.lobby__difficulty-star')).toHaveLength(MAX_DIFFICULTY)
    expect(dossier.querySelectorAll('.lobby__difficulty-star--empty')).toHaveLength(
      MAX_DIFFICULTY - KINGDOM_DIFFICULTY.kitsune!,
    )
    // Announced as one thing, not as a row of anonymous stars.
    expect(rating!.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      `Difficulty 2 out of ${MAX_DIFFICULTY}`,
    )
    // Above the passives, which is where it was asked for: the difficulty node
    // must come before the first heading in document order.
    const heading = dossier.querySelector('.lobby__details-heading')!
    expect(
      rating!.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('is labelled, so the stars are not read as a quality score', () => {
    const { container } = renderLobby({
      match: {
        ...match,
        players: [match.players[0]!, { ...match.players[1]!, kingdomId: 'water' }],
      },
    })
    const rating = container.querySelector('[data-testid="kingdom-difficulty"]')!
    expect(rating.textContent).toContain('Difficulty')
  })
})

describe('every kingdom is rated', () => {
  it('has a difficulty for each selectable kingdom', () => {
    // A missing entry renders NO stars at all, which reads as a broken panel
    // rather than as an omission — so a new kingdom must not be able to slip
    // in without one.
    for (const k of SELECTABLE_KINGDOMS) {
      const rating = KINGDOM_DIFFICULTY[k.id]
      expect(rating, `${k.id} has no difficulty rating`).toBeDefined()
      expect(Number.isInteger(rating), `${k.id}'s rating is not a whole number`).toBe(true)
      expect(rating).toBeGreaterThanOrEqual(1)
      expect(rating).toBeLessThanOrEqual(MAX_DIFFICULTY)
    }
  })

  it('rates nothing that is not a kingdom', () => {
    const ids = new Set(SELECTABLE_KINGDOMS.map((k) => k.id))
    for (const id of Object.keys(KINGDOM_DIFFICULTY)) {
      expect(ids.has(id as (typeof SELECTABLE_KINGDOMS)[number]['id']), `${id} is not a kingdom`).toBe(true)
    }
  })
})

describe('the kingdom grid holds its shape', () => {
  it('lists every kingdom, in the roster order', () => {
    const { container } = renderLobby()
    const labels = [...container.querySelectorAll('.lobby__kingdom-name')].map(
      (n) => n.textContent,
    )
    // Order is not incidental — it is the layout. A kingdom must be in the
    // same square every time, or muscle memory is worthless.
    expect(labels).toEqual(SELECTABLE_KINGDOMS.map((k) => k.label))
  })

  it('is a square grid — sixteen kingdoms, four across', () => {
    // The grid is a fixed four columns at every breakpoint (see the CSS), so
    // the roster has to stay a multiple of four or the last row goes ragged.
    expect(SELECTABLE_KINGDOMS.length % 4).toBe(0)
  })

  it('holds four columns at every screen size', () => {
    // jsdom applies no stylesheets, so the rule is read directly. A media
    // query that reflows the grid would move every kingdom on rotation.
    const css = readFileSync('src/components/LobbyView.css', 'utf8')
    const rules = [...css.matchAll(/\.lobby__kingdom-grid\s*\{([^}]*)\}/g)].map((m) => m[1]!)
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      const cols = /grid-template-columns:\s*([^;]+);/.exec(rule)
      if (!cols) continue
      expect(cols[1]!.trim()).toBe('repeat(4, minmax(0, 1fr))')
    }
  })
})

// ---- Bots in the lobby ----------------------------------------------------
//
// The behaviour worth pinning is who is allowed to do what: a bot must read as
// a player, only the host gets the controls, and a non-host must still be able
// to SEE what they are about to play against.

function makeBotSeat(over: Partial<LobbyPlayer> = {}): LobbyPlayer {
  return {
    id: 'bot-1',
    name: 'Ember',
    kingdomId: 'fire',
    perks: [],
    ready: true,
    connected: true,
    socketId: null,
    isBot: true,
    botDifficulty: 'medium',
    ...over,
  }
}

function lobbyWithBot(extra: Partial<LobbyMatch> = {}, bot = makeBotSeat()): LobbyMatch {
  return {
    roomCode: 'ABCD',
    phase: 'lobby',
    hostId: 'me',
    players: [
      {
        id: 'me',
        name: 'Bryson',
        kingdomId: 'water',
        perks: [],
        ready: false,
        connected: true,
        socketId: 's1',
      },
      bot,
    ],
    playerCount: 2,
    maxPlayers: 8,
    maxActivePlayers: 7,
    tick: 0,
    winnerId: null,
    ...extra,
  }
}

const baseProps = {
  onToggleReady: noop,
  onSelectKingdom: noop,
  onSelectPerks: noop,
  onSpectate: noop,
  onStart: noop,
  onLeave: noop,
}

test('a bot is labelled in the roster and shows its difficulty', () => {
  render(
    <LobbyView
      match={lobbyWithBot()}
      youId="me"
      {...baseProps}
      onAddBot={noop}
      onSetBotDifficulty={noop}
      onRemoveBot={noop}
    />,
  )
  expect(screen.getByText('Ember')).toBeTruthy()
  expect(screen.getByText('Bot')).toBeTruthy()
  // Named for the seat, so a screen reader hears which bot is being changed.
  expect(screen.getByRole('button', { name: /Ember difficulty: Medium/i })).toBeTruthy()
})

test('the host can add a bot', () => {
  const onAddBot = vi.fn()
  render(<LobbyView match={lobbyWithBot()} youId="me" {...baseProps} onAddBot={onAddBot} />)
  fireEvent.click(screen.getByRole('button', { name: /add bot/i }))
  expect(onAddBot).toHaveBeenCalledWith('hard')
})

test('the host can change a bot from medium to hard', () => {
  const onSetBotDifficulty = vi.fn()
  render(
    <LobbyView
      match={lobbyWithBot()}
      youId="me"
      {...baseProps}
      onAddBot={noop}
      onSetBotDifficulty={onSetBotDifficulty}
      onRemoveBot={noop}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Ember difficulty: Medium/i }))
  expect(onSetBotDifficulty).toHaveBeenCalledWith('bot-1', 'hard')
})

test('the host can remove a bot', () => {
  const onRemoveBot = vi.fn()
  render(
    <LobbyView
      match={lobbyWithBot()}
      youId="me"
      {...baseProps}
      onAddBot={noop}
      onSetBotDifficulty={noop}
      onRemoveBot={onRemoveBot}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Remove Ember' }))
  expect(onRemoveBot).toHaveBeenCalledWith('bot-1')
})

test('a non-host sees the difficulty but gets no controls', () => {
  render(<LobbyView match={lobbyWithBot()} youId="someone-else" {...baseProps} />)
  expect(screen.getByText('Medium')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Ember difficulty/i })).toBeNull()
  expect(screen.queryByRole('button', { name: /add bot/i })).toBeNull()
})

test('the difficulty button cycles easy -> medium -> hard -> easy', () => {
  // The cycle is the whole interaction, so it is pinned directly rather than
  // through the component: three taps must return to where they started, or a
  // host can get stuck unable to reach one of the levels.
  expect(nextDifficulty('easy')).toBe('medium')
  expect(nextDifficulty('medium')).toBe('hard')
  expect(nextDifficulty('hard')).toBe('easy')
  // An unset bot is Hard, so its first tap goes to Easy.
  expect(nextDifficulty(undefined)).toBe('easy')
})

test('adding a bot is refused once every playing seat is taken', () => {
  const full = lobbyWithBot({
    maxActivePlayers: 2,
  })
  render(<LobbyView match={full} youId="me" {...baseProps} onAddBot={noop} />)
  expect((screen.getByRole('button', { name: /add bot/i }) as HTMLButtonElement).disabled).toBe(true)
})

test('a bot shows its difficulty where a person shows ready state', () => {
  render(<LobbyView match={lobbyWithBot()} youId="me" {...baseProps} onAddBot={noop} onSetBotDifficulty={noop} onRemoveBot={noop} />)
  // The human is still described by readiness; the bot never is, because a bot
  // is always ready and the word would be noise.
  expect(screen.getByText('Not ready')).toBeTruthy()
  expect(screen.queryAllByText('Ready').length).toBe(0)
})
