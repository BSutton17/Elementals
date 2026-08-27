import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfileScreen } from './ProfileScreen'
import { StoreScreen } from './StoreScreen'

// Profile and Shop are PAGES, not overlays: destinations a player navigates to
// and back from. These tests pin the states each one has to survive, because a
// page that renders only its happy path looks broken the first time the server
// is slow.

const fetchProfile = vi.fn()
const fetchShop = vi.fn()
const buyItem = vi.fn()
const equipItem = vi.fn()
vi.mock('../game/auth', async () => {
  const actual = await vi.importActual<typeof import('../game/auth')>('../game/auth')
  return {
    ...actual,
    fetchProfile: () => fetchProfile(),
    fetchShop: () => fetchShop(),
    buyItem: (...a: unknown[]) => buyItem(...a),
    equipItem: (...a: unknown[]) => equipItem(...a),
    isSignedIn: () => localStorage.getItem('kingdoms.token') !== null,
    getSignedInName: () => localStorage.getItem('kingdoms.name'),
    signOut: () => {
      localStorage.removeItem('kingdoms.token')
      localStorage.removeItem('kingdoms.name')
    },
  }
})

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

/** A realistic profile payload; override only what a test is about. */
const profile = (over: Record<string, unknown> = {}) => ({
  username: 'Bryson',
  needsUsername: false,
  level: 3,
  xp: 2600,
  xpIntoLevel: 800,
  xpForNext: 1200,
  kingdoms: [],
  coins: 1250,
  loadout: {},
  owned: [],
  catalogue: [],
  quests: [],
  questsResetAt: '2026-08-27T15:00:00.000Z',
  totals: { matches: 0, wins: 0, playtimeSeconds: 0 },
  ...over,
})

/** A shop item; override only what a test is about. */
const cosmetic = (over: Record<string, unknown> = {}) => ({
  id: 'castle.fire.ember',
  slot: 'castle',
  kingdomId: 'fire',
  name: 'Ember',
  rarity: 'uncommon',
  price: 600,
  paint: { fill: '#b8452e' },
  ...over,
})

const shop = (over: Record<string, unknown> = {}) => ({
  day: '2026-08-26',
  resetsAt: new Date(Date.now() + 5 * 3600_000).toISOString(),
  featured: [
    cosmetic({
      id: 'castle.ice.regal',
      kingdomId: 'ice',
      name: 'Regal',
      rarity: 'legendary',
      price: 6000,
    }),
  ],
  daily: [cosmetic()],
  owned: [],
  balance: 1000,
  signedIn: true,
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  fetchProfile.mockReset()
  // A default that RESOLVES. Both pages call this now, and a bare mockReset
  // returns undefined, which turns every test into a TypeError on `.then`.
  fetchProfile.mockResolvedValue(null)
  fetchShop.mockReset()
  fetchShop.mockResolvedValue(shop())
  buyItem.mockReset()
  equipItem.mockReset()
})

describe('ProfileScreen', () => {
  it('invites a guest to sign in rather than showing an empty account', () => {
    // A guest reaching /profile directly is a normal thing to happen, not an
    // error - the shop link and a shared URL both lead here.
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(screen.getByText(/not signed in/i)).toBeTruthy()
    expect(screen.getByText(/you can play without one/i)).toBeTruthy()
  })

  it('shows the username once the profile loads', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(profile())
    wrap(<ProfileScreen onBack={() => {}} />)
    // Deliberately appears twice - as the page's heading, and as the value in
    // the Account row - so assert the heading specifically.
    expect(await screen.findByRole('heading', { name: 'Bryson' })).toBeTruthy()
  })

  it('says so plainly when the profile cannot be loaded', async () => {
    // Signed in (token present) but the server did not answer. This must not
    // read as "signed out", which would send someone off to sign in again for
    // no reason.
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(null)
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText(/could not load your profile/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('names the sections that later phases will fill', async () => {
    // Better than hiding them: an empty page reads as broken, a named one reads
    // as not built yet.
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(profile())
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText('Record')).toBeTruthy()
    expect(screen.getByText('Kingdom cosmetics')).toBeTruthy()
  })


  it('shows the level and progress toward the next one', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(profile({ level: 3, xpIntoLevel: 800, xpForNext: 1200 }))
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText('Level 3')).toBeTruthy()
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('800')
    expect(bar.getAttribute('aria-valuemax')).toBe('1200')
  })

  it('at the level cap shows the total instead of an empty bar', async () => {
    // A progress bar toward a level that does not exist would be a lie.
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(profile({ level: 50, xp: 168800, xpForNext: 0 }))
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText(/max level/i)).toBeTruthy()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('HIDES WIN RATE UNTIL THE SAMPLE SUPPORTS IT', async () => {
    // A 0% win rate across two matches is noise presented as judgement.
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(
      profile({ totals: { matches: 3, wins: 0, playtimeSeconds: 600 } }),
    )
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText(/win rate appears after 10 matches/i)).toBeTruthy()
    expect(screen.queryByText('0%')).toBeNull()
  })

  it('shows the win rate once there are enough matches', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(
      profile({ totals: { matches: 20, wins: 5, playtimeSeconds: 7200 } }),
    )
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText('25%')).toBeTruthy()
  })

  it('lists kingdoms played, most-played first, with mastery', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(
      profile({
        totals: { matches: 12, wins: 4, playtimeSeconds: 30000 },
        kingdoms: [
          { kingdomId: 'fire', matches: 2, wins: 0, top3: 0, playtimeSeconds: 600, damageDealt: 1, averagePlacement: 5, mastery: null, masteryName: null },
          { kingdomId: 'magma', matches: 10, wins: 4, top3: 6, playtimeSeconds: 29400, damageDealt: 9, averagePlacement: 2, mastery: 'bronze', masteryName: 'Bronze' },
        ],
      }),
    )
    const { container } = wrap(<ProfileScreen onBack={() => {}} />)
    await screen.findByText('Magma')
    const names = [...container.querySelectorAll('.kingdom-row__name')].map((n) => n.textContent)
    expect(names).toEqual(['Magma', 'Fire'])
    expect(screen.getByText('Bronze')).toBeTruthy()
  })

  it('renders a brand-new account with nothing in it', async () => {
    // What `fetchProfile` produces for someone who has never played, and what
    // its normaliser falls back to for an older server that omits the newer
    // fields. Zeroes everywhere must render, not throw.
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(
      profile({
        level: 1,
        xp: 0,
        xpIntoLevel: 0,
        xpForNext: 800,
        kingdoms: [],
        totals: { matches: 0, wins: 0, playtimeSeconds: 0 },
      }),
    )
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByRole('heading', { name: 'Bryson' })).toBeTruthy()
    expect(screen.getByText('Level 1')).toBeTruthy()
    expect(screen.getByText(/record starts here/i)).toBeTruthy()
    expect(screen.getByText(/every kingdom you play is tracked/i)).toBeTruthy()
  })


  it('shows the coin balance', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(profile({ coins: 1250 }))
    wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText('1,250')).toBeTruthy()
  })

  it('lists the daily quests with progress and both rewards', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(
      profile({
        quests: [
          { questId: 'a', tier: 'easy', description: 'Spend 8,000 gold', progress: 4000, target: 8000, completed: false, xp: 120, coins: 80 },
          { questId: 'b', tier: 'hard', description: 'Win 3 games as Fire', progress: 3, target: 3, completed: true, xp: 500, coins: 320 },
        ],
      }),
    )
    const { container } = wrap(<ProfileScreen onBack={() => {}} />)
    expect(await screen.findByText('Spend 8,000 gold')).toBeTruthy()

    // Both currencies are shown, because a quest pays both.
    expect(screen.getByText(/\+120 XP · \+80 coins/)).toBeTruthy()
    expect(screen.getByText(/\+500 XP · \+320 coins/)).toBeTruthy()

    // Tier is written out, not carried by colour alone.
    expect(screen.getByText('easy')).toBeTruthy()
    expect(screen.getByText('hard')).toBeTruthy()

    // A finished quest is marked as such, not just dimmed.
    expect(container.querySelectorAll('.quest--done').length).toBe(1)
    expect(screen.getByLabelText('Completed')).toBeTruthy()
  })

  it('quest progress bars carry their values for screen readers', async () => {
    localStorage.setItem('kingdoms.token', 'tok')
    fetchProfile.mockResolvedValue(
      profile({
        xpForNext: 0, // no level bar, so the only progressbars are quests
        quests: [
          { questId: 'a', tier: 'medium', description: 'Outlast 12 kingdoms', progress: 5, target: 12, completed: false, xp: 260, coins: 170 },
        ],
      }),
    )
    wrap(<ProfileScreen onBack={() => {}} />)
    const bar = await screen.findByRole('progressbar', { name: 'Outlast 12 kingdoms' })
    expect(bar.getAttribute('aria-valuenow')).toBe('5')
    expect(bar.getAttribute('aria-valuemax')).toBe('12')
  })

  it('goes back to the menu from the top bar', () => {
    const onBack = vi.fn()
    wrap(<ProfileScreen onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('also offers a way back from the guest empty state', () => {
    // A guest lands on a page with nothing on it; the top bar alone is a thin
    // way out, so the empty state carries its own.
    const onBack = vi.fn()
    wrap(<ProfileScreen onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})


describe('StoreScreen', () => {
  it('offers Featured and Daily as tabs, with Featured selected', async () => {
    // Tabs, not routes: two views of one place. A back gesture inside the shop
    // should leave the shop, not step between its tabs.
    wrap(<StoreScreen onBack={() => {}} />)
    const featured = await screen.findByRole('tab', { name: 'Featured' })
    expect(featured.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Daily' }).getAttribute('aria-selected')).toBe(
      'false',
    )
  })

  it('shows the balance and a reset countdown', async () => {
    wrap(<StoreScreen onBack={() => {}} />)
    expect(await screen.findByText('1,000')).toBeTruthy()
    expect(screen.getByText(/resets in/i)).toBeTruthy()
  })

  it('renders items with their name, rarity and price', async () => {
    wrap(<StoreScreen onBack={() => {}} />)
    expect(await screen.findByText('Regal')).toBeTruthy()
    expect(screen.getByText('Legendary')).toBeTruthy()
    expect(screen.getByText('6,000')).toBeTruthy()
  })

  it('SELECTING IS NOT BUYING - the card opens the detail, the detail buys', async () => {
    // So an item can never be purchased by a mis-tap while scrolling a grid.
    wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByText('Regal'))
    expect(buyItem).not.toHaveBeenCalled()
    expect(screen.getByRole('complementary', { name: /Regal details/i })).toBeTruthy()
  })

  it('refuses to buy what the player cannot afford, and says how short', async () => {
    wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByText('Regal'))
    expect(screen.getByText(/5,000 more coins needed/i)).toBeTruthy()
    const buy = screen.getByRole('button', { name: /^Buy/ }) as HTMLButtonElement
    expect(buy.disabled).toBe(true)
  })

  it('buys an affordable item and updates the balance', async () => {
    buyItem.mockResolvedValue({ ok: true, balance: 400 })
    wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Daily' }))
    fireEvent.click(await screen.findByText('Ember'))
    fireEvent.click(screen.getByRole('button', { name: /^Buy/ }))
    await waitFor(() => expect(buyItem).toHaveBeenCalledWith('castle.fire.ember'))
    expect(await screen.findByText('400')).toBeTruthy()
  })

  it('reports a refused purchase without pretending it worked', async () => {
    buyItem.mockResolvedValue({ ok: false, message: 'That is not in the shop today.' })
    wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Daily' }))
    fireEvent.click(await screen.findByText('Ember'))
    fireEvent.click(screen.getByRole('button', { name: /^Buy/ }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('That is not in the shop today.')
  })

  it('offers Equip, not Buy, for something already owned', async () => {
    fetchShop.mockResolvedValue(shop({ owned: ['castle.fire.ember'] }))
    wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Daily' }))
    fireEvent.click(await screen.findByText('Ember'))
    expect(screen.getByRole('button', { name: 'Equip' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Buy/ })).toBeNull()
  })

  it('filters by kingdom', async () => {
    fetchShop.mockResolvedValue(
      shop({
        daily: [
          cosmetic(),
          cosmetic({ id: 'castle.water.dusk', kingdomId: 'water', name: 'Dusk' }),
        ],
      }),
    )
    wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Daily' }))
    fireEvent.click(await screen.findByRole('button', { name: /Water/ }))
    expect(screen.getByText('Dusk')).toBeTruthy()
    expect(screen.queryByText('Ember')).toBeNull()
  })

  it('GROUPS DAILY BY RARITY, best tier first', async () => {
    // Daily carries every uncommon plus one rare per kingdom - the first
    // question is "what is actually good today", and rarity answers it.
    fetchShop.mockResolvedValue(
      shop({
        daily: [
          cosmetic({ id: 'a', name: 'Common Thing', rarity: 'uncommon' }),
          cosmetic({ id: 'b', name: 'Good Thing', rarity: 'rare', price: 1400 }),
          cosmetic({ id: 'c', name: 'Other Uncommon', rarity: 'uncommon' }),
        ],
      }),
    )
    const { container } = wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Daily' }))

    const headings = [...container.querySelectorAll('.shop__group-title')].map((h) =>
      h.textContent?.replace(/\d+$/, '').trim(),
    )
    expect(headings).toEqual(['Rare', 'Uncommon'])
  })

  it('does not group Featured, which is only a handful of items', async () => {
    const { container } = wrap(<StoreScreen onBack={() => {}} />)
    await screen.findByText('Regal')
    expect(container.querySelector('.shop__group-title')).toBeNull()
  })

  it('counts the items in each rarity group', async () => {
    fetchShop.mockResolvedValue(
      shop({
        daily: [
          cosmetic({ id: 'a', name: 'One', rarity: 'uncommon' }),
          cosmetic({ id: 'b', name: 'Two', rarity: 'uncommon' }),
        ],
      }),
    )
    const { container } = wrap(<StoreScreen onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Daily' }))
    expect(container.querySelector('.shop__group-count')!.textContent).toBe('2')
  })

  it('shows an honest empty state when the shop has nothing', async () => {
    fetchShop.mockResolvedValue(shop({ featured: [], daily: [] }))
    wrap(<StoreScreen onBack={() => {}} />)
    expect(await screen.findByText(/nothing on the shelves yet/i)).toBeTruthy()
  })

  it('says so when the shop cannot be loaded, and does not imply a charge', async () => {
    fetchShop.mockResolvedValue(null)
    wrap(<StoreScreen onBack={() => {}} />)
    expect(await screen.findByText(/could not load the shop/i)).toBeTruthy()
    expect(screen.getByText(/nothing has been charged/i)).toBeTruthy()
  })

  it('shows no balance to a guest, rather than a zero', async () => {
    // A guest has no balance; "0 coins" would imply they had spent it.
    fetchShop.mockResolvedValue(shop({ balance: null, signedIn: false }))
    const { container } = wrap(<StoreScreen onBack={() => {}} />)
    await screen.findByText('Regal')
    expect(container.querySelector('.coin-balance')).toBeNull()
    expect(screen.getByText(/sign in from the menu/i)).toBeTruthy()
  })
})
