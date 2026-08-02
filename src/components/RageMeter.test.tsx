import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { RageMeter } from './RageMeter'

// The cap belongs to the SERVER (`DARK.RAGE_FULL`, shipped as
// `config.rageFull`). This component used to keep its own copy and went on
// advertising "0 / 6000" for a whole retune after the engine moved to 2500 —
// the meter looked authoritative and was simply wrong.

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

  it('falls back to the current tuning before the config arrives', () => {
    // Not a licence to hardcode: this is only the pre-config frame.
    const { getByTestId } = render(<RageMeter meter={0} />)
    expect(getByTestId('rage-meter').textContent).toContain('0 / 2500')
  })
})
