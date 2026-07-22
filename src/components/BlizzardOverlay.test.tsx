import { test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { BlizzardOverlay } from './BlizzardOverlay'

afterEach(cleanup)

test('blizzard overlay renders a click-through canvas and toggles safely', () => {
  // jsdom has no 2D canvas context, so the storm animation is skipped — but
  // mounting, starting/ending the blizzard, and unmounting must never throw.
  const { container, rerender } = render(<BlizzardOverlay active={false} />)
  const canvas = container.querySelector('canvas.blizzard-overlay')
  expect(canvas).not.toBeNull()

  expect(() => rerender(<BlizzardOverlay active={true} />)).not.toThrow()
  expect(() => rerender(<BlizzardOverlay active={false} />)).not.toThrow()
})
