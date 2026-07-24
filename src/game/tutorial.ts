// Tutorial persistence helpers: remembers (per browser) that the player has
// opened the How to Play walkthrough so the menu can stop nudging them.

const SEEN_KEY = 'elementals:howToPlaySeen'

/** True once the player has opened the tutorial at least once on this device. */
export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    // Storage unavailable (private mode / disabled) — treat as seen so the
    // nudge never becomes a permanent fixture.
    return true
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Best effort only.
  }
}

/** Test helper: forget that the tutorial was seen. */
export function clearTutorialSeen(): void {
  try {
    localStorage.removeItem(SEEN_KEY)
  } catch {
    // Best effort only.
  }
}
