import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * No skin may put a CSS transform animation and a `transform` attribute on the
 * same element.
 *
 * ⚠️ THIS BUG IS INVISIBLE IN EVERY PREVIEW. A CSS `transform` beats the
 * `transform` presentation attribute on the same node, so the moment an
 * animated class takes hold it REPLACES whatever the attribute was doing. A
 * static render applies no CSS at all, which means the skin sheets, the shop
 * previews and every screenshot show the correct picture while the game shows
 * something else.
 *
 * It shipped twice before this test existed:
 *  · Water's Leviathan mirrored its two fins with `scale(-1 1)` on the same
 *    group as `.skin__fin`. In the game the left fin flipped onto the right
 *    one and the beast had one fin.
 *  · Air's Storm Titan rotated each scrap of debris on the same element as
 *    `.skin__debris`, so every scrap lay flat instead of at its angle.
 *
 * The fix in both cases is one wrapper: attribute on the outer element,
 * animated class on the inner one.
 */

const DIR = join(import.meta.dirname, '.')
const css = readFileSync(join(DIR, 'skins.css'), 'utf8')

/** Classes whose CSS sets a transform, directly or through their keyframes. */
function transformingClasses(): Set<string> {
  const keyframes = new Set<string>()
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
    if (m[2]!.includes('transform:')) keyframes.add(m[1]!)
  }

  const classes = new Set<string>()
  for (const m of css.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const [, name, body] = m as unknown as [string, string, string]
    if (body.includes('transform:')) classes.add(name)
    const anim = /animation:\s*([\w-]+)/.exec(body)
    if (anim && keyframes.has(anim[1]!)) classes.add(name)
  }
  return classes
}

/** Every JSX opening tag carrying both a className and a transform attribute. */
function clashes(source: string, file: string, risky: Set<string>) {
  const found: string[] = []
  for (const m of source.matchAll(/<(\w+)\s([^>]*?)\/?>/gs)) {
    const tag = m[0]
    if (!tag.includes('className=') || !tag.includes('transform=')) continue
    const cls = /className="([^"]*)"/.exec(tag) ?? /className=\{`([^`]*)`\}/.exec(tag)
    if (!cls) continue
    for (const name of cls[1]!.trim().split(/\s+/)) {
      if (!risky.has(name)) continue
      const line = source.slice(0, m.index).split('\n').length
      found.push(`${file}:${line} .${name} is animated AND the element sets transform=`)
    }
  }
  return found
}

describe('skin transforms', () => {
  it('never animates a transform on an element that also has a transform attribute', () => {
    const risky = transformingClasses()
    expect(risky.size).toBeGreaterThan(0) // the parse still works

    const offenders = readdirSync(DIR)
      .filter((f) => f.endsWith('Decor.tsx'))
      .flatMap((f) => clashes(readFileSync(join(DIR, f), 'utf8'), f, risky))

    expect(offenders).toEqual([])
  })
})
