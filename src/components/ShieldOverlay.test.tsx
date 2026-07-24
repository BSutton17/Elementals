import { test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ShieldOverlay } from './ShieldOverlay'

afterEach(cleanup)

const draw = (sides?: number) =>
  render(
    <svg>
      <ShieldOverlay shield={2000} color="#c9a56b" sides={sides} />
    </svg>,
  ).container

test('a normal shield is a circle', () => {
  const c = draw()
  expect(c.querySelector('circle.kingdom-site__shield-shape')).not.toBeNull()
  expect(c.querySelector('polygon.kingdom-site__shield-shape')).toBeNull()
})

test("Earth's ultimate shield is a hexadecagon (16 sides), not a circle", () => {
  const c = draw(16)
  const poly = c.querySelector('polygon.kingdom-site__shield-shape')
  expect(poly).not.toBeNull()
  expect(c.querySelector('circle.kingdom-site__shield-shape')).toBeNull()
  // 16 vertices, each an "x,y" pair.
  expect(poly!.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(16)
})

test('the fortress shield cracks later than a normal one (bigger pool)', () => {
  // 800 HP: already cracking for a circle (threshold 500 < 800? no) — use 600,
  // which is under the fortress threshold (1000) but over the circle one (500).
  const circle = render(
    <svg>
      <ShieldOverlay shield={600} color="#c9a56b" />
    </svg>,
  ).container
  expect(circle.querySelector('.kingdom-site__shield-cracks')).toBeNull() // 600 > 500

  const fortress = render(
    <svg>
      <ShieldOverlay shield={600} color="#c9a56b" sides={16} />
    </svg>,
  ).container
  expect(fortress.querySelector('.kingdom-site__shield-cracks')).not.toBeNull() // 600 <= 1000
})
