/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { CrawlerSwarm, stepMotion, type CrawlerMotion } from './CrawlerSwarm'

afterEach(cleanup)

// Insects' "Creepy Crawlers", victim side. What the ability really takes is
// ATTENTION — the bugs are in the way, eat the clicks meant for the buttons
// underneath, and only go away when they are dealt with.

describe('the crawling bugs', () => {
  it('shows nothing when there is no swarm', () => {
    const { container } = render(
      <CrawlerSwarm bugHits={null} hitsToKill={2} onSquash={() => {}} />,
    )
    expect(container.querySelector('[data-testid="crawler-swarm"]')).toBeNull()
  })

  it('draws one bug per living crawler', () => {
    const { container } = render(
      <CrawlerSwarm bugHits={[0, 0, 0]} hitsToKill={2} onSquash={() => {}} />,
    )
    expect(container.querySelectorAll('.crawlers__bug')).toHaveLength(3)
  })

  it('takes a squashed bug off the screen and leaves the rest', () => {
    const { container } = render(
      <CrawlerSwarm bugHits={[2, 1, 0]} hitsToKill={2} onSquash={() => {}} />,
    )
    // Bug 0 is dead; bug 1 has been hit once and is still crawling.
    expect(container.querySelector('[data-testid="crawler-0"]')).toBeNull()
    expect(container.querySelector('[data-testid="crawler-1"]')).not.toBeNull()
    expect(container.querySelectorAll('.crawlers__bug')).toHaveLength(2)
  })

  it('reports a hit, and never decides a kill for itself', () => {
    const onSquash = vi.fn()
    const { container } = render(
      <CrawlerSwarm bugHits={[0, 0, 0]} hitsToKill={2} onSquash={onSquash} />,
    )
    fireEvent.click(container.querySelector('[data-testid="crawler-1"]')!)
    // The index and nothing else: the server owns whether that finished it.
    expect(onSquash).toHaveBeenCalledWith(1)
    // …and the bug is still on screen until the server says otherwise.
    expect(container.querySelector('[data-testid="crawler-1"]')).not.toBeNull()
  })

  it('gives each bug a different icon', () => {
    const { container } = render(
      <CrawlerSwarm bugHits={[0, 0, 0]} hitsToKill={2} onSquash={() => {}} />,
    )
    const paths = [...container.querySelectorAll('.crawlers__bug svg')].map(
      (svg) => svg.innerHTML,
    )
    expect(new Set(paths).size).toBe(3)
  })

  it('starts each bug somewhere of its own', () => {
    const { container } = render(
      <CrawlerSwarm bugHits={[0, 0, 0]} hitsToKill={2} onSquash={() => {}} />,
    )
    const spots = [...container.querySelectorAll<HTMLElement>('.crawlers__bug')].map(
      (b) => b.style.transform,
    )
    for (const t of spots) expect(t).toMatch(/^translate3d\(/)
    expect(new Set(spots).size).toBe(3)
  })

  it('drives the wander per frame rather than by keyframes', () => {
    // A keyframed path can only run straight between fixed waypoints, and its
    // rotation is whatever was written down rather than wherever the bug is
    // actually going — so it spends most of its time walking sideways.
    const css = readFileSync('src/components/crawlers/CrawlerSwarm.css', 'utf8')
    expect(css).not.toMatch(/@keyframes crawler-wander/)
    const bug = /\.crawlers__bug \{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(bug).not.toMatch(/animation-name/)
  })

  it('stops the legs when a bug stops walking', () => {
    // A bug that pauses to look around but keeps working its legs reads as
    // broken rather than as alive.
    const css = readFileSync('src/components/crawlers/CrawlerSwarm.css', 'utf8')
    expect(css).toMatch(/data-moving='false'[\s\S]*?animation-play-state:\s*paused/)
  })

  it('sits above absolutely everything, and only the bugs take clicks', () => {
    // Being in the way IS the ability: an overlay that could be clicked through
    // would be scenery. jsdom applies no stylesheets, so the CSS is read.
    const css = readFileSync('src/components/crawlers/CrawlerSwarm.css', 'utf8')
    const layer = /\.crawlers\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    const z = Number(/z-index:\s*(\d+)/.exec(layer)?.[1])
    // Higher than Hack (9999), the highest overlay in the game.
    expect(z).toBeGreaterThanOrEqual(10000)
    // The container is click-through; the bugs themselves are not.
    expect(layer).toMatch(/pointer-events:\s*none/)
    const bug = /\.crawlers__bug\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(bug).toMatch(/pointer-events:\s*auto/)
  })
})

describe('the crawl itself', () => {
  // The motion is stepped by hand, so the steering can be tested directly
  // without a frame loop or a layout engine.
  const w = 1280
  const h = 720

  /**
   * Walks `m` for `seconds` and reports how far it actually travelled and how
   * much it turned in TOTAL.
   *
   * Both are accumulated per step rather than measured start-to-finish: the
   * heading is a random walk, so a bug can curve right round and come back
   * near where it started, which would make a net measurement read as "it
   * never moved" or "it never turned" when it did plenty of both.
   */
  const walk = (m: CrawlerMotion, seconds: number, dt = 1 / 60) => {
    let travelled = 0
    let turned = 0
    for (let t = 0; t < seconds; t += dt) {
      const before = { x: m.x, y: m.y, heading: m.heading }
      stepMotion(m, dt)
      travelled += Math.hypot(m.x - before.x, m.y - before.y)
      turned += Math.abs(m.heading - before.heading)
    }
    return { travelled, turned }
  }
  const makeMotion = (over: Partial<CrawlerMotion> = {}): CrawlerMotion => ({
    x: w / 2,
    y: h / 2,
    heading: 0,
    speed: 40,
    turn: 0,
    pausing: 0,
    untilPause: 999, // no pauses unless a test asks for them
    size: 50,
    ...over,
  })

  it('actually goes somewhere', () => {
    const { travelled } = walk(makeMotion(), 3)
    expect(travelled).toBeGreaterThan(60)
  })

  it('turns as it goes, rather than running in a straight line', () => {
    // Averaged over a dozen bugs: the turn rate is a random walk, so any ONE
    // of them can happen to hold a near-straight line for six seconds. That a
    // single bug might is fine; that they all would is the actual defect.
    const walks = Array.from({ length: 12 }, () => walk(makeMotion(), 6).turned)
    const mean = walks.reduce((a, b) => a + b, 0) / walks.length
    expect(mean).toBeGreaterThan(1)
  })

  it('crawls slowly — a nuisance to hunt down, not something to chase', () => {
    const { travelled } = walk(makeMotion(), 1)
    // Under a tenth of the screen a second.
    expect(travelled).toBeLessThan(w / 10)
  })

  it('never escapes the screen, whichever way it was pointed', () => {
    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.3, -1.1]) {
      const m = makeMotion({ heading, speed: 52 })
      walk(m, 40)
      expect(m.x).toBeGreaterThanOrEqual(0)
      expect(m.y).toBeGreaterThanOrEqual(0)
      expect(m.x).toBeLessThanOrEqual(w)
      expect(m.y).toBeLessThanOrEqual(h)
    }
  })

  it('stops moving while it pauses, but keeps thinking about where to go', () => {
    const m = makeMotion({ pausing: 0.5 })
    const from = { x: m.x, y: m.y }
    const heading = m.heading
    stepMotion(m, 0.1)
    expect(m.x).toBe(from.x)
    expect(m.y).toBe(from.y)
    // The turn keeps drifting while stopped, so it often sets off a new way.
    expect(m.heading).not.toBe(heading)
  })

  it('takes breaks on its own', () => {
    const m = makeMotion({ untilPause: 0.2 })
    let paused = false
    for (let t = 0; t < 3; t += 1 / 60) {
      if (!stepMotion(m, 1 / 60)) paused = true
    }
    expect(paused).toBe(true)
  })
})
