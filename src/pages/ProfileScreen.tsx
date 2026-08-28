import { useEffect, useState } from 'react'
import { CgProfile } from 'react-icons/cg'
import { UsernameDialog } from '../components/profile/UsernameDialog'
import { DeleteAccountDialog } from '../components/profile/DeleteAccountDialog'
import {
  fetchProfile,
  getSignedInName,
  isSignedIn,
  signOut,
  exportMyData,
  rerollFeatured,
  type PlayerProfile,
} from '../game/auth'
import { getKingdomTheme } from '../game/kingdomThemes'
import { KingdomWardrobe } from '../components/shop/KingdomWardrobe'
import './AccountPage.css'

/**
 * The player's profile — a page, not an overlay.
 *
 * It is a destination: you go there, look around, and come back, so it gets a
 * URL and its own screen rather than floating over the menu.
 *
 * A stack of sections — identity, level, daily quests, record, kingdoms, and
 * the wardrobe. Built that way from the start so each one could be added
 * without redesigning the page, which is what actually happened.
 */

type State =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'ready'; username: string; profile: PlayerProfile }

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  // Seeded from the local copy so the page paints immediately rather than
  // flashing a spinner at someone who is already signed in.
  const [state, setState] = useState<State>(() =>
    isSignedIn() ? { status: 'loading' } : { status: 'signed-out' },
  )
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  // Admin tools: idle → working → what happened. One state rather than a
  // boolean and a string, so "rerolling" and "rerolled" cannot both be true.
  const [reroll, setReroll] = useState<
    { status: 'idle' } | { status: 'working' } | { status: 'done' } | { status: 'failed'; message: string }
  >({ status: 'idle' })

  useEffect(() => {
    if (!isSignedIn()) return
    let live = true
    void fetchProfile().then((profile) => {
      if (!live) return
      if (!profile) {
        // fetchProfile clears a dead token, so this is genuinely signed out —
        // unless the server is unreachable, which reads the same to the player.
        setState(isSignedIn() ? { status: 'error' } : { status: 'signed-out' })
        return
      }
      setState({
        status: 'ready',
        username: profile.username ?? getSignedInName() ?? 'Player',
        profile,
      })
    })
    return () => {
      live = false
    }
  }, [])

  return (
    <main className="account">
      <header className="account__bar">
        <button type="button" className="account__back" onClick={onBack}>
          ← Menu
        </button>
        <h1 className="account__title">Profile</h1>
      </header>

      <div className="account__body">
        {state.status === 'loading' && (
          <p className="account__status" role="status">
            Loading your profile…
          </p>
        )}

        {state.status === 'signed-out' && (
          <div className="account__empty">
            <p className="account__empty-title">You are not signed in</p>
            <p className="account__empty-text">
              Sign in from the menu to keep a username, a record, and anything you
              unlock. You can play without one.
            </p>
            <button type="button" className="account-btn account-btn--primary" onClick={onBack}>
              Back to menu
            </button>
          </div>
        )}

        {state.status === 'error' && (
          <div className="account__empty">
            <p className="account__empty-title">Could not load your profile</p>
            <p className="account__empty-text">
              The server did not answer. Your account is fine — try again in a moment.
            </p>
            <button
              type="button"
              className="account-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            <header className="account-identity">
              <span className="account-identity__avatar" aria-hidden="true">
                <CgProfile />
              </span>
              <div className="account-identity__text">
                <h2 className="account-identity__name">{state.username}</h2>
                <p className="account-identity__meta">Level {state.profile.level}</p>
              </div>
              <span className="coin-balance" aria-label={`${state.profile.coins} coins`}>
                <span className="coin-balance__value">
                  {state.profile.coins.toLocaleString()}
                </span>
                <span className="coin-balance__unit">coins</span>
              </span>
            </header>

            {/* The bar carries the fraction; the numbers beside it carry the
                same thing for anyone who cannot see the fill. At the cap there
                is no next level, so a bar would be a lie — show the total. */}
            <div className="level-bar">
              {state.profile.xpForNext > 0 ? (
                <>
                  <div
                    className="level-bar__track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={state.profile.xpForNext}
                    aria-valuenow={state.profile.xpIntoLevel}
                    aria-label={`Progress to level ${state.profile.level + 1}`}
                  >
                    <div
                      className="level-bar__fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (state.profile.xpIntoLevel / state.profile.xpForNext) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="level-bar__label">
                    {state.profile.xpIntoLevel.toLocaleString()} of{' '}
                    {state.profile.xpForNext.toLocaleString()} XP to level{' '}
                    {state.profile.level + 1}
                  </p>
                </>
              ) : (
                <p className="level-bar__label">
                  Max level · {state.profile.xp.toLocaleString()} XP earned
                </p>
              )}
            </div>

            <section className="account-section">
              <h3 className="account-section__title">Account</h3>
              <div className="account-row">
                <span className="account-row__label">Username</span>
                <span className="account-row__value">{state.username}</span>
                <button
                  type="button"
                  className="account-btn"
                  onClick={() => setEditing(true)}
                >
                  Change
                </button>
              </div>
            </section>

            <section className="account-section">
              <h3 className="account-section__title">Daily quests</h3>
              {state.profile.quests.length === 0 ? (
                <p className="account-section__pending">
                  Three quests appear here each day.
                </p>
              ) : (
                <div className="quests">
                  {state.profile.quests.map((q) => {
                    const pct = Math.min(100, (q.progress / Math.max(1, q.target)) * 100)
                    return (
                      <div
                        className={`quest${q.completed ? ' quest--done' : ''}`}
                        key={q.questId}
                      >
                        <div className="quest__head">
                          {/* Tier is written out, not just coloured — the whole
                              point of a harder quest is knowing it pays more. */}
                          <span className={`quest__tier quest__tier--${q.tier}`}>
                            {q.tier}
                          </span>
                          <span className="quest__text">{q.description}</span>
                          {q.completed && (
                            <span className="quest__check" aria-label="Completed">
                              ✓
                            </span>
                          )}
                        </div>
                        <div
                          className="quest__track"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={q.target}
                          aria-valuenow={Math.min(q.progress, q.target)}
                          aria-label={q.description}
                        >
                          <div className="quest__fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="quest__foot">
                          <span>
                            {Math.min(q.progress, q.target).toLocaleString()} /{' '}
                            {q.target.toLocaleString()}
                          </span>
                          <span className="quest__reward">
                            +{q.xp} XP · +{q.coins} coins
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="account-section">
              <h3 className="account-section__title">Record</h3>
              {state.profile.totals.matches === 0 ? (
                <p className="account-section__pending">
                  Play a match and your record starts here.
                </p>
              ) : (
                <>
                  <div className="stat-strip">
                    <div className="stat">
                      <span className="stat__value">{state.profile.totals.matches}</span>
                      <span className="stat__label">Matches</span>
                    </div>
                    <div className="stat">
                      <span className="stat__value">{state.profile.totals.wins}</span>
                      <span className="stat__label">Wins</span>
                    </div>
                    <div className="stat">
                      {/* ⚠️ Suppressed under 10 matches. A 0% win rate across
                          two games is noise presented as judgement. */}
                      <span className="stat__value">
                        {state.profile.totals.matches >= 10
                          ? `${Math.round(
                              (state.profile.totals.wins / state.profile.totals.matches) * 100,
                            )}%`
                          : '—'}
                      </span>
                      <span className="stat__label">Win rate</span>
                    </div>
                    <div className="stat">
                      <span className="stat__value">
                        {Math.round(state.profile.totals.playtimeSeconds / 3600)}h
                      </span>
                      <span className="stat__label">Played</span>
                    </div>
                  </div>
                  {state.profile.totals.matches < 10 && (
                    <p className="account-section__pending">
                      Win rate appears after 10 matches.
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="account-section">
              <h3 className="account-section__title">Kingdoms</h3>
              {state.profile.kingdoms.length === 0 ? (
                <p className="account-section__pending">
                  Every kingdom you play is tracked here.
                </p>
              ) : (
                <div className="kingdom-table">
                  {[...state.profile.kingdoms]
                    .sort((a, b) => b.playtimeSeconds - a.playtimeSeconds)
                    .map((k) => {
                      const theme = getKingdomTheme(k.kingdomId)
                      return (
                        <div className="kingdom-row" key={k.kingdomId}>
                          <span
                            className="kingdom-row__swatch"
                            style={{ background: theme?.primary ?? '#6b7385' }}
                            aria-hidden="true"
                          />
                          <span className="kingdom-row__name">
                            {theme?.name ?? k.kingdomId}
                          </span>
                          {k.masteryName && (
                            <span className="kingdom-row__mastery">{k.masteryName}</span>
                          )}
                          <span className="kingdom-row__stat">
                            {k.matches} {k.matches === 1 ? 'match' : 'matches'}
                          </span>
                          <span className="kingdom-row__stat">
                            {k.wins} {k.wins === 1 ? 'win' : 'wins'}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
            </section>

            <section className="account-section">
              <h3 className="account-section__title">Kingdom cosmetics</h3>
              <KingdomWardrobe
                catalogue={state.profile.catalogue}
                owned={state.profile.owned}
                loadout={state.profile.loadout}
                onChange={(kingdomId, slot, itemId) => {
                  // Update in place rather than re-fetching: the server has
                  // already accepted it, and a round trip would make a choice
                  // that felt instant suddenly lag.
                  setState({
                    ...state,
                    profile: {
                      ...state.profile,
                      loadout: {
                        ...state.profile.loadout,
                        [kingdomId]: { ...state.profile.loadout[kingdomId], [slot]: itemId },
                      },
                    },
                  })
                }}
              />
            </section>

            {/* Admin tools. Rendered on the server's say-so and gated there
                too — hiding the section is presentation, not security. */}
            {state.profile.admin && (
              <section className="account-section">
                <h3 className="account-section__title">Admin</h3>
                <p className="account-section__pending">
                  You own every cosmetic automatically, and the shop's Featured
                  page can be redrawn from here. A reroll changes what{' '}
                  <strong>everyone</strong> sees, and lasts until tomorrow's
                  shop.
                </p>

                <div className="account-row">
                  <span className="account-row__label">Featured shop</span>
                  <button
                    type="button"
                    className="account-btn"
                    disabled={reroll.status === 'working'}
                    onClick={() => {
                      setReroll({ status: 'working' })
                      void rerollFeatured().then((result) =>
                        setReroll(
                          result.ok
                            ? { status: 'done' }
                            : { status: 'failed', message: result.message ?? 'Could not reroll.' },
                        ),
                      )
                    }}
                  >
                    {reroll.status === 'working' ? 'Rerolling…' : 'Reroll'}
                  </button>
                </div>

                {reroll.status === 'done' && (
                  <p className="account-section__pending" role="status">
                    Featured redrawn. Open the shop to see it.
                  </p>
                )}
                {reroll.status === 'failed' && (
                  <p className="account-error" role="alert">
                    {reroll.message}
                  </p>
                )}
              </section>
            )}

            {/* The rights the privacy policy promises, exercisable here rather
                than by emailing somebody. A right you have to ask for is one
                most people never use. */}
            <section className="account-section">
              <h3 className="account-section__title">Your data</h3>
              <p className="account-section__pending">
                Read what we store and why in the{' '}
                <a href="/privacy.html" target="_blank" rel="noopener">
                  Privacy Policy
                </a>
                .
              </p>

              <div className="account-row">
                <span className="account-row__label">Download your data</span>
                <button
                  type="button"
                  className="account-btn"
                  onClick={() => {
                    void exportMyData().then((ok) => {
                      if (!ok) setDataError('Could not prepare the download. Try again.')
                    })
                  }}
                >
                  Export
                </button>
              </div>

              <div className="account-row">
                <span className="account-row__label">Delete your account</span>
                <button
                  type="button"
                  className="account-btn account-btn--danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              </div>

              {dataError && (
                <p className="account-error" role="alert">
                  {dataError}
                </p>
              )}
            </section>

            <footer className="account__footer">
              <button
                type="button"
                className="account-btn account-btn--quiet"
                onClick={() => {
                  signOut()
                  setState({ status: 'signed-out' })
                }}
              >
                Sign out
              </button>
            </footer>
          </>
        )}
      </div>

      {/* Deletion is irreversible, so it is confirmed by TYPING, not by a
          second click. A confirm dialog you can dismiss with muscle memory is
          not a confirmation. */}
      {confirmDelete && (
        <DeleteAccountDialog
          onCancel={() => setConfirmDelete(false)}
          onDeleted={() => {
            setConfirmDelete(false)
            setState({ status: 'signed-out' })
          }}
        />
      )}

      {editing && state.status === 'ready' && (
        <UsernameDialog
          mode="edit"
          initial={state.username}
          onDone={(username) => {
            // Only the name changed; keep the loaded profile rather than
            // dropping the level and record and re-fetching them.
            setState({ status: 'ready', username, profile: state.profile })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </main>
  )
}
