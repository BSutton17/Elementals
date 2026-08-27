import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AgeGate } from './AgeGate'
import { DeleteAccountDialog } from './DeleteAccountDialog'

// The compliance surface. These are legal obligations rendered as UI, so the
// tests are about the PROMISES: the gate asks a date rather than a yes/no, an
// under-13 is turned away kindly, and deletion cannot happen by accident.

const saveAge = vi.fn()
const deleteMyAccount = vi.fn()
vi.mock('../../game/auth', async () => {
  const actual = await vi.importActual<typeof import('../../game/auth')>('../../game/auth')
  return {
    ...actual,
    saveAge: (...a: unknown[]) => saveAge(...a),
    deleteMyAccount: () => deleteMyAccount(),
    signOut: vi.fn(),
  }
})

beforeEach(() => {
  saveAge.mockReset()
  deleteMyAccount.mockReset()
})

describe('AgeGate', () => {
  it('ASKS FOR A DATE, not "are you over 13?"', () => {
    // A yes/no question teaches a child which answer lets them in, and is
    // worth nothing as a control.
    render(<AgeGate onPass={() => {}} onRefused={() => {}} />)
    const field = screen.getByLabelText('Date of birth') as HTMLInputElement
    expect(field.type).toBe('date')
  })

  it('promises the date is not stored, where the person can read it', () => {
    render(<AgeGate onPass={() => {}} onRefused={() => {}} />)
    expect(screen.getByText(/is not stored/i)).toBeTruthy()
  })

  it('links the terms and privacy policy at the moment of agreement', () => {
    const { container } = render(<AgeGate onPass={() => {}} onRefused={() => {}} />)
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/privacy.html')
    expect(hrefs).toContain('/terms.html')
  })

  it('cannot be submitted empty', () => {
    render(<AgeGate onPass={() => {}} onRefused={() => {}} />)
    const button = screen.getByRole('button', { name: /continue/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('passes an adult through', async () => {
    saveAge.mockResolvedValue({ ok: true })
    const onPass = vi.fn()
    render(<AgeGate onPass={onPass} onRefused={() => {}} />)
    fireEvent.change(screen.getByLabelText('Date of birth'), {
      target: { value: '1995-04-12' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onPass).toHaveBeenCalled())
    expect(saveAge).toHaveBeenCalledWith('1995-04-12')
  })

  it('TURNS AN UNDER-13 AWAY KINDLY, and tells them they can still play', async () => {
    // They are children being refused a thing they wanted. The screen should
    // say what they CAN do, and it is true: guests get the whole game.
    saveAge.mockResolvedValue({ ok: false, tooYoung: true })
    render(<AgeGate onPass={() => {}} onRefused={() => {}} />)
    fireEvent.change(screen.getByLabelText('Date of birth'), {
      target: { value: '2020-01-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByText(/you can still play/i)).toBeTruthy()
    expect(screen.getByText(/nothing was saved/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /play as a guest/i })).toBeTruthy()
  })

  it('offers signing out rather than trapping someone in the dialog', () => {
    render(<AgeGate onPass={() => {}} onRefused={() => {}} />)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy()
  })
})

describe('DeleteAccountDialog', () => {
  it('REQUIRES TYPING, not just a second click', async () => {
    // Irreversible, with no undo and no support queue. A dialog whose only
    // defence is another button is dismissed by muscle memory.
    render(<DeleteAccountDialog onCancel={() => {}} onDeleted={() => {}} />)
    const button = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'delete' } })
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
  })

  it('says accurately what survives, rather than claiming everything goes', () => {
    // The privacy policy is specific, so this has to be too: match rows are
    // kept for balance with the link to a person removed.
    render(<DeleteAccountDialog onCancel={() => {}} onDeleted={() => {}} />)
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy()
    expect(screen.getByText(/kept for game balance/i)).toBeTruthy()
    expect(screen.getByText(/keep playing as a guest/i)).toBeTruthy()
  })

  it('makes KEEPING the account the primary action', () => {
    // The safe path should be the easy one when the other is irreversible.
    const { container } = render(<DeleteAccountDialog onCancel={() => {}} onDeleted={() => {}} />)
    const primary = container.querySelector('.profile-btn--primary')!
    expect(primary.textContent).toMatch(/keep my account/i)
  })

  it('deletes once confirmed', async () => {
    deleteMyAccount.mockResolvedValue({ ok: true })
    const onDeleted = vi.fn()
    render(<DeleteAccountDialog onCancel={() => {}} onDeleted={onDeleted} />)
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'DELETE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('reports a failure without pretending the account is gone', async () => {
    deleteMyAccount.mockResolvedValue({ ok: false, message: 'Could not delete right now.' })
    const onDeleted = vi.fn()
    render(<DeleteAccountDialog onCancel={() => {}} onDeleted={onDeleted} />)
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'DELETE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
