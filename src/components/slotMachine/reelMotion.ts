// The physics of a slot reel, kept pure so the motion can be reasoned about
// (and tested) without a canvas or a clock.
//
// A reel's position is a FLOAT index into the symbol strip: 4.0 sits exactly on
// symbol 4, 4.5 is halfway between 4 and 5 and scrolls that far past the window.
// Everything else — the blur, the strip offset, where it lands — falls out of
// that one number.
//
// Position only ever increases, and the strip is rendered scrolling DOWNWARD
// from it: the symbol arriving slides in from the top of the window and the one
// leaving drops out of the bottom, the way a real reel turns toward you.

/** The reel strip, matching the server's `SYMBOL_POOL` symbols. */
export const SYMBOLS = ['🪙', '🗡️', '🛡️', '🏰', '👑', '💎', '7️⃣'] as const

/** How long the reels take to wind up to full speed after the pull (ms). */
export const SPIN_UP_MS = 900

/**
 * How long the reels hold at cruise before the first one starts to slow (ms).
 * The server usually answers a pull almost instantly; without this floor the
 * reels would begin settling before they had visibly got going.
 */
export const MIN_CRUISE_MS = 700

/** Cruise speed once wound up, in symbols per second. */
export const CRUISE_SPEED = 22

/** How long one reel takes to slow from cruise to a dead stop (ms). */
export const DECEL_MS = 1250

/** Gap between one reel locking and the next starting to slow (ms). */
export const STAGGER_MS = 620

/** Minimum symbols a reel travels while decelerating, so it never jerks to a
 *  halt on a symbol that was already in the window. */
const MIN_TRAVEL = 14

/** Beat between the last reel locking and the verdict appearing (ms). */
export const VERDICT_DELAY_MS = 420

/** How long the verdict holds before the cabinet packs itself away (ms). */
export const VERDICT_HOLD_MS = 7000

/** When reel `i` finishes decelerating, relative to the first reel starting to
 *  slow (ms). */
export function reelStopMs(i: number): number {
  return STAGGER_MS * i + DECEL_MS
}

/**
 * Speed during the wind-up, in symbols/sec. Quadratic rather than linear so it
 * leans into the acceleration — a real reel is dragged up to speed, it doesn't
 * snap there.
 */
export function spinUpSpeed(elapsedMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / SPIN_UP_MS))
  return CRUISE_SPEED * t * t
}

/** Distance covered by the wind-up ramp, in symbols — the integral of the above. */
export function spinUpDistance(elapsedMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / SPIN_UP_MS))
  const ramp = (CRUISE_SPEED * (SPIN_UP_MS / 1000) * t * t * t) / 3
  const cruise = Math.max(0, elapsedMs - SPIN_UP_MS) / 1000 * CRUISE_SPEED
  return ramp + cruise
}

/**
 * Where a reel sitting at `from` must travel to so it lands dead on
 * `finalIndex`, having covered at least MIN_TRAVEL symbols on the way. The
 * result is always ahead of `from`, so a reel only ever slows down — it never
 * backs up to find its symbol.
 */
export function landingTarget(
  from: number,
  finalIndex: number,
  symbolCount = SYMBOLS.length,
): number {
  const earliest = from + MIN_TRAVEL
  // The next position at or past `earliest` whose symbol is `finalIndex`.
  const loops = Math.ceil((earliest - finalIndex) / symbolCount)
  return finalIndex + loops * symbolCount
}

/**
 * Deceleration curve, 0→1. A strong easeOut: most of the ground is covered
 * early and the last symbol crawls into place, which is what makes a reel feel
 * like it is *settling* rather than stopping.
 */
export function decelEase(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - p, 3)
}

/** The symbol showing in the window at position `pos`. */
export function symbolAt(pos: number): string {
  const i = ((Math.round(pos) % SYMBOLS.length) + SYMBOLS.length) % SYMBOLS.length
  return SYMBOLS[i]!
}

/**
 * How far the strip is scrolled out of the window, -0.5→0.5 of a cell. The
 * component translates the strip DOWN by this, so a rising position scrolls the
 * symbols downward through the window.
 */
export function stripOffset(pos: number): number {
  const frac = pos - Math.round(pos)
  return frac
}

/**
 * Motion blur for a reel travelling at `speed` symbols/sec, in px. Capped so a
 * fast reel stays a streak rather than a smear.
 */
export function blurFor(speed: number): number {
  return Math.min(7, (Math.abs(speed) / CRUISE_SPEED) * 7)
}
