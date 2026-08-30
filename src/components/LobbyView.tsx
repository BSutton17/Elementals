import { useEffect, useState, type CSSProperties } from 'react'
import { RoomCode } from './RoomCode'
import { HowToPlay } from '../pages/HowToPlay'
import { KINGDOMS, SELECTABLE_KINGDOMS, type KingdomId } from '../game/kingdoms'
import { KINGDOM_PASSIVES_INFO, KINGDOM_DIFFICULTY, MAX_DIFFICULTY } from '../game/kingdomInfo'
import { IoIosStar, IoIosStarOutline } from 'react-icons/io'
import { accentFor, outlineFor } from '../game/contrast'
import { getAbilitiesForKingdom } from '../game/abilities'
import { KINGDOM_ICONS } from '../game/kingdomIcons'
import {
  MIN_PLAYERS_TO_START,
  botDifficultyLabel,
  nextDifficulty,
  type BotDifficulty,
  type LobbyMatch,
} from '../game/lobby'
import {
  PERKS,
  PERKS_PER_PLAYER,
  perksAllowedFor,
  hasFullPerkSelection,
  perkDescription,
  resolvePerks,
  togglePerk,
} from '../game/perks'
import './LobbyView.css'
import { RoomOptions } from './lobby/RoomOptions'

interface LobbyViewProps {
  match: LobbyMatch
  youId: string | null
  onToggleReady: () => void
  onSelectKingdom: (kingdom: KingdomId) => void
  onSelectPerks: (perks: string[]) => void
  /** Admin-only: change one or both of the room's optional rules. */
  onSetRules?: (rules: { eliminatedSeeAllHealth?: boolean; monstersEnabled?: boolean }) => void
  /** Whether to draw the admin gear. The server re-checks before it acts. */
  isAdmin?: boolean
  onSpectate: () => void
  onStart: () => void
  onLeave: () => void
  /** Host-only bot controls. Absent for non-hosts, which hides the whole UI. */
  onAddBot?: (difficulty: BotDifficulty) => void
  onSetBotDifficulty?: (botId: string, difficulty: BotDifficulty) => void
  onRemoveBot?: (botId: string) => void
}

/** A player's chosen perks, as icon chips beside their name in the roster. */
function PerkChips({
  perks,
  seats,
}: {
  perks: string[] | undefined
  /** Seats at this table, so a hovered Better Construction shows what it is
   *  actually worth here rather than its duel value. */
  seats?: number
}) {
  const chosen = resolvePerks(perks)
  if (chosen.length === 0) return null
  return (
    <span className="lobby__perk-chips">
      {chosen.map((p) => {
        const Icon = p.icon
        return (
          <span
            key={p.id}
            className="lobby__perk-chip"
            style={{ '--p': p.color } as CSSProperties}
            title={`${p.name} — ${perkDescription(p, seats)}`}
            aria-label={p.name}
          >
            <Icon aria-hidden />
          </span>
        )
      })}
    </span>
  )
}

/**
 * How demanding a kingdom is to play, as filled stars out of `MAX_DIFFICULTY`.
 *
 * Rated on the player, not on power: a three-star kingdom is not stronger, it
 * just wants more attention and setup. The label says so, because a bare row of
 * stars beside a kingdom reads as a quality score otherwise.
 */
function Difficulty({ kingdomId }: { kingdomId: string }) {
  const rating = KINGDOM_DIFFICULTY[kingdomId]
  if (rating === undefined) return null
  const label = `Difficulty ${rating} out of ${MAX_DIFFICULTY}`
  return (
    <p className="lobby__difficulty" data-testid="kingdom-difficulty">
      <span className="lobby__difficulty-label">Difficulty</span>
      {/* One label for the row, and the stars themselves hidden from screen
          readers — sixteen "star" announcements say nothing useful. */}
      <span className="lobby__difficulty-stars" role="img" aria-label={label}>
        {Array.from({ length: MAX_DIFFICULTY }, (_, i) =>
          i < rating ? (
            <IoIosStar key={i} className="lobby__difficulty-star" aria-hidden />
          ) : (
            <IoIosStarOutline
              key={i}
              className="lobby__difficulty-star lobby__difficulty-star--empty"
              aria-hidden
            />
          ),
        )}
      </span>
    </p>
  )
}

/** The selected kingdom's passives and ability lineup (no prices). */
function KingdomDetails({ kingdomId }: { kingdomId: string }) {
  const passives = KINGDOM_PASSIVES_INFO[kingdomId] ?? []
  const abilities = getAbilitiesForKingdom(kingdomId).filter(
    (a) => a.kind !== 'passive',
  )
  const label = KINGDOMS.find((k) => k.id === kingdomId)?.label ?? kingdomId

  return (
    <div className="lobby__kingdom-details" data-testid="kingdom-details">
      <h3 className="lobby__details-title">{label}</h3>
      <Difficulty kingdomId={kingdomId} />

      <h4 className="lobby__details-heading">Passives</h4>
      <ul className="lobby__details-list">
        {passives.map((p) => (
          <li
            key={p.name}
            className={`lobby__details-item${p.weakness ? ' lobby__details-item--weakness' : ''}`}
          >
            <span className="lobby__details-name">{p.name}</span>
            <span className="lobby__details-desc">{p.description}</span>
          </li>
        ))}
      </ul>

      <h4 className="lobby__details-heading">Abilities</h4>
      <ul className="lobby__details-list">
        {abilities.map((a) => (
          <li key={a.id} className="lobby__details-item">
            <span className="lobby__details-name">
              {a.name}
              <span className={`lobby__details-kind lobby__details-kind--${a.kind}`}>
                {a.kind}
              </span>
            </span>
            <span className="lobby__details-desc">{a.description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Presentational lobby screen (ticket #26): room code, connected players with
 * host/ready status, kingdom selection, and actions. Fully prop-driven so it is
 * easy to test; the container wires it to the socket-backed store.
 */
export function LobbyView({
  match,
  youId,
  onToggleReady,
  onSelectKingdom,
  onSelectPerks,
  onSetRules,
  isAdmin = false,
  onSpectate,
  onStart,
  onLeave,
  onAddBot,
  onSetBotDifficulty,
  onRemoveBot,
}: LobbyViewProps) {
  const [showHowTo, setShowHowTo] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const me = match.players.find((p) => p.id === youId)
  const isReady = me?.ready ?? false
  const isSpectator = me?.spectator === true
  const isPublic = match.visibility === 'public'
  // A public room has no host at all, so `hostId` is null and this is false for
  // everyone — the server starts the match on a timer instead.
  const isHost = youId != null && youId === match.hostId
  const myPerks = me?.perks ?? []
  // Kitsune's "Three tailed fox" picks one more than everyone else.
  const perkAllowance = perksAllowedFor(me?.kingdomId)
  const perksFull = myPerks.length >= perkAllowance
  // Spectators don't gate the start and aren't counted as players.
  const connected = match.players.filter((p) => p.connected && !p.spectator)
  const enoughPlayers = connected.length >= MIN_PLAYERS_TO_START
  const allHaveKingdom = connected.every((p) => p.kingdomId !== null)
  // Each player's allowance depends on THEIR kingdom, not the local one.
  const allHavePerks = connected.every((p) =>
    hasFullPerkSelection(p.perks, p.kingdomId),
  )
  const allReady = connected.every((p) => p.ready)
  const canStart = enoughPlayers && allHaveKingdom && allHavePerks && allReady
  // The same gate the server enforces on `lobby:ready`: a kingdom and a full
  // perk set. Spectators bring neither and may ready up freely.
  const canReady =
    isSpectator ||
    (me?.kingdomId != null && hasFullPerkSelection(me?.perks, me.kingdomId))
  const readyBlocker =
    me?.kingdomId == null
      ? 'Pick a kingdom first'
      : `Pick ${perkAllowance - myPerks.length} more perk${
          perkAllowance - myPerks.length === 1 ? '' : 's'
        }`
  // The kingdom-playing seats are capped; once full, only spectating is left.
  const maxActive = match.maxActivePlayers ?? 7
  const activeCount = match.players.filter((p) => !p.spectator && p.kingdomId !== null).length
  // ⚠️ EVERY SEAT, SPECTATORS INCLUDED — because that is what the server counts
  // when it builds the match config (`matchConfig.playerCount` is
  // `match.getPlayers().length`). Showing the scaled perk bonus off a different
  // count would be a prettier number and the wrong one.
  const seatedForScaling = match.players.length
  const spectatorCount = match.players.filter((p) => p.spectator).length
  // A bot needs a kingdom seat like anyone else, so the button goes dead once
  // the playing seats are gone — the server refuses anyway, but a disabled
  // button says so without a round trip and an error toast.
  const rosterFull = activeCount >= maxActive
  const playersFull = activeCount >= maxActive && !(me && !me.spectator && me.kingdomId !== null)

  // Tell the host exactly what's blocking the start.
  const startLabel = canStart
    ? 'Start Match'
    : !enoughPlayers
      ? `Need ${MIN_PLAYERS_TO_START}+ players`
      : !allHaveKingdom
        ? 'Everyone must pick a kingdom'
        : !allHavePerks
          ? 'Everyone must pick a full set of perks'
          : 'Everyone must ready up'
  // Only what is ON. "Monsters off" in a list of rules reads like a feature the
  // room is missing; the interesting information is what has been switched on.
  const activeRules: string[] = []
  if (match.eliminatedSeeAllHealth === true) activeRules.push('Elimination vision')
  if (match.monstersEnabled !== false) activeRules.push('Monsters')

  const kingdomLabel = (id: string | null) =>
    KINGDOMS.find((k) => k.id === id)?.label ?? null

  return (
    <main className="lobby">
      <RoomCode code={match.roomCode} />
      <div className="lobby__corner">
        <button
          type="button"
          className="lobby__howto"
          onClick={() => setShowHowTo(true)}
          aria-label="How to play"
        >
          ? How to Play
        </button>
        {/* ⚠️ ADMIN AND PRIVATE ONLY. These two switches change what a match
            IS, so while they are being tuned they belong to the account that
            owns the game rather than to whoever clicked Create Room — and
            neither is something a stranger in matchmaking should be able to
            turn on for you. The server refuses both cases as well; this only
            keeps the UI honest. */}
        {isAdmin && !isPublic && (
          <RoomOptions
            open={showOptions}
            onOpenChange={setShowOptions}
            eliminatedSeeAllHealth={match.eliminatedSeeAllHealth ?? false}
            monstersEnabled={match.monstersEnabled ?? true}
            onChange={(rules) => onSetRules?.(rules)}
            disabled={match.phase !== 'lobby'}
          />
        )}
      </div>
      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}

      <div className="lobby__body">
      <section className="lobby__players" aria-label="Players">
        <h2 className="lobby__heading">
          {/* Counted against the KINGDOM seats, not the room's total seats.
              Showing 7/8 implied one more player could still pick a kingdom
              when in fact the last seat can only ever spectate. */}
          Players <span className="lobby__count">{activeCount}/{maxActive}</span>
          {spectatorCount > 0 && (
            <span className="lobby__count lobby__count--spectators">
              +{spectatorCount} watching
            </span>
          )}
        </h2>
        <ul className="lobby__list">
          {match.players.map((p) => (
            <li
              key={p.id}
              className={`lobby__player${p.connected ? '' : ' lobby__player--offline'}`}
            >
              <span className="lobby__name">
                {p.name}
                {p.isBot && <span className="lobby__tag lobby__tag--bot">Bot</span>}
                {p.id === youId && <span className="lobby__tag">You</span>}
                {p.id === match.hostId && <span className="lobby__tag lobby__tag--host">Host</span>}
              </span>
              <span className="lobby__meta">
                <PerkChips perks={p.perks} seats={seatedForScaling} />
                {kingdomLabel(p.kingdomId) && (
                  <span className="lobby__kingdom">{kingdomLabel(p.kingdomId)}</span>
                )}
                {p.isBot ? (
                  isHost && onSetBotDifficulty && onRemoveBot ? (
                    <span className="lobby__bot-controls">
                      <button
                        type="button"
                        className={`lobby__bot-level lobby__bot-level--${
                          p.botDifficulty ?? 'hard'
                        }`}
                        onClick={() =>
                          onSetBotDifficulty(p.id, nextDifficulty(p.botDifficulty))
                        }
                        aria-label={`${p.name} difficulty: ${botDifficultyLabel(
                          p.botDifficulty ?? 'hard',
                        )}. Tap to change.`}
                        title="Tap to change difficulty"
                      >
                        {botDifficultyLabel(p.botDifficulty ?? 'hard')}
                      </button>
                      <button
                        type="button"
                        className="lobby__bot-remove"
                        onClick={() => onRemoveBot(p.id)}
                        aria-label={`Remove ${p.name}`}
                        title={`Remove ${p.name}`}
                      >
                        &times;
                      </button>
                    </span>
                  ) : (
                    // Everyone else sees the setting, they just cannot change it.
                    <span
                      className={`lobby__bot-level lobby__bot-level--${
                        p.botDifficulty ?? 'hard'
                      } lobby__bot-level--static`}
                    >
                      {botDifficultyLabel(p.botDifficulty ?? 'hard')}
                    </span>
                  )
                ) : (
                  <span className={`lobby__ready${p.ready ? ' lobby__ready--on' : ''}`}>
                    {p.ready ? 'Ready' : 'Not ready'}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        {isHost && onAddBot && (
          <button
            type="button"
            className="lobby__add-bot"
            onClick={() => onAddBot('hard')}
            disabled={rosterFull}
          >
            + Add Bot
          </button>
        )}
      </section>

      <section className="lobby__kingdoms" aria-label="Choose your kingdom">
        <h2 className="lobby__heading">Kingdom</h2>
        {/* Picker on one side, the selected kingdom's dossier on the other.
            Stacked on narrow screens, side by side once there is room: with
            fifteen kingdoms a single column left the description squeezed into
            a few scrolling lines under a wall of buttons. */}
        <div className="lobby__kingdoms-split">
        <div className="lobby__kingdom-picker">
        <div className="lobby__kingdom-grid">
          {SELECTABLE_KINGDOMS.map((k) => {
            const takenByOther = match.players.some(
              (p) => p.id !== youId && p.kingdomId === k.id,
            )
            const selected = me?.kingdomId === k.id
            const Icon = KINGDOM_ICONS[k.id]
            return (
              <button
                key={k.id}
                type="button"
                className={`lobby__kingdom-btn${selected ? ' lobby__kingdom-btn--selected' : ''}${takenByOther ? ' lobby__kingdom-btn--taken' : ''}`}
                style={
                  {
                    '--k': k.color,
                    // Dark's colour is near-black; without this ring its card
                    // is invisible against the lobby's dark panel.
                    '--k-outline': outlineFor(k.color),
                    // The icon is drawn in the kingdom's own colour, swapped for
                    // white on one too dark to see against the panel.
                    '--k-ink': accentFor(k.color),
                  } as CSSProperties
                }
                disabled={takenByOther || (playersFull && !selected)}
                onClick={() => onSelectKingdom(k.id)}
              >
                {/* The same signature mark that is stamped on this kingdom's
                    castle, so the lobby teaches the battlefield's shorthand. */}
                <Icon className="lobby__kingdom-icon" aria-hidden="true" />
                <span className="lobby__kingdom-name">{k.label}</span>
                {takenByOther && <span className="lobby__kingdom-taken">Taken</span>}
              </button>
            )
          })}
        </div>

        {/* What the table has agreed to, for everyone to see. Read-only: the
            switches themselves live behind the admin gear in the corner, and a
            room with nothing switched on shows nothing at all. */}
        {!isPublic && activeRules.length > 0 && (
          <div className="lobby__rules" data-testid="lobby-rules">
            <span className="lobby__rules-label">Room options</span>
            <span className="lobby__rules-list">{activeRules.join(' · ')}</span>
          </div>
        )}

        <div className="lobby__spectate-row">
          <button
            type="button"
            className={`lobby__spectate-btn${isSpectator ? ' lobby__spectate-btn--on' : ''}`}
            onClick={onSpectate}
            aria-pressed={isSpectator}
          >
            {isSpectator ? 'Spectating' : 'Spectate'}
          </button>
          <span className="lobby__spectate-hint">
            {playersFull && !isSpectator
              ? `All ${maxActive} kingdom seats are full — join as a spectator.`
              : 'Watch the battle without playing.'}
          </span>
        </div>

        </div>

        <div className="lobby__kingdom-detail">
          {isSpectator ? (
            <p className="lobby__kingdom-hint">
              You're spectating — you'll see the full battlefield with no controls.
            </p>
          ) : me?.kingdomId ? (
            <KingdomDetails kingdomId={me.kingdomId} />
          ) : (
            <p className="lobby__kingdom-hint">
              Select a kingdom to view its passives and abilities.
            </p>
          )}
        </div>
        </div>
      </section>

      <section className="lobby__perks" aria-label="Choose your perks">
        <h2 className="lobby__heading">
          Perks{' '}
          <span className="lobby__count">
            {myPerks.length}/{perkAllowance}
          </span>
        </h2>
        {isSpectator ? (
          <p className="lobby__kingdom-hint">
            Spectators don't bring perks into the match.
          </p>
        ) : (
          <>
            <div className="lobby__perk-grid">
              {PERKS.map((perk) => {
                const selected = myPerks.includes(perk.id)
                const Icon = perk.icon
                return (
                  <button
                    key={perk.id}
                    type="button"
                    className={`lobby__perk-btn${selected ? ' lobby__perk-btn--selected' : ''}`}
                    style={{ '--p': perk.color } as CSSProperties}
                    aria-pressed={selected}
                    // Once two are picked, the rest lock until one is dropped.
                    disabled={perksFull && !selected}
                    onClick={() =>
                      onSelectPerks(togglePerk(myPerks, perk.id, me?.kingdomId))
                    }
                  >
                    <Icon className="lobby__perk-icon" aria-hidden />
                    <span className="lobby__perk-text">
                      <span className="lobby__perk-name">{perk.name}</span>
                      {/* The real number for THIS table: Better Construction's
                          shield bonus grows with the lobby (500 in a duel, 625
                          at seven), and the picker is where that decision gets
                          made. Every other perk is a percentage and reads the
                          same at any size. */}
                      <span className="lobby__perk-desc">
                        {perkDescription(perk, seatedForScaling)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="lobby__perk-hint">
              {perksFull
                ? 'Locked in — tap a perk to swap it out.'
                : `Pick ${PERKS_PER_PLAYER - myPerks.length} more. Perks stack with your kingdom's passives and abilities.`}
            </p>
          </>
        )}
      </section>
      </div>

      <div className="lobby__footer">
      {/* A public room starts itself, so there is no button to press — the
          countdown takes its place. */}
      {isPublic ? (
        <PublicCountdown startsAt={match.startsAt ?? null} />
      ) : (
        isHost && (
          <button
            type="button"
            className="lobby__start-btn"
            disabled={!canStart}
            onClick={onStart}
          >
            {startLabel}
          </button>
        )
      )}

      <div className="lobby__actions">
        <button
          type="button"
          className={`lobby__ready-btn${isReady ? ' lobby__ready-btn--on' : ''}`}
          disabled={!canReady}
          title={canReady ? undefined : readyBlocker}
          onClick={onToggleReady}
        >
          {isReady ? "I'm Ready" : canReady ? 'Ready Up' : readyBlocker}
        </button>
        <button type="button" className="lobby__leave-btn" onClick={onLeave}>
          Leave
        </button>
      </div>
      </div>
    </main>
  )
}

/**
 * The clock a public room starts on.
 *
 * ⚠️ COUNTS DOWN FROM A DEADLINE, not from a duration the server sent. Being
 * handed "18 seconds" makes every client's clock drift by its own latency and
 * they visibly disagree about when the match begins; subtracting an absolute
 * timestamp from `Date.now()` is the same answer on every machine.
 *
 * Ticks four times a second rather than once: at 1 Hz the number can appear to
 * skip a second when a render lands just after a boundary.
 */
function PublicCountdown({ startsAt }: { startsAt: number | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startsAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startsAt])

  if (startsAt === null) {
    return (
      <p className="lobby__countdown lobby__countdown--waiting">
        Waiting for players…
      </p>
    )
  }

  const seconds = Math.max(0, Math.ceil((startsAt - now) / 1000))
  return (
    <p
      className={`lobby__countdown${seconds <= 5 ? ' lobby__countdown--soon' : ''}`}
      role="timer"
      aria-live="off"
    >
      Starting in <strong>{seconds}s</strong>
      <span className="lobby__countdown-hint">Empty seats fill with bots</span>
    </p>
  )
}
