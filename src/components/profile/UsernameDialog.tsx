import { useEffect, useRef, useState } from 'react'
import { saveUsername, signOut } from '../../game/auth'
import './Profile.css'

/**
 * Choosing a username — on first sign-in, and again whenever it is changed.
 *
 * The same component serves both, because the rules and the feedback are
 * identical and a second near-copy would drift.
 */

const MIN = 3
const MAX = 16
/** Mirrors the server's rule. The server is still the authority. */
const ALLOWED = /^[A-Za-z0-9_-]+$/
const EDGES = /^[A-Za-z0-9].*[A-Za-z0-9]$|^[A-Za-z0-9]$/

/**
 * Local validation, purely so the player gets an answer as they type rather
 * than after a round trip. Anything this misses the server still catches —
 * uniqueness and profanity are deliberately NOT checked here, because one
 * needs the database and the other should not ship a word list to the browser.
 */
function localProblem(value: string): string | null {
  const name = value.trim()
  if (name.length === 0) return null // Not an error yet, just unfinished.
  if (name.length < MIN) return `At least ${MIN} characters.`
  if (name.length > MAX) return `At most ${MAX} characters.`
  if (!ALLOWED.test(name)) return 'Letters, numbers, _ and - only — no spaces.'
  if (!EDGES.test(name)) return 'Start and end with a letter or number.'
  return null
}

interface UsernameDialogProps {
  /**
   * `create` is the first-ever sign-in: there is no cancel, because a
   * signed-in player without a username is a state nothing else expects. The
   * way out is signing out, not dismissing.
   */
  mode: 'create' | 'edit'
  /** Pre-fills the field — Google's name on create, the current one on edit. */
  initial?: string | null
  onDone: (username: string) => void
  onCancel?: () => void
}

export function UsernameDialog({ mode, initial, onDone, onCancel }: UsernameDialogProps) {
  const [value, setValue] = useState(initial ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  const problem = localProblem(value)
  const ready = value.trim().length >= MIN && !problem && !saving

  const submit = async () => {
    if (!ready) return
    setSaving(true)
    setServerError(null)
    const result = await saveUsername(value.trim())
    setSaving(false)
    if (result.ok && result.username) onDone(result.username)
    else setServerError(result.message ?? 'Could not save that name.')
  }

  return (
    <div
      className="profile-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-dialog-title"
    >
      {/* On create there is nothing behind to go back to, so the backdrop is
          inert. On edit it closes, which is what people expect of a backdrop. */}
      <div
        className="profile-modal__backdrop"
        onClick={mode === 'edit' ? onCancel : undefined}
      />
      <div className="profile-modal__panel">
        <h2 className="profile-modal__title" id="username-dialog-title">
          {mode === 'create' ? 'Choose your name' : 'Change your name'}
        </h2>
        <p className="profile-modal__lead">
          {mode === 'create'
            ? 'This is how other kingdoms will know you. You can change it later.'
            : 'Other players will see this name from now on.'}
        </p>

        <input
          ref={input}
          className="profile-field"
          type="text"
          value={value}
          maxLength={MAX}
          spellCheck={false}
          autoComplete="off"
          aria-label="Username"
          aria-invalid={Boolean(problem || serverError)}
          aria-describedby="username-hint"
          onChange={(e) => {
            setValue(e.target.value)
            setServerError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
            if (e.key === 'Escape' && mode === 'edit') onCancel?.()
          }}
        />

        {/* One line, always present, so the layout never jumps as it changes
            between a hint, a problem, and a rejection. */}
        <p
          id="username-hint"
          className={`profile-hint${problem || serverError ? ' profile-hint--bad' : ''}`}
          role={problem || serverError ? 'alert' : undefined}
        >
          {serverError ?? problem ?? `${MIN}–${MAX} characters. Letters, numbers, _ and -`}
        </p>

        <div className="profile-modal__actions">
          <button
            type="button"
            className="profile-btn profile-btn--primary"
            disabled={!ready}
            onClick={() => void submit()}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Continue' : 'Save'}
          </button>

          {mode === 'edit' ? (
            <button type="button" className="profile-btn" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            // Never trap someone in a modal. On create the escape hatch is
            // signing out, not dismissing — which would leave them signed in
            // with no name.
            <button
              type="button"
              className="profile-btn profile-btn--quiet"
              onClick={() => {
                signOut()
                onCancel?.()
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
