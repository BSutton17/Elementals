import { useSyncExternalStore } from 'react'

/**
 * Whether the server has told this socket it is an admin.
 *
 * ⚠️ THIS IS A HINT FOR THE UI, NEVER A PERMISSION. It holds whatever the last
 * `conn:authenticate` reply said, and every admin action is re-checked on the
 * server against the account behind the token. Its only job is deciding what to
 * draw: a control nobody else can use should not be shown to everybody else.
 *
 * A tiny store rather than context because it is set once, from outside React,
 * at connect time, and read from a couple of leaf components.
 */
let admin = false
const listeners = new Set<() => void>()

export function setAdmin(next: boolean): void {
  if (admin === next) return
  admin = next
  for (const listener of listeners) listener()
}

export function isAdmin(): boolean {
  return admin
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Re-renders when the admin flag arrives (it lands after the first paint). */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, isAdmin, () => false)
}
