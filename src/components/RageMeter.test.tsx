import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { RageMeter, RAGE_FULL_FALLBACK } from './RageMeter'

// The cap belongs to the SERVER (`DARK.RAGE_FULL`, shipped as
// `config.rageFull`). This component used to keep its own copy and went on
// advertising a stale cap for a whole retune after the engine moved on — the
// meter looked authoritative and was simply wrong.

describe('RageMeter', () => {
  it('reads its cap from the server, not from a constant of its own', () => {
    const { getByTestId } = render(<RageMeter meter={0} full={2500} />)
    expect(getByTestId('rage-meter').textContent).toContain('0 / 2500')
  })

  it('follows the server wherever the cap is retuned to', () => {
    const { getByTestId } = render(<RageMeter meter={900} full={4000} />)
    expect(getByTestId('rage-meter').textContent).toContain('900 / 4000')
  })

  it('fills proportionally to the server cap', () => {
    const { container } = render(<RageMeter meter={1250} full={2500} />)
    const fill = container.querySelector('.rage-meter__fill') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })

  it('reads READY at full and never overfills', () => {
    const { getByTestId, container } = render(<RageMeter meter={9999} full={2500} />)
    expect(getByTestId('rage-meter').textContent).toContain('READY')
    expect(getByTestId('rage-meter').className).toContain('rage-meter--full')
    expect((container.querySelector('.rage-meter__fill') as HTMLElement).style.width).toBe('100%')
  })

  it('falls back to its own constant before the config arrives', () => {
    // Asserted against the constant rather than against a literal: pinning a
    // number here is how this drifted in the first place, and a retune should
    // move the fallback, not break the test.
    const { getByTestId } = render(<RageMeter meter={0} />)
    expect(getByTestId('rage-meter').textContent).toContain(`0 / ${RAGE_FULL_FALLBACK}`)
  })

  it('lets the server override the fallback, whatever the fallback says', () => {
    // The actual guarantee: once a cap arrives, the local constant is ignored.
    const other = RAGE_FULL_FALLBACK + 1234
    const { getByTestId } = render(<RageMeter meter={0} full={other} />)
    expect(getByTestId('rage-meter').textContent).toContain(`0 / ${other}`)
  })
})
