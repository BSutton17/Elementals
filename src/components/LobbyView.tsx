import type { CSSProperties } from 'react'
import { RoomCode } from './RoomCode'
import { KINGDOMS, type KingdomId } from '../game/kingdoms'
import { KINGDOM_PASSIVES_INFO } from '../game/kingdomInfo'
import { getAbilitiesForKingdom } from '../game/abilities'
import { MIN_PLAYERS_TO_START, type LobbyMatch } from '../game/lobby'
import './LobbyView.css'

interface LobbyViewProps {
  match: LobbyMatch
  youId: string | null
  onToggleReady: () => void
  onSelectKingdom: (kingdom: KingdomId) => void
  onStart: () => void
  onLeave: () => void
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
  onStart,
  onLeave,
}: LobbyViewProps) {
  const me = match.players.find((p) => p.id === youId)
  const isReady = me?.ready ?? false
  const isHost = youId != null && youId === match.hostId
  const connected = match.players.filter((p) => p.connected)
  const enoughPlayers = connected.length >= MIN_PLAYERS_TO_START
  const allHaveKingdom = connected.every((p) => p.kingdomId !== null)
  const allReady = connected.every((p) => p.ready)
  const canStart = enoughPlayers && allHaveKingdom && allReady

  // Tell the host exactly what's blocking the start.
  const startLabel = canStart
    ? 'Start Match'
    : !enoughPlayers
      ? `Need ${MIN_PLAYERS_TO_START}+ players`
      : !allHaveKingdom
        ? 'Everyone must pick a kingdom'
        : 'Everyone must ready up'
  const kingdomLabel = (id: string | null) =>
    KINGDOMS.find((k) => k.id === id)?.label ?? null

  return (
    <main className="lobby">
      <RoomCode code={match.roomCode} />

      <div className="lobby__body">
      <section className="lobby__players" aria-label="Players">
        <h2 className="lobby__heading">
          Players <span className="lobby__count">{match.playerCount}/{match.maxPlayers}</span>
        </h2>
        <ul className="lobby__list">
          {match.players.map((p) => (
            <li
              key={p.id}
              className={`lobby__player${p.connected ? '' : ' lobby__player--offline'}`}
            >
              <span className="lobby__name">
                {p.name}
                {p.id === youId && <span className="lobby__tag">You</span>}
                {p.id === match.hostId && <span className="lobby__tag lobby__tag--host">Host</span>}
              </span>
              <span className="lobby__meta">
                {kingdomLabel(p.kingdomId) && (
                  <span className="lobby__kingdom">{kingdomLabel(p.kingdomId)}</span>
                )}
                <span className={`lobby__ready${p.ready ? ' lobby__ready--on' : ''}`}>
                  {p.ready ? 'Ready' : 'Not ready'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lobby__kingdoms" aria-label="Choose your kingdom">
        <h2 className="lobby__heading">Kingdom</h2>
        <div className="lobby__kingdom-grid">
          {KINGDOMS.map((k) => {
            const takenByOther = match.players.some(
              (p) => p.id !== youId && p.kingdomId === k.id,
            )
            const selected = me?.kingdomId === k.id
            return (
              <button
                key={k.id}
                type="button"
                className={`lobby__kingdom-btn${selected ? ' lobby__kingdom-btn--selected' : ''}${takenByOther ? ' lobby__kingdom-btn--taken' : ''}`}
                style={{ '--k': k.color } as CSSProperties}
                disabled={takenByOther}
                onClick={() => onSelectKingdom(k.id)}
              >
                {k.label}
                {takenByOther && <span className="lobby__kingdom-taken">Taken</span>}
              </button>
            )
          })}
        </div>

        {me?.kingdomId ? (
          <KingdomDetails kingdomId={me.kingdomId} />
        ) : (
          <p className="lobby__kingdom-hint">
            Select a kingdom to view its passives and abilities.
          </p>
        )}
      </section>
      </div>

      <div className="lobby__footer">
      {isHost && (
        <button
          type="button"
          className="lobby__start-btn"
          disabled={!canStart}
          onClick={onStart}
        >
          {startLabel}
        </button>
      )}

      <div className="lobby__actions">
        <button
          type="button"
          className={`lobby__ready-btn${isReady ? ' lobby__ready-btn--on' : ''}`}
          onClick={onToggleReady}
        >
          {isReady ? "I'm Ready ✓" : 'Ready Up'}
        </button>
        <button type="button" className="lobby__leave-btn" onClick={onLeave}>
          Leave
        </button>
      </div>
      </div>
    </main>
  )
}
