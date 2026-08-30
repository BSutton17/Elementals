import { useEffect, useRef } from 'react'
import { CiSettings } from 'react-icons/ci'
import './RoomOptions.css'

/**
 * The room's optional rules, behind a gear in the corner.
 *
 * ⚠️ ADMIN-ONLY, AND HIDDEN RATHER THAN DISABLED. These two switches change
 * what a match IS — one hands eliminated players the whole board, the other
 * decides whether a monster turns up at all — so while they are being tuned
 * they belong to the account that owns the game. A greyed-out control that
 * nobody else can ever use is just a permanent advertisement for a thing they
 * cannot have; the panel simply is not there.
 *
 * ⚠️ AND THE SERVER DECIDES, NOT THIS. `lobby:setRules` re-checks the account on
 * every call. Hiding the gear is presentation.
 */
export function RoomOptions({
  open,
  onOpenChange,
  eliminatedSeeAllHealth,
  monstersEnabled,
  onChange,
  disabled = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eliminatedSeeAllHealth: boolean
  monstersEnabled: boolean
  onChange: (rules: { eliminatedSeeAllHealth?: boolean; monstersEnabled?: boolean }) => void
  /** True once the match has started — the rules are fixed from then on. */
  disabled?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)

  // Click anywhere else, or press Escape, and it closes. A panel in a corner
  // that only closes by pressing its own button gets left open.
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open, onOpenChange])

  return (
    <div className="room-options" ref={panel}>
      <button
        type="button"
        className={`room-options__gear${open ? ' room-options__gear--open' : ''}`}
        onClick={() => onOpenChange(!open)}
        aria-label="Room options"
        aria-expanded={open}
        data-testid="room-options-gear"
      >
        <CiSettings aria-hidden />
      </button>

      {open && (
        <div className="room-options__panel" role="dialog" aria-label="Room options">
          <h3 className="room-options__title">Room options</h3>

          <label className="room-options__rule">
            <input
              type="checkbox"
              checked={eliminatedSeeAllHealth}
              disabled={disabled}
              onChange={(e) => onChange({ eliminatedSeeAllHealth: e.target.checked })}
              data-testid="option-elimination-vision"
            />
            <span>
              <span className="room-options__name">Elimination vision</span>
              <span className="room-options__desc">
                Once knocked out, a player keeps watching every surviving kingdom’s health.
              </span>
            </span>
          </label>

          <label className="room-options__rule">
            <input
              type="checkbox"
              checked={monstersEnabled}
              disabled={disabled}
              onChange={(e) => onChange({ monstersEnabled: e.target.checked })}
              data-testid="option-monsters"
            />
            <span>
              <span className="room-options__name">Monsters</span>
              <span className="room-options__desc">
                A monster can take the middle of the field and start hitting the whole table.
              </span>
            </span>
          </label>

          <p className="room-options__note">
            Both are always off in public matches — a stranger queued for a free-for-all, not
            for these.
          </p>
        </div>
      )}
    </div>
  )
}
