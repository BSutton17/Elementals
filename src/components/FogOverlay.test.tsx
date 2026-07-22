import { test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { FogOverlay } from './FogOverlay'

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
