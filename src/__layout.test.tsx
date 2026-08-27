import { it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { StartupScreen } from './pages/StartupScreen'
import { StoreScreen } from './pages/StoreScreen'
import { ProfileScreen } from './pages/ProfileScreen'

// TEMPORARY: dumps the real rendered markup of the three screens so a review
// page can show them under the real stylesheets at real viewport sizes. jsdom
// has no layout engine, so this is the only way to actually SEE whether the
// responsive rules work rather than reasoning about them. Deleted once the
// layout is signed off.

const OUT =
  'C:/Users/Btpit/AppData/Local/Temp/claude/c--Users-Btpit-OneDrive-Desktop-Coding-Projects-elementals/5666de38-1426-4f91-84e8-81a4a9c173c5/scratchpad/layout'

const fetchProfile = vi.fn()
const fetchShop = vi.fn()
vi.mock('./game/auth', async () => {
  const actual = await vi.importActual<typeof import('./game/auth')>('./game/auth')
  return {
    ...actual,
    fetchProfile: () => fetchProfile(),
    fetchShop: () => fetchShop(),
    isSignedIn: () => true,
    getSignedInName: () => 'Bryson',
    signOut: () => {},
  }
})

const paint = (fill: string) => ({ fill })

const item = (o: Record<string, unknown>) => ({
  id: 'x',
  slot: 'castle',
  kingdomId: 'fire',
  name: 'Skin',
  rarity: 'uncommon',
  price: 600,
  paint: paint('#b8452e'),
  ...o,
})

const KINGDOMS = ['water', 'fire', 'air', 'ice', 'electricity', 'nature']

beforeEach(() => {
  fetchProfile.mockResolvedValue({
    username: 'Bryson',
    needsUsername: false,
    needsAge: false,
    level: 12,
    xp: 14200,
    xpIntoLevel: 620,
    xpForNext: 1400,
    coins: 3250,
    kingdoms: KINGDOMS.map((k, i) => ({
      kingdomId: k,
      matches: 20 - i,
      wins: 6 - (i % 4),
      top3: 9,
      playtimeSeconds: 9000 - i * 900,
      damageDealt: 4200,
      averagePlacement: 2.8,
      mastery: i < 2 ? 'silver' : 'bronze',
      masteryName: i < 2 ? 'Silver' : 'Bronze',
    })),
    loadout: {},
    owned: ['castle.fire.embers'],
    catalogue: [],
    quests: [
      { id: 'q1', text: 'Win a match', tier: 'hard', progress: 0, target: 1, xp: 500, coins: 320, done: false },
      { id: 'q2', text: 'Outlast three kingdoms', tier: 'medium', progress: 2, target: 3, xp: 260, coins: 170, done: false },
      { id: 'q3', text: 'Play a match', tier: 'easy', progress: 1, target: 1, xp: 120, coins: 80, done: true },
    ],
    questsResetAt: new Date(Date.now() + 5 * 3600_000).toISOString(),
    totals: { matches: 96, wins: 21, playtimeSeconds: 54000 },
  })
  fetchShop.mockResolvedValue({
    day: '2026-08-27',
    resetsAt: new Date(Date.now() + 5 * 3600_000).toISOString(),
    featured: [
      item({ id: 'a', name: 'Leviathan Palace', kingdomId: 'water', rarity: 'legendary', price: 6000, paint: paint('#1b5f9e') }),
      item({ id: 'b', name: 'Supernova Citadel', kingdomId: 'fire', rarity: 'legendary', price: 6000, paint: paint('#ffb03a') }),
      item({ id: 'c', name: 'Coral Reef Fortress', kingdomId: 'water', rarity: 'rare', price: 1400, paint: paint('#2f9c9a') }),
      item({ id: 'd', name: 'Skyship Fortress', kingdomId: 'air', rarity: 'rare', price: 1400, paint: paint('#c8d6f5') }),
    ],
    daily: [
      item({ id: 'e', name: 'Rippled Castle', kingdomId: 'water', paint: paint('#2f86c4') }),
      item({ id: 'f', name: 'Ember Stripes', kingdomId: 'fire', paint: paint('#d4482a') }),
      item({ id: 'g', name: 'Wind Lines', kingdomId: 'air', paint: paint('#8fa9e0') }),
      item({ id: 'h', name: 'Frost Patterns', kingdomId: 'ice', paint: paint('#7fd4ef') }),
      item({ id: 'i', name: 'Circuit Castle', kingdomId: 'electricity', paint: paint('#4a2d7a') }),
      item({ id: 'j', name: 'Vine Castle', kingdomId: 'nature', paint: paint('#39754c') }),
      item({ id: 'k', name: 'Frozen Harbor', kingdomId: 'ice', rarity: 'rare', price: 1400, paint: paint('#a9d8ef') }),
      item({ id: 'l', name: 'Inferno Foundry', kingdomId: 'fire', rarity: 'rare', price: 1400, paint: paint('#5a3a2a') }),
      item({ id: 'm', name: 'Ice Palace', kingdomId: 'ice', rarity: 'rare', price: 1400, paint: paint('#bdeeff') }),
      item({ id: 'n', name: 'Power Station', kingdomId: 'electricity', rarity: 'rare', price: 1400, paint: paint('#6b4a9e') }),
    ],
    owned: ['f'],
    balance: 3250,
    signedIn: true,
  })
})

const settle = () => new Promise((r) => setTimeout(r, 60))

it('dumps layout markup', async () => {
  mkdirSync(OUT, { recursive: true })

  const css = [
    'src/pages/StartupScreen.css',
    'src/pages/AccountPage.css',
    'src/components/profile/Profile.css',
    'src/components/shop/Shop.css',
    'src/components/skins/skins.css',
  ]
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
  writeFileSync(`${OUT}/app.css`, css)

  const noop = () => {}

  const menu = render(
    <MemoryRouter>
      <StartupScreen name="Bryson" onName={noop} onJoin={noop} onJoinPublic={noop} />
    </MemoryRouter>,
  )
  await settle()
  writeFileSync(`${OUT}/menu.html`, menu.container.innerHTML)
  menu.unmount()

  const shop = render(
    <MemoryRouter>
      <StoreScreen onBack={noop} />
    </MemoryRouter>,
  )
  await settle()
  writeFileSync(`${OUT}/shop-featured.html`, shop.container.innerHTML)

  // Daily, so the long grid that has to scroll is captured too.
  const dailyTab = shop.container.querySelectorAll('.store-tab')[1] as HTMLElement
  dailyTab?.click()
  await settle()
  writeFileSync(`${OUT}/shop-daily.html`, shop.container.innerHTML)

  // And with a skin selected, which is the case that has to work on a phone.
  const firstItem = shop.container.querySelector('.item') as HTMLElement
  firstItem?.click()
  await settle()
  writeFileSync(`${OUT}/shop-selected.html`, shop.container.innerHTML)
  shop.unmount()

  const profile = render(
    <MemoryRouter>
      <ProfileScreen onBack={noop} />
    </MemoryRouter>,
  )
  await settle()
  writeFileSync(`${OUT}/profile.html`, profile.container.innerHTML)
  profile.unmount()
})
