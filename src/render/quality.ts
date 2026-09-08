// Renderer quality (mobile performance). Decides how many PIXELS the effects
// are drawn into — never how many effects there are.
//
// ⚠️ THE EFFECTS THEMSELVES ARE NOT TOUCHED. Particle counts, colours, timings
// and every kingdom's look stay exactly as authored. What changes is the
// resolution the canvas rasterises at, which is invisible at phone viewing
// distance and is where the frame time actually goes.
//
// WHY THIS IS THE LEVER. Two full Pixi canvases are mounted at once — a front
// stage for everything over the castles and a back stage for `behind` auras —
// and both were initialising with `resolution: window.devicePixelRatio`. A
// modern phone reports 3, and some report 4. At DPR 3 each canvas rasterises
// NINE times the logical pixels, and there are two of them, so the GPU is
// filling eighteen times the area of a 1× render before a single particle is
// considered. Antialias sits on top of that, multisampling every one of those
// pixels.
//
// Six or seven kingdoms is simply when that fixed cost stops fitting in a
// frame: the per-effect work rises with the field while the per-pixel work was
// already consuming the budget.

import { getDisplaySettings } from '../game/displaySettings'

/** What the renderer should be built with on this device. */
export interface RenderQuality {
  /** Device pixel ratio to rasterise at. */
  resolution: number;
  /** Whether to ask the GPU for multisampling. */
  antialias: boolean;
  /** True when this device was treated as constrained. */
  reduced: boolean;
  /**
   * Ceiling on rendered frames per second. `0` means uncapped (Pixi's default,
   * i.e. whatever the display asks for).
   *
   * ⚠️ THIS IS A FRAME CAP, NOT A SPEED CHANGE. Every system in the framework
   * is driven by `update(deltaMS)`, so an effect covers the same ground in the
   * same wall-clock time at 30fps as at 60 — it is drawn half as often, not
   * played half as fast.
   */
  maxFps: number;
}

/**
 * The ceiling on device pixel ratio.
 *
 * Two is the point where more pixels stop being visible on a hand-held screen —
 * the difference between 2x and 3x at arm's length is below what the eye
 * resolves, while the cost is 2.25x the fill rate. Desktops are capped too:
 * a 4K monitor at DPR 2 gains nothing from a third sample either, and the
 * saving buys headroom for a seven-kingdom fight.
 */
const MAX_RESOLUTION = 2;

/**
 * Below this, a device is treated as constrained and rendered at 1.5x.
 *
 * `hardwareConcurrency` is the most widely supported signal that separates a
 * budget phone from a flagship; `deviceMemory` is better but Safari does not
 * report it, which is most of the mobile audience this is for.
 */
const LOW_CORE_COUNT = 4;

interface QualityInputs {
  devicePixelRatio: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  /** The player's own battery-saver switch. Overrules what the device claims. */
  batterySaver?: boolean;
}

/**
 * Chooses renderer settings from what the device reports.
 *
 * Pure and injectable so the policy can be tested without a browser — the
 * decision is the thing worth pinning, not the fact that it reads `window`.
 */
export function chooseQuality(inputs: QualityInputs): RenderQuality {
  // ⚠️ THE PLAYER'S SWITCH BEATS EVERY HARDWARE GUESS, and it used not to reach
  // this function at all: battery saver dropped filters and glass out of the
  // CSS while the canvas underneath carried on rasterising at 2x device pixels,
  // sixty times a second, on two mounted stages. That is why a phone with the
  // setting ON still got hot — the setting was never wired to the renderer.
  //
  // 1x instead of 2x is a QUARTER of the pixels per canvas; the frame cap
  // halves how often those pixels are drawn. Neither changes what is on screen.
  if (inputs.batterySaver === true) {
    return { resolution: 1, antialias: false, reduced: true, maxFps: 30 };
  }

  const dpr = Number.isFinite(inputs.devicePixelRatio) && inputs.devicePixelRatio > 0
    ? inputs.devicePixelRatio
    : 1;

  const cores = inputs.hardwareConcurrency ?? 0;
  const memory = inputs.deviceMemory ?? 0;
  // Only trust these when they are actually reported; an absent value is not
  // evidence of a weak device.
  const constrained =
    (cores > 0 && cores <= LOW_CORE_COUNT) || (memory > 0 && memory <= 4);

  const ceiling = constrained ? 1.5 : MAX_RESOLUTION;
  const resolution = Math.min(dpr, ceiling);

  return {
    resolution,
    // ⚠️ REDUNDANT ABOVE 1x, EXPENSIVE EVERYWHERE. Rendering at 1.5x or 2x
    // already supersamples every edge; asking the GPU to multisample on top
    // pays twice for the same smoothing, and multisampling is disproportionately
    // costly on the tile-based GPUs phones use. Kept ON at exactly 1x, where it
    // is the only thing softening an edge.
    antialias: resolution < 1.5,
    reduced: resolution < dpr,
    // Uncapped unless the player asked otherwise. A constrained device is not
    // reason enough on its own: dropping frames for somebody who never asked
    // for it is exactly the "quietly degrades the game" decision the settings
    // module refuses to make.
    maxFps: 0,
  };
}

/** Reads the current device and chooses. Falls back to 1x off-browser. */
export function detectQuality(): RenderQuality {
  if (typeof window === 'undefined') {
    return { resolution: 1, antialias: true, reduced: false, maxFps: 0 };
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return chooseQuality({
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    batterySaver: getDisplaySettings().batterySaver,
  });
}
