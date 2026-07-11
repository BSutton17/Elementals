import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StartupScreen } from './StartupScreen'

const noop = () => {}

describe('StartupScreen', () => {
  it('renders the game title and tagline', () => {
    render(<StartupScreen name="" onName={noop} onJoin={noop} />)
    expect(screen.getByRole('heading', { name: 'Kingdoms' })).toBeTruthy()
    expect(screen.getByText(/last kingdom standing/i)).toBeTruthy()
  })

  it('disables Create Room while offline and shows the connecting state', () => {
    render(<StartupScreen name="Alice" onName={noop} onJoin={noop} />)
    const create = screen.getByRole('button', {
      name: /create room/i,
    }) as HTMLButtonElement
    expect(create.disabled).toBe(true) // offline
    expect(screen.getByText(/connecting to server/i)).toBeTruthy()
  })

  it('navigates to the join screen', () => {
    const onJoin = vi.fn()
    render(<StartupScreen name="" onName={noop} onJoin={onJoin} />)
    fireEvent.click(screen.getByRole('button', { name: /join room/i }))
    expect(onJoin).toHaveBeenCalledTimes(1)
  })
})
