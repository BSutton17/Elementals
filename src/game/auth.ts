/**
 * Sign-in state for the client.
 *
 * The flow, in one place:
 *   1. Google's button hands us an ID token (a signed note about who the user is)
 *   2. We POST it to our own server, which verifies it with Google
 *   3. Our server hands back OUR token, which is what the socket handshake reads
 *
 * This module never decides anything about identity. It carries envelopes.
 */

import { socket } from '../sockets/socket'
import { authenticate } from '../sockets/session'
import { setAdmin } from './adminStore'

/** Same resolution rule as the socket: explicit env wins, else dev/prod default. */
const PROD_SERVER_URL = 'https://elementals-c1937bd8ae33.herokuapp.com'
const DEV_SERVER_URL = 'http://localhost:3001'
const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? DEV_SERVER_URL : PROD_SERVER_URL)

/**
 * localStorage, NOT sessionStorage — deliberately different from the per-tab
 * game session id in `sockets/session.ts`. A game session is per-tab on
 * purpose (two tabs are two players); being signed in is per-person and should
 * survive closing the browser.
 */
const TOKEN_KEY = 'kingdoms.token'
const NAME_KEY = 'kingdoms.name'

export interface SignedInUser {
  /** The chosen username, or null if they have not picked one yet. */
  username: string | null
  /**
   * True on a first-ever sign-in. Phase 2 opens the username picker on this;
   * until then the suggested name stands in.
   */
  needsUsername: boolean
  /** Google's name — only ever a suggestion to pre-fill the picker with. */
  suggestedName: string | null
  /** True until the age gate has been answered. Separate from the username:
   *  an account can exist without yet being allowed to keep data. */
  needsAge: boolean
}

/** Our session token, or null if this person is a guest. */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // Private mode, or site data blocked. A guest, then — never a crash.
    return null
  }
}

/** The signed-in display name, if we have one. */
export function getSignedInName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY)
  } catch {
    return null
  }
}

export function isSignedIn(): boolean {
  return getToken() !== null
}

/**
 * Exchanges Google's ID token for our own session token and remembers it.
 * Returns the signed-in user, or null if the server rejected the token.
 */
export async function signInWithGoogle(idToken: string): Promise<SignedInUser | null> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) {
      console.warn('Sign-in rejected by server:', res.status)
      return null
    }

    const { token, username, needsUsername, suggestedName, needsAge } =
      (await res.json()) as {
        token: string
        username: string | null
        needsUsername: boolean
        suggestedName: string | null
        needsAge?: boolean
      }

    // PHASE 2 REPLACES THIS. Until the username picker exists, a first-time
    // player is shown Google's name so the menu is not blank — but it is only
    // ever displayed, never sent to the server as their identity.
    const display = username ?? suggestedName ?? 'Player'

    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(NAME_KEY, display)
    } catch {
      // Storage unavailable: the sign-in still worked for this page load, it
      // just will not be remembered. Not worth failing over.
    }
    // The live socket still thinks we are a guest — it was authenticated at
    // connect time, before this token existed. Re-present it so account-gated
    // controls appear without a reload.
    void refreshSocketAccount()
    return { username, needsUsername, suggestedName, needsAge: needsAge ?? false }
  } catch (error) {
    // Server down, offline, CORS. All the same to the player: not signed in.
    console.warn('Sign-in failed:', error)
    return null
  }
}

/** Standard headers for an authenticated request. */
function authHeaders(): Record<string, string> {
  const token = getToken()
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

/**
 * Every authenticated call goes through here, for one reason: the server slides
 * the session forward by handing back a fresh token in `X-Session-Token`, and
 * something has to store it.
 *
 * ⚠️ USE THIS RATHER THAN `fetch` FOR ANYTHING THAT SENDS THE TOKEN. A call
 * that bypasses it still works today and quietly stops renewing, which nobody
 * notices until a player who opens the game daily is signed out a month later.
 */
async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  })
  const renewed = res.headers.get('X-Session-Token')
  if (renewed) {
    try {
      localStorage.setItem(TOKEN_KEY, renewed)
    } catch {
      // Site data blocked. The old token still works until it expires; there is
      // nothing better to do and it is not worth failing the request over.
    }
  }
  return res
}

export interface UsernameResult {
  ok: boolean
  username?: string
  /** A sentence to show the player. Always present when `ok` is false. */
  message?: string
}

/**
 * Claims or changes the username.
 *
 * Unlike sign-in, failures here are explained in detail — the player has to be
 * able to fix them, and none of the messages reveal anything about anyone
 * else's account.
 */
export async function saveUsername(username: string): Promise<UsernameResult> {
  const token = getToken()
  if (!token) return { ok: false, message: 'You are not signed in.' }

  try {
    const res = await authedFetch('/profile/username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    const body = (await res.json()) as { username?: string; message?: string }

    if (!res.ok) {
      return { ok: false, message: body.message ?? 'Could not save that name.' }
    }

    try {
      if (body.username) localStorage.setItem(NAME_KEY, body.username)
    } catch {
      // Not remembered locally; the server still has it.
    }
    return { ok: true, username: body.username }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

export interface KingdomStat {
  kingdomId: string
  matches: number
  wins: number
  top3: number
  playtimeSeconds: number
  damageDealt: number
  averagePlacement: number | null
  mastery: string | null
  masteryName: string | null
}

export interface DailyQuest {
  questId: string
  tier: 'easy' | 'medium' | 'hard'
  description: string
  progress: number
  target: number
  completed: boolean
  xp: number
  coins: number
}

export interface PlayerProfile {
  username: string | null
  needsUsername: boolean
  /** True until the age gate is answered. Onboarding must be resumable: a
   *  player who closed the tab halfway through has to be asked again. */
  needsAge: boolean
  /** Admin tools are shown for this account. The server decides; this is only
   *  what it said, and it re-checks before doing anything. */
  admin: boolean
  level: number
  xp: number
  xpIntoLevel: number
  /** 0 at the level cap, where there is nothing left to earn. */
  xpForNext: number
  kingdoms: KingdomStat[]
  coins: number
  /** kingdomId -> slot -> itemId. Only what is explicitly equipped. */
  loadout: Record<string, Partial<Record<CosmeticSlot, string>>>
  /** Ids this account owns. Defaults are not listed - everyone has those. */
  owned: string[]
  /** Every item, so the picker can name and paint one without a second call. */
  catalogue: CosmeticItem[]
  quests: DailyQuest[]
  /** ISO instant the day's quests refresh (10:00 CT). */
  questsResetAt: string | null
  totals: { matches: number; wins: number; playtimeSeconds: number }
}

/**
 * Re-reads the profile from the server.
 *
 * The local copy is a convenience, not the truth: a username changed on another
 * device, or an account swept away, is only visible by asking. Returns null when
 * the token is no longer good, which the caller treats as signed out.
 */
export async function fetchProfile(): Promise<PlayerProfile | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await authedFetch('/profile')
    if (res.status === 401) {
      signOut() // The token is dead; stop pretending we are signed in.
      return null
    }
    if (!res.ok) return null

    // Normalised at the boundary, once, rather than guarded at every point of
    // use. An older server, a partial response, or a field added later must
    // leave the profile page rendering something sensible instead of throwing
    // halfway through — a missing number is not a reason to show an error page.
    const raw = (await res.json()) as Partial<PlayerProfile>
    const body: PlayerProfile = {
      username: raw.username ?? null,
      needsUsername: raw.needsUsername ?? raw.username == null,
      needsAge: raw.needsAge ?? false,
      admin: raw.admin ?? false,
      level: raw.level ?? 1,
      xp: raw.xp ?? 0,
      xpIntoLevel: raw.xpIntoLevel ?? 0,
      xpForNext: raw.xpForNext ?? 0,
      kingdoms: raw.kingdoms ?? [],
      coins: raw.coins ?? 0,
      loadout: raw.loadout ?? {},
      owned: raw.owned ?? [],
      catalogue: raw.catalogue ?? [],
      quests: raw.quests ?? [],
      questsResetAt: raw.questsResetAt ?? null,
      totals: raw.totals ?? { matches: 0, wins: 0, playtimeSeconds: 0 },
    }
    try {
      if (body.username) localStorage.setItem(NAME_KEY, body.username)
    } catch {
      // Fine - display falls back to whatever is already stored.
    }
    return body
  } catch {
    return null
  }
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type CosmeticSlot = 'castle' | 'shield' | 'nameplate'

/** Mirrors the server's `data/cosmetics.Paint`. Every field is optional. */
export interface Paint {
  varies?: boolean
  variantSeed?: number
  /** Shrinks the castle body only, anchored at its footing. See CastleSprite. */
  scale?: number
  fill?: string
  outline?: string
  accent?: string
  strokeScale?: number
}

export interface CosmeticItem {
  id: string
  slot: CosmeticSlot
  kingdomId: string | null
  name: string
  rarity: Rarity
  price: number
  isDefault?: boolean
  requiresMastery?: string
  paint?: Paint
}

export interface ShopView {
  day: string
  resetsAt: string
  featured: CosmeticItem[]
  daily: CosmeticItem[]
  /** Ids this account owns. Defaults are not listed — everyone has those. */
  owned: string[]
  /** null for a guest, who has no balance rather than a balance of zero. */
  balance: number | null
  signedIn: boolean
}

/** Today's shop. Open to guests, who see prices but own nothing. */
export async function fetchShop(): Promise<ShopView | null> {
  try {
    const res = await authedFetch('/shop')
    if (!res.ok) return null
    const raw = (await res.json()) as Partial<ShopView>
    // Normalised at the boundary, as the profile is: a missing array must not
    // turn into a crash halfway down the page.
    return {
      day: raw.day ?? '',
      resetsAt: raw.resetsAt ?? '',
      featured: raw.featured ?? [],
      daily: raw.daily ?? [],
      owned: raw.owned ?? [],
      balance: raw.balance ?? null,
      signedIn: raw.signedIn ?? false,
    }
  } catch {
    return null
  }
}

export interface BuyResult {
  ok: boolean
  balance?: number
  message?: string
}

/**
 * Buys an item.
 *
 * ⚠️ ONLY THE ID IS SENT. Price and availability are the server's to decide —
 * a client that could name its own price is not a shop.
 */
export async function buyItem(itemId: string): Promise<BuyResult> {
  try {
    const res = await authedFetch('/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    })
    const body = (await res.json()) as { balance?: number; message?: string }
    if (!res.ok) return { ok: false, message: body.message ?? 'Could not buy that.' }
    return { ok: true, balance: body.balance }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

/**
 * Draws a new Featured page. Admins only — the server refuses everyone else,
 * which is the check that matters; the button is merely hidden from them.
 */
export async function rerollFeatured(): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await authedFetch('/admin/shop/reroll', { method: 'POST' })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      return { ok: false, message: body.message ?? 'Could not reroll the shop.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

export interface EquipResult {
  ok: boolean
  loadout?: Record<string, Partial<Record<CosmeticSlot, string>>>
  message?: string
}

/** Assigns a cosmetic to one kingdom. */
export async function equipItem(kingdomId: string, itemId: string): Promise<EquipResult> {
  try {
    const res = await authedFetch('/profile/equip', {
      method: 'POST',
      body: JSON.stringify({ kingdomId, itemId }),
    })
    const body = (await res.json()) as { loadout?: EquipResult['loadout']; message?: string }
    if (!res.ok) return { ok: false, message: body.message ?? 'Could not equip that.' }
    return { ok: true, loadout: body.loadout }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

export interface AgeResult {
  ok: boolean
  /** The account was refused and removed. They may still play as a guest. */
  tooYoung?: boolean
  message?: string
}

/**
 * Submits a date of birth to the age gate.
 *
 * ⚠️ THE DATE IS SENT ONCE AND NEVER STORED — the server checks it, keeps only
 * an age bracket, and discards the rest. An under-13 account is deleted server
 * side before this resolves.
 */
export async function saveAge(birthDate: string): Promise<AgeResult> {
  try {
    const res = await authedFetch('/profile/age', {
      method: 'POST',
      body: JSON.stringify({ birthDate }),
    })
    if (res.ok) return { ok: true }
    const body = (await res.json()) as { error?: string; message?: string }
    return { ok: false, tooYoung: body.error === 'TOO_YOUNG', message: body.message }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

/**
 * Downloads everything we hold about this account (GDPR Art. 20).
 *
 * Fetched rather than linked, because the endpoint needs an Authorization
 * header that a plain anchor cannot send.
 */
export async function exportMyData(): Promise<boolean> {
  const token = getToken()
  if (!token) return false
  try {
    const res = await authedFetch('/profile/export')
    if (!res.ok) return false

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'elementals-data.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

/** Permanently deletes the account (GDPR Art. 17). */
export async function deleteMyAccount(): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await authedFetch('/profile/delete', { method: 'POST' })
    if (res.ok) {
      signOut()
      return { ok: true }
    }
    const body = (await res.json()) as { message?: string }
    return { ok: false, message: body.message ?? 'Could not delete right now.' }
  } catch {
    return { ok: false, message: 'Could not reach the server. Try again.' }
  }
}

export function signOut(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
  } catch {
    // Nothing stored, nothing to clear.
  }
  // Drop the account from the socket as well. Leaving it attached would keep a
  // signed-out tab holding admin rights on the server until it reconnects.
  void refreshSocketAccount()
}

/**
 * Re-presents whatever token we now hold to the live socket.
 *
 * Sign-in and sign-out both change who we are mid-connection, and the socket
 * learned our account once, at connect. This is how it finds out.
 */
async function refreshSocketAccount(): Promise<void> {
  try {
    const { admin } = await authenticate(socket, getToken())
    setAdmin(admin)
  } catch {
    // Socket down: it authenticates again on its next connect anyway.
  }
}
