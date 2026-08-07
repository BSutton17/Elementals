/// <reference types="node" />
// The app tsconfig limits `types` to vite/client, but @types/node is installed
// — the reference above opts this file in so it can read the stylesheets.
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// `prefers-reduced-motion: reduce` asks for LESS MOTION. It does not ask for
// less information, and it is not a switch that turns a feature off.
//
// This exists because two abilities shipped broken on exactly that mistake.
// Kitsune Rush hid its streaks with `display: none`, so a player whose OS has
// animations disabled — a common Windows default — cast their ultimate and saw
// nothing whatsoever. Caprice froze its butterfly into a still image.
//
// jsdom applies no stylesheets and runs no animations, so NO rendering test can
// catch this. The stylesheets are read directly.

/** Every stylesheet that presents an ability to a player. */
const ABILITY_STYLES = [
  'src/components/kitsuneRush/KitsuneRushOverlay.css',
  'src/components/caprice/CapriceButterfly.css',
  'src/components/crawlers/CrawlerSwarm.css',
  'src/components/volcano/VolcanoLayer.css',
]

/** The contents of every `@media (prefers-reduced-motion: reduce)` block. */
function reducedBlocks(css: string): string[] {
  const blocks: string[] = []
  const marker = '@media (prefers-reduced-motion: reduce)'
  let from = css.indexOf(marker)
  while (from !== -1) {
    // Walk braces to the matching close — a regex cannot handle the nested
    // rules inside a media query.
    const open = css.indexOf('{', from)
    let depth = 0
    let i = open
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) break
    }
    blocks.push(css.slice(open + 1, i))
    from = css.indexOf(marker, i)
  }
  return blocks
}

describe('reduced motion never removes the ability itself', () => {
  it.each(ABILITY_STYLES)('%s hides nothing', (file) => {
    for (const block of reducedBlocks(readFileSync(file, 'utf8'))) {
      // The exact bug that made Kitsune Rush invisible.
      expect(block, `${file} hides an ability under reduced motion`).not.toMatch(
        /display:\s*none/,
      )
      expect(block, `${file} makes an ability transparent under reduced motion`).not.toMatch(
        /opacity:\s*0\s*[;}]/,
      )
      expect(block, `${file} scales an ability away under reduced motion`).not.toMatch(
        /visibility:\s*hidden/,
      )
    }
  })
})

describe('the presentation stays alive under reduced motion', () => {
  it('Kitsune Rush still draws its foxfire, only slower', () => {
    const css = readFileSync('src/components/kitsuneRush/KitsuneRushOverlay.css', 'utf8')
    const block = reducedBlocks(css).join('\n')
    // The drawing survives untouched. A stroke extending along its own path is
    // the mark APPEARING, not motion across the player's field of view, so
    // there is nothing to reduce here beyond the pace.
    expect(block).not.toMatch(/animation-name:\s*none/)
    expect(block).not.toMatch(/\.kitsune-rush__mark[^{]*\{[^}]*animation:\s*none/)
    // Slowed, and forcefully — each mark carries its own pace as an inline
    // style, which would otherwise win.
    expect(block).toMatch(/\.kitsune-rush__mark[\s\S]*?animation-duration:[^;]*!important/)
  })

  it('Caprice still beats its wings and moves its antennae', () => {
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const block = reducedBlocks(css).join('\n')
    // Whatever else is dropped, these two are never switched off — they are
    // small, slow and local, and they are what makes it look alive.
    expect(block).not.toMatch(/\.caprice__wing\s*,?[^{]*\{[^}]*animation:\s*none/)
    expect(block).not.toMatch(/\.caprice__antennae\s*,?[^{]*\{[^}]*animation:\s*none/)
  })

  it('Caprice still ARRIVES rather than blinking into existence', () => {
    // A butterfly that simply exists one frame later gives no sign an ultimate
    // was spent. The arrival is kept and calmed: the sparks glow up on the ring
    // and fade where they stand instead of being flung across the screen.
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const block = reducedBlocks(css).join('\n')
    // Re-pointed at a gentler keyframe set, never switched off.
    expect(block).toMatch(/\.caprice__spark[\s\S]*?animation-name:\s*caprice-gather-still/)
    expect(block).toMatch(/\.caprice__reveal[\s\S]*?animation-name:\s*caprice-reveal-still/)
    expect(block).not.toMatch(/\.caprice__spark\s*\{[^}]*animation:\s*none/)
    // …and those keyframes have to actually exist, or the name resolves to
    // nothing and the element renders in its static state — which for the
    // sparks means all forty-odd stacked on the centre of the board.
    for (const name of ['caprice-gather-still', 'caprice-reveal-still', 'caprice-flash-still']) {
      expect(css, `${name} is referenced but never defined`).toMatch(
        new RegExp('@keyframes\\s+' + name + '\\s*\\{'),
      )
    }
  })

  it('drops travel rather than everything', () => {
    // The parts that move THROUGH the field of view are the ones that cause
    // trouble, and they are the ones that should go.
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const block = reducedBlocks(css).join('\n')
    expect(block).toMatch(/\.caprice__body-group/) // the hovering drift
    expect(block).toMatch(/\.caprice__mote\b/) // the companions wandering
  })
})
