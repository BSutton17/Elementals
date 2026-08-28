import type { DailyQuest } from '../game/auth'
import './DailyChallenges.css'

/**
 * The day's three challenges, on the main menu.
 *
 * ⚠️ SIGNED-IN ONLY, AND THAT IS THE POINT. Quests are progress against an
 * account: a guest has none to show and never will, so the panel is simply
 * absent for them rather than present and empty. It is also the clearest reason
 * on the menu to sign in at all, which is why it sits here and not only three
 * taps away in the profile.
 *
 * Deliberately terser than the profile's version. This is a menu — it answers
 * "is there anything worth doing today" at a glance and leaves the detail to
 * the page that exists for it.
 */

/** "6h 12m", or "12m", or "any moment now". */
function until(iso: string | null): string | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  if (ms <= 60_000) return 'any moment now'
  const mins = Math.round(ms / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function DailyChallenges({
  quests,
  resetsAt,
}: {
  quests: DailyQuest[]
  /** ISO instant the day rolls over, from the profile. */
  resetsAt: string | null
}) {
  // Nothing to show is not an error and not a placeholder: the panel is only
  // ever an addition to the menu, so it disappears rather than reserving space.
  if (quests.length === 0) return null

  const done = quests.filter((q) => q.completed).length
  const left = until(resetsAt)

  return (
    <section className="menu-quests" aria-label="Daily challenges">
      <header className="menu-quests__head">
        <h2 className="menu-quests__title">Daily challenges</h2>
        {/* The count is the summary; the rows are the detail. Someone who has
            finished all three should be able to tell without reading them. */}
        <span className="menu-quests__count">
          {done}/{quests.length}
          {left ? <span className="menu-quests__reset"> · new in {left}</span> : null}
        </span>
      </header>

      <ul className="menu-quests__list">
        {quests.map((q) => {
          const pct = Math.min(100, (q.progress / Math.max(1, q.target)) * 100)
          return (
            <li
              key={q.questId}
              className={`menu-quest${q.completed ? ' menu-quest--done' : ''}`}
              data-testid="menu-quest"
            >
              <div className="menu-quest__line">
                {/* Tier is written, not only coloured — a harder quest paying
                    more is the whole reason to prefer one. */}
                <span className={`menu-quest__tier menu-quest__tier--${q.tier}`}>{q.tier}</span>
                <span className="menu-quest__text">{q.description}</span>
                <span className="menu-quest__num">
                  {q.completed ? '✓' : `${Math.min(q.progress, q.target)}/${q.target}`}
                </span>
              </div>
              <div
                className="menu-quest__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={q.target}
                aria-valuenow={Math.min(q.progress, q.target)}
                aria-label={q.description}
              >
                <div className="menu-quest__fill" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>

      <p className="menu-quests__reward">
        {quests.reduce((n, q) => n + (q.completed ? 0 : q.coins), 0).toLocaleString()} coins and{' '}
        {quests.reduce((n, q) => n + (q.completed ? 0 : q.xp), 0).toLocaleString()} XP still on the
        table today.
      </p>
    </section>
  )
}
