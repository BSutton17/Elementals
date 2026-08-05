import { test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { FogOverlay, VARIANTS } from './FogOverlay'

afterEach(cleanup)

test('fog overlay renders a click-through canvas and toggles safely', () => {
  // jsdom has no 2D canvas context, so the animation is skipped — but mounting,
  // toggling active, and unmounting must never throw.
  const { container, rerender } = render(<FogOverlay active={false} />)
  const canvas = container.querySelector('canvas.fog-overlay')
  expect(canvas).not.toBeNull()

  expect(() => rerender(<FogOverlay active={true} />)).not.toThrow()
  expect(() => rerender(<FogOverlay active={false} />)).not.toThrow()
})

test('Smoke Screen is Thick Fog in volcanic grey, not a second kind of blindness', () => {
  // Magma's Smoke Screen blinds exactly the way Air's Thick Fog does — same
  // wall, same density — so it deliberately reuses this overlay and changes
  // only the colour. If it ever grew its own layer set it would stop reading
  // as "you are blinded" and start reading as something new.
  expect(VARIANTS.smoke.layers).toBe(VARIANTS.fog.layers)
  expect(VARIANTS.smoke.crescent).toBe(VARIANTS.fog.crescent)
  expect(VARIANTS.smoke.rgb).not.toBe(VARIANTS.fog.rgb)

  // …and it is darker than the fog it borrows from.
  const brightness = (rgb: string) => {
    const [r, g, b] = rgb.split(',').map((n) => Number(n.trim()))
    return 0.299 * r! + 0.587 * g! + 0.114 * b!
  }
  expect(brightness(VARIANTS.smoke.rgb)).toBeLessThan(brightness(VARIANTS.fog.rgb) / 2)
})
