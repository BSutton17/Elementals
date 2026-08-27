import { useState } from 'react'
import { deleteMyAccount } from '../../game/auth'
import './Profile.css'

/**
 * Confirming account deletion.
 *
 * ⚠️ CONFIRMED BY TYPING, NOT BY A SECOND CLICK. This is irreversible and there
 * is no undo, no grace period and no support queue to appeal to. A dialog whose
 * only defence is one more button is dismissed by muscle memory; having to
 * write the word makes the person read the sentence.
 *
 * The copy is specific about what survives, because the privacy policy is: the
 * account and everything in it goes, and anonymised match rows stay for balance
 * with the link to a person removed. Saying "everything is deleted" would be
 * simpler and untrue.
 */

const CONFIRM_WORD = 'DELETE'

export function DeleteAccountDialog({
  onCancel,
  onDeleted,
}: {
  onCancel: () => void
  onDeleted: () => void
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = typed.trim().toUpperCase() === CONFIRM_WORD && !busy

  const confirm = async () => {
    if (!ready) return
    setBusy(true)
    setError(null)
    const result = await deleteMyAccount()
    setBusy(false)
    if (result.ok) onDeleted()
    else setError(result.message ?? 'Could not delete right now.')
  }

  return (
    <div
      className="profile-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
    >
      <div className="profile-modal__backdrop" onClick={onCancel} />
      <div className="profile-modal__panel">
        <h2 className="profile-modal__title" id="delete-title">
          Delete your account?
        </h2>

        <p className="profile-modal__lead">
          This cannot be undone. Your username, level, coins, quests and everything you
          have unlocked will be permanently removed.
        </p>
        <p className="profile-modal__lead">
          Records of matches you played are kept for game balance, with your name and any
          link to you removed.
        </p>
        <p className="profile-modal__lead">
          You can keep playing as a guest afterwards.
        </p>

        <label className="profile-label" htmlFor="delete-confirm">
          Type <strong>{CONFIRM_WORD}</strong> to confirm
        </label>
        <input
          id="delete-confirm"
          className="profile-field"
          type="text"
          value={typed}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setTyped(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void confirm()
            if (e.key === 'Escape') onCancel()
          }}
        />

        <p
          className={`profile-hint${error ? ' profile-hint--bad' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {error ?? ' '}
        </p>

        <div className="profile-modal__actions">
          {/* Cancel is the primary action here — the safe path should be the
              easy one when the other path is irreversible. */}
          <button type="button" className="profile-btn profile-btn--primary" onClick={onCancel}>
            Keep my account
          </button>
          <button
            type="button"
            className="profile-btn profile-btn--danger"
            disabled={!ready}
            onClick={() => void confirm()}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
