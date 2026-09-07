/**
 * Per-device settings for how hard this phone works.
 *
 * ⚠️ PER DEVICE, NOT PER ACCOUNT, AND THAT IS THE WHOLE POINT. These answer
 * "what can the thing in my hand cope with", which is a property of the
 * hardware and not of the person. The same player on a laptop and on a four
 * year old phone wants different answers, and syncing the choice to their
 * account would give them one.
 *
 * ⚠️ AND NEITHER OF THEM TOUCHES THE MATCH. The simulation runs on the server at
 * a fixed rate for everybody; these change how often this client is TOLD about
 * it and how much work it does drawing it. Nobody else's game is affected, and
 * nothing about the rules changes.
 */

export type SyncRate = 'normal' | 'reduced'

export interface DisplaySettings {
  /** Drop the expensive drawing: filters, glass, ambient motion. */
  batterySaver: boolean
  /** How often the server sends this client the state of the match. */
  syncRate: SyncRate
}

const KEY = 'kingdoms.display'

const DEFAULTS: DisplaySettings = {
  // Both default OFF. A setting that quietly degrades the game for everyone who
  // never opens the menu is not a setting, it is a decision.
  batterySaver: false,
  syncRate: 'normal',
}

let current: DisplaySettings = { ...DEFAULTS }
const listeners = new Set<(s: DisplaySettings) => void>()

/** Reads the stored settings. Never throws — storage can be unavailable. */
function load(): DisplaySettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>
    return {
      batterySaver: parsed.batterySaver === true,
      syncRate: parsed.syncRate === 'reduced' ? 'reduced' : 'normal',
    }
  } catch {
    // Private browsing, disabled storage, or something that is not our JSON.
    // The defaults are always a valid answer.
    return { ...DEFAULTS }
  }
}

/**
 * Puts the battery-saver flag on the document root, where the stylesheets can
 * see it.
 *
 * ⚠️ AN ATTRIBUTE ON `<html>`, NOT A CLASS ON THE APP. The heaviest things it
 * turns off — the ability bar's glass, full-screen overlays — are painted
 * outside the React root, and some of them before it mounts.
 */
function applyToDocument(settings: DisplaySettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (settings.batterySaver) root.setAttribute('data-fx', 'low')
  else root.removeAttribute('data-fx')
}

/** Loads from storage and applies. Call once, as early as possible. */
export function initDisplaySettings(): DisplaySettings {
  current = load()
  applyToDocument(current)
  return current
}

export function getDisplaySettings(): DisplaySettings {
  return current
}

export function subscribeDisplaySettings(fn: (s: DisplaySettings) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Changes one or both settings, persists them, and tells everyone who cares. */
export function setDisplaySettings(patch: Partial<DisplaySettings>): DisplaySettings {
  current = { ...current, ...patch }
  applyToDocument(current)
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Unstorable is not unusable: the setting still applies for this session.
  }
  for (const fn of listeners) fn(current)
  return current
}

/** Test seam: forget everything, as though the app had just started. */
export function resetDisplaySettingsForTest(): void {
  current = { ...DEFAULTS }
  applyToDocument(current)
  listeners.clear()
}
