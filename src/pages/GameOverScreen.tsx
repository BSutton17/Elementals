import { useLobby } from '../game/useLobby'
import { leaveRoom } from '../game/lobbyStore'
import { clearGameState } from '../game/gameState'
import { getKingdomTheme } from '../game/kingdomThemes'
import { Scoreboard } from '../components/Scoreboard'
import './GameOverScreen.css'

/**
 * End-of-match screen: shown when the server flips the match phase to
 * "ended" (match:ended). Announces victory / defeat / draw, names the
 * winning kingdom, and returns the player to the main menu.
 */
export function GameOverScreen() {
  const { match, youId, result } = useLobby()
  if (!match) return null

  const winner = match.players.find((p) => p.id === match.winnerId) ?? null
  const winnerTheme = winner ? getKingdomTheme(winner.kingdomId) : null
  const youWon = match.winnerId != null && match.winnerId === youId
  const isDraw = match.winnerId == null

  const title = isDraw ? 'DRAW' : youWon ? 'VICTORY' : 'DEFEAT'

  const handleLeave = () => {
    clearGameState()
    void leaveRoom()
  }

  return (
    <main
      className={`game-over game-over--${isDraw ? 'draw' : youWon ? 'victory' : 'defeat'}`}
      style={
        winnerTheme
          ? ({ '--winner-color': winnerTheme.primary } as React.CSSProperties)
          : undefined
      }
    >
      <div className="game-over__content">
        <h1 className="game-over__title">{title}</h1>

        {isDraw ? (
          <p className="game-over__subtitle">
            Every kingdom fell. No throne was claimed.
          </p>
        ) : (
          <p className="game-over__subtitle">
            <span className="game-over__winner-name">{winner?.name ?? 'Unknown'}</span>
            {winnerTheme ? ` of the ${winnerTheme.name} Kingdom` : ''} is the last
            kingdom standing.
          </p>
        )}

        {/* The record of what actually happened. Absent only if the server
            ended the match without one - an older build, or a room torn down
            before the result could be built - in which case the headline above
            still stands on its own. */}
        {result && <Scoreboard result={result} youId={youId} />}

        <button type="button" className="game-over__leave" onClick={handleLeave}>
          Return to Menu
        </button>
      </div>
    </main>
  )
}
