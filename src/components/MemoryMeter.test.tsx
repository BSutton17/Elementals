import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryMeter } from './MemoryMeter'

// Ancient Memory is the price of Kitsune Rush. Its raw scale is deliberately
// hidden — "how full" is the only part a player can act on.
describe('MemoryMeter', () => {
  it('shows progress as a percentage, never the raw number', () => {
    const { getByTestId } = render(<MemoryMeter meter={3000} full={6000} />)
    const text = getByTestId('memory-meter').textContent!
    expect(text).toContain('50%')
    expect(text).not.toContain('6000')
    expect(text).not.toContain('3000')
  })

  it('reads READY at a full meter — that is the castable signal', () => {
    const { getByTestId } = render(<MemoryMeter meter={6000} full={6000} />)
    expect(getByTestId('memory-meter').textContent).toContain('READY')
  })

  it('takes its cap from the server, not a local constant', () => {
    const { getByTestId } = render(<MemoryMeter meter={500} full={1000} />)
    expect(getByTestId('memory-meter').textContent).toContain('50%')
  })

  it('never overfills or reports a negative', () => {
    // Scoped to each render's own container — two renders share a document.
    const over = render(<MemoryMeter meter={99_999} full={6000} />)
    expect(over.container.textContent).toContain('READY')
    const under = render(<MemoryMeter meter={-50} full={6000} />)
    expect(under.container.textContent).toContain('0%')
  })
})
