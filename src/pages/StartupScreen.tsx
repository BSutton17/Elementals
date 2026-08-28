import { useEffect, useState } from 'react'
import { useSocket } from '../sockets/useSocket'
import { useLobby } from '../game/useLobby'
import { createRoom } from '../game/lobbyStore'
import { HowToPlay } from './HowToPlay'
import { hasSeenTutorial } from '../game/tutorial'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { CgProfile } from 'react-icons/cg'
import {
  signInWithGoogle,
  getSignedInName,
  fetchProfile,
  isSignedIn,
  type DailyQuest,
} from '../game/auth'
import { Link } from 'react-router-dom'
import { DailyChallenges } from '../components/DailyChallenges'
import { UsernameDialog } from '../components/profile/UsernameDialog'
import { AgeGate } from '../components/profile/AgeGate'
import './StartupScreen.css'

interface StartupScreenProps {
  name: string
  onName: (name: string) => void
  onJoin: () => void
  /** Enter matchmaking — the searching screen takes over from here. */
  onJoinPublic: () => void
}

/**
 * Main menu: set a name and either host a room or go to the join screen. Once in
 * a room, App routes to the lobby. Also hosts the How to Play walkthrough —
 * with a gentle pulse on the button until it's been opened once.
 */
export function StartupScreen({ name, onName, onJoin, onJoinPublic }: StartupScreenProps) {
  const { connected } = useSocket()
  const { error } = useLobby()
  const [showHowTo, setShowHowTo] = useState(false)
  // Who is signed in, if anyone. Seeded from local storage so the menu paints
  // immediately, then confirmed against the server (see below).
  const [signedInAs, setSignedInAs] = useState(() => getSignedInName())
  // Separate from the name on purpose: between signing in and finishing
  // onboarding an account HAS a session but no username yet, and offering the
  // Google button to someone already holding a token is nonsense.
  const [hasSession, setHasSession] = useState(() => isSignedIn())
  // A first-ever sign-in has no username yet; the picker is not optional.
  const [needsUsername, setNeedsUsername] = useState(false)
  const [needsAge, setNeedsAge] = useState(false)
  // The day's challenges, once the profile lands. Held here rather than fetched
  // by the panel itself: the menu already asks the server who you are on every
  // boot, and a second request for data that arrived with the first is waste.
  const [quests, setQuests] = useState<DailyQuest[]>([])
  const [questsResetAt, setQuestsResetAt] = useState<string | null>(null)

  // The stored name is a convenience, not the truth. Re-read the profile on
  // mount so a name changed on another device shows up, and so a token that has
  // been revoked (or an account swept away) signs out rather than displaying a
  // player who no longer exists.
  useEffect(() => {
    if (!isSignedIn()) return
    let live = true
    void fetchProfile().then((profile) => {
      if (!live) return
      if (!profile) {
        // ⚠️ NULL DOES NOT MEAN SIGNED OUT. `fetchProfile` returns null both
        // for a rejected token and for a server it could not reach, and those
        // must not be treated alike: the dyno sleeps, so the slow, failure-prone
        // request is precisely the one a player makes when they come back after
        // a few days away. Signing them out there is what made sign-in look
        // like it never persisted at all. A real 401 clears the token inside
        // `fetchProfile`, so that is the thing worth testing.
        if (!isSignedIn()) {
          setSignedInAs(null)
          setHasSession(false)
        }
        return
      }
      setSignedInAs(profile.username)
      // Both gates are driven by the server on every boot, so onboarding is
      // RESUMABLE. Someone who closed the tab halfway through gets asked again
      // next time; someone who finished is never asked twice.
      setNeedsUsername(profile.needsUsername)
      setNeedsAge(profile.needsAge)
      setQuests(profile.quests)
      setQuestsResetAt(profile.questsResetAt)
    })
    return () => {
      live = false
    }
  }, [])

  // A signed-in player always plays under their username - never whatever is
  // typed in a box. Keep the value the lobby sends in step with it.
  useEffect(() => {
    if (signedInAs && signedInAs !== name) onName(signedInAs)
  }, [signedInAs])
  // Evaluated once per mount: nudge new players toward the tutorial.
  const [nudge] = useState(() => !hasSeenTutorial())

  const nameOk = connected && name.trim().length > 0

  return (
    <main className="startup">
      <div className="startup__content">
        <h1 className="startup__title">Elementals</h1>
        {hasSession ? (
          // Signed in: the sign-in button and the name box are both gone. The
          // username IS the identity, so there is nothing left to type. It can
          // still be missing for the moment onboarding is open.
          signedInAs ? <p className="startup__signed-in">{signedInAs}</p> : null
        ) : (
          <>
            <GoogleSignInButton
              onToken={(idToken) => {
                void signInWithGoogle(idToken).then((user) => {
                  if (!user) return
                  setHasSession(true)
                  setSignedInAs(user.username)
                  // ⚠️ AGE BEFORE USERNAME. An account may not keep any data
                  // until the gate is answered, so asking for a name first
                  // would collect something from a child we are about to turn
                  // away.
                  setNeedsAge(user.needsAge)
                  setNeedsUsername(user.needsUsername)
                  // The sign-in response carries identity, not progress, so
                  // the challenges come from a profile read — otherwise the
                  // panel only appears on the NEXT visit, which reads as it
                  // being broken.
                  void fetchProfile().then((p) => {
                    if (!p) return
                    setQuests(p.quests)
                    setQuestsResetAt(p.questsResetAt)
                  })
                })
              }}
            />
            <input
              className="startup__input"
              type="text"
              placeholder="Your name"
              value={name}
              maxLength={24}
              onChange={(e) => onName(e.target.value)}
              aria-label="Your name"
            />
          </>
        )}

        <button
          type="button"
          className="startup__play"
          disabled={!nameOk}
          onClick={() => void createRoom(name.trim())}
        >
          Create Room
        </button>

        {/* Public is the primary of the two: it is the one that works without
            already knowing someone. Private keeps the code-entry screen. */}
        <button
          type="button"
          className="startup__secondary"
          disabled={!nameOk}
          onClick={onJoinPublic}
        >
          Join Public
        </button>

        <button type="button" className="startup__secondary" onClick={onJoin}>
          Join Private
        </button>

        {/* Below the buttons on purpose: the menu's job is to get you into a
            match, and the challenges are what you might do while you are in
            one. Absent entirely for a guest — see DailyChallenges. */}
        <DailyChallenges quests={quests} resetsAt={questsResetAt} />

        {error && <p className="startup__error">{error}</p>}

        <div
          className={`startup__status startup__status--${connected ? 'online' : 'offline'}`}
        >
        </div>
      </div>

      {/* Top-right, mirroring How to Play bottom-left so the two read as a
          pair of corner affordances rather than one stray control. */}
      {signedInAs && (
        <Link to="/profile" className="startup__profile" aria-label={`Profile: ${signedInAs}`}>
          <span className="startup__profile-icon" aria-hidden="true">
            <CgProfile />
          </span>
          <span className="startup__profile-name">{signedInAs}</span>
        </Link>
      )}

      {/* ⚠️ ONE BAR, NOT TWO PINNED CORNERS. These were separately positioned
          bottom-left and bottom-right, which meant nothing stopped them meeting
          in the middle — and on a narrow phone they did, because the
          full-width rule for `.startup__secondary` won the cascade over each
          button's own `width: auto` and Shop stretched clean across How to
          Play. A flex row with space-between cannot overlap at any width, and
          it also gives them somewhere to stack when the screen is very narrow.
          The centre column is still reserved for the one thing this screen is
          for: getting into a game. Both are open to guests. */}
      <nav className="startup__dock" aria-label="Elsewhere">
        <button
          type="button"
          className={`startup__secondary startup__dock-btn${nudge && !showHowTo ? ' startup__howto--nudge' : ''}`}
          onClick={() => setShowHowTo(true)}
        >
          How to Play
        </button>
        <Link to="/shop" className="startup__secondary startup__dock-btn">
          Shop
        </Link>
      </nav>

      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}

      {/* First sign-in: pick a name before anything else. Not dismissible -
          the way out is signing out, which the dialog offers. */}
      {needsAge && (
        <AgeGate
          onPass={() => setNeedsAge(false)}
          onRefused={() => {
            setNeedsAge(false)
            setNeedsUsername(false)
            setSignedInAs(null)
            setHasSession(false)
          }}
        />
      )}

      {!needsAge && needsUsername && (
        <UsernameDialog
          mode="create"
          initial={null}
          onDone={(username) => {
            setSignedInAs(username)
            setNeedsUsername(false)
          }}
          onCancel={() => {
            setNeedsUsername(false)
            setSignedInAs(null)
            setHasSession(false)
          }}
        />
      )}

    </main>
  )
}
