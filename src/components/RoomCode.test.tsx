import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RoomCode } from './RoomCode'

describe('RoomCode', () => {
  it('displays the room code', () => {
    render(<RoomCode code="1234" />)
    expect(screen.getByLabelText('Room code 1234')).toBeTruthy()
  })

  it('copies the code to the clipboard and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<RoomCode code="4321" />)
    fireEvent.click(screen.getByRole('button', { name: /copy room code/i }))

    expect(writeText).toHaveBeenCalledWith('4321')
    await waitFor(() => expect(screen.getByText('Copied!')).toBeTruthy())
  })
})
