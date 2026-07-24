import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StartupScreen } from './StartupScreen'

const noop = () => {}

describe('StartupScreen', () => {
  it('renders the game title', () => {
    render(<StartupScreen name="" onName={noop} onJoin={noop} />)
    expect(screen.getByRole('heading', { name: 'Elementals' })).toBeTruthy()
  })

  it('disables Create Room while offline and shows the offline status', () => {
    const { container } = render(
      <StartupScreen name="Alice" onName={noop} onJoin={noop} />,
    )
    const create = screen.getByRole('button', {
      name: /create room/i,
    }) as HTMLButtonElement
    expect(create.disabled).toBe(true) // offline
    expect(container.querySelector('.startup__status--offline')).toBeTruthy()
  })

  it('navigates to the join screen', () => {
    const onJoin = vi.fn()
    render(<StartupScreen name="" onName={noop} onJoin={onJoin} />)
    fireEvent.click(screen.getByRole('button', { name: /join room/i }))
    expect(onJoin).toHaveBeenCalledTimes(1)
  })

  it('opens and closes the How to Play walkthrough', () => {
    render(<StartupScreen name="" onName={noop} onJoin={noop} />)
    expect(screen.queryByRole('dialog', { name: /how to play/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^how to play$/i }))
    expect(screen.getByRole('dialog', { name: /how to play/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /close tutorial/i }))
    expect(screen.queryByRole('dialog', { name: /how to play/i })).toBeNull()
  })
})
