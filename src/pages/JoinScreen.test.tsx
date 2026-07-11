import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JoinScreen } from './JoinScreen'

const noop = () => {}

describe('JoinScreen', () => {
  it('renders a room code field and a disabled Join while offline', () => {
    render(<JoinScreen name="Alice" onName={noop} onBack={noop} />)
    expect(screen.getByLabelText('Room code')).toBeTruthy()
    const join = screen.getByRole('button', {
      name: /join room/i,
    }) as HTMLButtonElement
    expect(join.disabled).toBe(true)
  })

  it('strips non-digits and limits the code to four digits', () => {
    render(<JoinScreen name="Alice" onName={noop} onBack={noop} />)
    const input = screen.getByLabelText('Room code') as HTMLInputElement
    fireEvent.change(input, { target: { value: '12ab34567' } })
    expect(input.value).toBe('1234')
  })

  it('calls onBack', () => {
    const onBack = vi.fn()
    render(<JoinScreen name="Alice" onName={noop} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
