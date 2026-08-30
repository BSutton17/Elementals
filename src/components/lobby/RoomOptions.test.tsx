import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomOptions } from './RoomOptions'

/**
 * The gear itself: what it sends, and what it does NOT send.
 *
 * The permission lives on the server — these tests are about the panel keeping
 * its half of the contract, chiefly that flipping one switch never restates the
 * other. `lobby:setRules` treats an absent field as "leave it alone", so a
 * panel that always sent both would let a stale render undo the switch someone
 * else just flipped.
 */

function panel(over: Partial<Parameters<typeof RoomOptions>[0]> = {}) {
  const onChange = vi.fn()
  const view = render(
    <RoomOptions
      open
      onOpenChange={() => {}}
      eliminatedSeeAllHealth={false}
      monstersEnabled
      onChange={onChange}
      {...over}
    />,
  )
  return { onChange, ...view }
}

describe('the room options gear', () => {
  it('sends only the switch that moved', () => {
    const { onChange } = panel()
    fireEvent.click(screen.getByTestId('option-elimination-vision'))
    expect(onChange).toHaveBeenCalledWith({ eliminatedSeeAllHealth: true })

    fireEvent.click(screen.getByTestId('option-monsters'))
    expect(onChange).toHaveBeenLastCalledWith({ monstersEnabled: false })
  })

  it('shows the server\u2019s values, not its own', () => {
    // No local state: the checkboxes are whatever the last lobby broadcast
    // said, so a rejected change snaps back rather than lying about the room.
    panel({ eliminatedSeeAllHealth: true, monstersEnabled: false })
    expect(screen.getByTestId<HTMLInputElement>('option-elimination-vision').checked).toBe(true)
    expect(screen.getByTestId<HTMLInputElement>('option-monsters').checked).toBe(false)
  })

  it('stops accepting changes once the match has started', () => {
    // Asserted on the attribute rather than by clicking: `fireEvent` dispatches
    // straight at the element, so it "clicks" a disabled input that no real
    // browser would deliver an event to. The attribute is the actual barrier.
    panel({ disabled: true })
    expect(screen.getByTestId<HTMLInputElement>('option-monsters').disabled).toBe(true)
    expect(
      screen.getByTestId<HTMLInputElement>('option-elimination-vision').disabled,
    ).toBe(true)
  })

  it('draws nothing but the gear while closed', () => {
    panel({ open: false })
    expect(screen.getByTestId('room-options-gear')).toBeTruthy()
    expect(screen.queryByTestId('option-monsters')).toBeNull()
  })

  it('closes on Escape', () => {
    const onOpenChange = vi.fn()
    panel({ onOpenChange })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
