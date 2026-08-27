import { useState } from 'react'
import { saveAge, signOut } from '../../game/auth'
import './Profile.css'

/**
 * The age gate, shown once on a first sign-in.
 *
 * ⚠️ IT ASKS FOR A DATE, NOT "ARE YOU OVER 13?". A yes/no question teaches a
 * child which answer lets them in and is worth nothing as a control. A date is
 * the approach regulators describe, and it is the only one that means anything.
 *
 * The date is sent once, checked, converted to an age bracket and discarded —
 * it is never stored. Someone under 13 has their just-created account deleted
 * and is told, plainly, that they can still play the whole game as a guest,
 * because they can.
 */

export function AgeGate({
  onPass,
  onRefused,
}: {
  onPass: () => void
  onRefused: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!value || saving) return
    setSaving(true)
    setError(null)
    const result = await saveAge(value)
    setSaving(false)

    if (result.ok) {
      onPass()
      return
    }
    if (result.tooYoung) {
      // The account is already gone server-side; clear the local token so the
      // menu does not keep showing them as signed in.
      signOut()
      setRefused(true)
      return
    }
    setError(result.message ?? 'Could not save that.')
  }

  if (refused) {
    return (
      <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="age-refused">
        <div className="profile-modal__backdrop" />
        <div className="profile-modal__panel">
          <h2 className="profile-modal__title" id="age-refused">
            You can still play
          </h2>
          <p className="profile-modal__lead">
            Accounts are for players aged 13 and over, so we have not kept one for you.
            Nothing was saved.
          </p>
          <p className="profile-modal__lead">
            Everything in the game is available without an account — every kingdom, every
            mode, every match. Just pick a name and play.
          </p>
          <div className="profile-modal__actions">
            <button
              type="button"
              className="profile-btn profile-btn--primary"
              onClick={onRefused}
            >
              Play as a guest
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="age-title">
      {/* Not dismissible: an account exists from the moment Google verified
          them, and it may not keep data until this is answered. The way out is
          signing out, which the button below offers. */}
      <div className="profile-modal__backdrop" />
      <div className="profile-modal__panel">
        <h2 className="profile-modal__title" id="age-title">
          When were you born?
        </h2>
        <p className="profile-modal__lead">
          We ask once, to check you are old enough for an account.{' '}
          <strong>Your date of birth is not stored.</strong>
        </p>

        <input
          className="profile-field"
          type="date"
          value={value}
          max={new Date().toISOString().slice(0, 10)}
          aria-label="Date of birth"
          aria-invalid={Boolean(error)}
          aria-describedby="age-hint"
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />

        <p
          id="age-hint"
          className={`profile-hint${error ? ' profile-hint--bad' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {error ?? 'You can play without an account at any age.'}
        </p>

        <div className="profile-modal__actions">
          <button
            type="button"
            className="profile-btn profile-btn--primary"
            disabled={!value || saving}
            onClick={() => void submit()}
          >
            {saving ? 'Checking…' : 'Continue'}
          </button>
          <button
            type="button"
            className="profile-btn profile-btn--quiet"
            onClick={() => {
              signOut()
              onRefused()
            }}
          >
            Sign out
          </button>
        </div>

        <p className="profile-legal">
          By continuing you agree to the{' '}
          <a href="/terms.html" target="_blank" rel="noopener">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy.html" target="_blank" rel="noopener">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
