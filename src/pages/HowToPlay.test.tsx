import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HowToPlay } from './HowToPlay'
import { clearTutorialSeen, hasSeenTutorial } from '../game/tutorial'

const noop = () => {}

describe('HowToPlay', () => {
  beforeEach(() => {
    clearTutorialSeen()
  })

  it('opens on the welcome page and marks the tutorial as seen', () => {
    expect(hasSeenTutorial()).toBe(false)
    render(<HowToPlay onClose={noop} />)
    expect(screen.getByTestId('howto-page-throne')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: /seven kingdoms\. one throne\./i }),
    ).toBeTruthy()
    expect(hasSeenTutorial()).toBe(true)
  })

  it('pages forward and back with the nav buttons', () => {
    render(<HowToPlay onClose={noop} />)
    const back = screen.getByRole('button', { name: /back/i }) as HTMLButtonElement
    expect(back.disabled).toBe(true) // nowhere to go back to

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByTestId('howto-page-arena')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByTestId('howto-page-throne')).toBeTruthy()
  })

  it('jumps straight to a page from the progress dots', () => {
    render(<HowToPlay onClose={noop} />)
    fireEvent.click(screen.getByRole('tab', { name: /page 8: the kingdoms/i }))
    expect(screen.getByTestId('howto-page-kingdoms')).toBeTruthy()
  })

  it('supports arrow-key paging and Escape to close', () => {
    const onClose = vi.fn()
    render(<HowToPlay onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('howto-page-arena')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByTestId('howto-page-throne')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes via the skip button', () => {
    const onClose = vi.fn()
    render(<HowToPlay onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close tutorial/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ends on the send-off page whose CTA closes the walkthrough', () => {
    const onClose = vi.fn()
    render(<HowToPlay onClose={onClose} />)
    fireEvent.click(screen.getByRole('tab', { name: /page 9: ready/i }))
    expect(screen.getByTestId('howto-page-sendoff')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sendoff-cta'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the economy demo hires a citizen for gold', () => {
    render(<HowToPlay onClose={noop} />)
    fireEvent.click(screen.getByRole('tab', { name: /page 3: gold & citizens/i }))

    const hire = screen.getByTestId('hire-citizen')
    expect(screen.getByText('10 citizens')).toBeTruthy()
    fireEvent.click(hire)
    expect(screen.getByText('11 citizens')).toBeTruthy()
  })

  it('the targeting demo locks on when the dummy castle is clicked', () => {
    render(<HowToPlay onClose={noop} />)
    fireEvent.click(screen.getByRole('tab', { name: /page 4: targeting/i }))

    expect(screen.getByTestId('target-hint')).toBeTruthy()
    expect(screen.queryByTestId('target-ring')).toBeNull()

    fireEvent.click(screen.getByTestId('kingdom-site'))
    expect(screen.queryByTestId('target-hint')).toBeNull()
    expect(screen.getByTestId('target-ring')).toBeTruthy()
  })

  it('the arsenal demo casts with the real ability bar and damages the dummy', () => {
    render(<HowToPlay onClose={noop} />)
    fireEvent.click(screen.getByRole('tab', { name: /page 5: your arsenal/i }))

    expect(screen.getByTestId('ability-bar')).toBeTruthy()
    const castle = screen.getByTestId('kingdom-site')
    const barBefore = castle.querySelector('[data-testid="health-bar"]')
    expect(barBefore?.getAttribute('data-hp')).toBe('10000')

    fireEvent.click(screen.getByRole('button', { name: /cast water ball/i }))
    const barAfter = castle.querySelector('[data-testid="health-bar"]')
    expect(barAfter?.getAttribute('data-hp')).toBe('9700')
  })

  it('the defense demo buys a shield from the real shop', () => {
    render(<HowToPlay onClose={noop} />)
    fireEvent.click(screen.getByRole('tab', { name: /page 7: defense/i }))

    expect(screen.getByTestId('shop-overlay')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /buy \(250g\)/i }))
    // The shop now reports the shield as active.
    expect(screen.getByText(/active shield/i)).toBeTruthy()
    expect(screen.getByText(/1000 HP/i)).toBeTruthy()
  })
})
