import { useMemo, useRef, useState } from 'react'
import { partyAct, type MazeLayout, type PartySnapshot } from '../../game/party'
import { countdownSeconds } from './countdown'

/**
 * Escape the maze.
 *
 * Drag the glowing box from the top-right corner to the exit. Five seconds.
 *
 * ⚠️ POINTER EVENTS, NOT MOUSE EVENTS. Half the table is on a phone, and this
 * is a drag — `mousedown`/`mousemove` simply do not fire for a finger. Pointer
 * events cover mouse, touch and stylus with one code path, and
 * `setPointerCapture` keeps the drag alive when the finger strays outside the
 * grid, which on a small screen it constantly does.
 *
 * ⚠️ THE ROUTE IS ACCUMULATED, NOT INFERRED. Every cell the box passes through
 * is appended as it happens, and that list is what the server replays against
 * its own walls. Sending "I got there" would be a client deciding it won.
 */

/** Drawn size of the grid in its own coordinate space. */
const BOARD = 100

export function MazeGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const maze = party.shared.maze as unknown as MazeLayout | undefined
  const mine = youId ? party.players[youId] : undefined
  const done = mine?.done ?? false

  // ⚠️ LAZY INITIAL STATE, NOT AN EFFECT. Starting at `null` and filling it in
  // from a `useEffect` means the first frame draws nothing — on a five-second
  // game that blank frame is a real fraction of the clock, and it also makes
  // the component render as nothing anywhere effects do not run.
  const [at, setAt] = useState<{ row: number; col: number } | null>(() =>
    maze ? { ...maze.start } : null,
  )
  const [dragging, setDragging] = useState(false)
  const [bumped, setBumped] = useState(false)
  const route = useRef<{ row: number; col: number }[]>(maze ? [{ ...maze.start }] : [])
  const svg = useRef<SVGSVGElement>(null)
  const sent = useRef(false)

  const size = maze?.size ?? 10
  const cell = BOARD / size

  // ⚠️ THERE IS NO "RESET" EFFECT, AND THERE MUST NOT BE. `party.shared.maze` is
  // a fresh object on every state sync — twenty a second — so an effect keyed on
  // it re-ran twenty times a second and put the box back at the start each
  // time. On screen that is a box that snaps back and fights the drag: the
  // player moves a cell, the next sync undoes it, forever.
  //
  // Nothing needs to reset it. A new session mounts a new component (the stage
  // renders nothing between sessions), so the lazy initial state above IS the
  // reset, and it runs exactly once.

  const wallsOf = useMemo(() => {
    if (!maze) return []
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (let row = 0; row < maze.size; row++) {
      for (let col = 0; col < maze.size; col++) {
        const c = maze.cells[row * maze.size + col]!
        const x = col * cell
        const y = row * cell
        // Only the top and left of each cell, plus the far edges: drawing all
        // four sides paints every interior wall twice, which reads as thicker
        // walls on one diagonal and thinner on the other.
        if (c.top) lines.push({ x1: x, y1: y, x2: x + cell, y2: y })
        if (c.left) lines.push({ x1: x, y1: y, x2: x, y2: y + cell })
        if (row === maze.size - 1 && c.bottom)
          lines.push({ x1: x, y1: y + cell, x2: x + cell, y2: y + cell })
        if (col === maze.size - 1 && c.right)
          lines.push({ x1: x + cell, y1: y, x2: x + cell, y2: y + cell })
      }
    }
    return lines
  }, [maze, cell])

  if (!maze || !at) return null

  const centreOf = (spot: { row: number; col: number }) => ({
    x: spot.col * cell + cell / 2,
    y: spot.row * cell + cell / 2,
  })

  /**
   * Screen point → maze cell.
   *
   * ⚠️ THROUGH THE SVG'S OWN MATRIX, NOT ITS BOUNDING BOX. Scaling the client
   * rect assumes the viewBox fills the element exactly, and this one does not:
   * it starts at -3,-3 and the default `preserveAspectRatio` letterboxes the
   * square board inside whatever shape the panel is. Both of those shift the
   * mapping, so the cell under the cursor came out wrong — and since the drag
   * only starts when the press lands on the runner's own cell, it mostly did
   * not start at all. `getScreenCTM()` is the browser's own answer and is
   * exact for any viewBox, aspect ratio, zoom or page scroll.
   */
  const cellAt = (event: React.PointerEvent): { row: number; col: number } | null => {
    const element = svg.current
    if (!element) return null
    const matrix = element.getScreenCTM()
    if (!matrix) return null
    const point = element.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    const col = Math.floor(local.x / cell)
    const row = Math.floor(local.y / cell)
    if (row < 0 || col < 0 || row >= size || col >= size) return null
    return { row, col }
  }

  /** Whether a step from `from` to `to` passes through a wall. */
  const blocked = (from: { row: number; col: number }, to: { row: number; col: number }) => {
    const c = maze.cells[from.row * maze.size + from.col]!
    if (to.row === from.row - 1 && to.col === from.col) return c.top
    if (to.row === from.row + 1 && to.col === from.col) return c.bottom
    if (to.col === from.col - 1 && to.row === from.row) return c.left
    if (to.col === from.col + 1 && to.row === from.row) return c.right
    return true
  }

  const finish = () => {
    if (sent.current) return
    sent.current = true
    void partyAct({ type: 'solve', route: route.current })
  }

  const move = (event: React.PointerEvent) => {
    if (!dragging || done) return
    const next = cellAt(event)
    if (!next) return
    if (next.row === at.row && next.col === at.col) return

    // One step at a time, walls respected. A finger crossing two cells in one
    // frame is normal, so anything that is not a legal single step is simply
    // ignored rather than treated as a cheat — the drag continues from where
    // the box actually is.
    if (Math.abs(next.row - at.row) + Math.abs(next.col - at.col) !== 1) return
    if (blocked(at, next)) {
      if (!bumped) {
        setBumped(true)
        window.setTimeout(() => setBumped(false), 220)
      }
      return
    }

    route.current.push(next)
    setAt(next)
    if (next.row === maze.exit.row && next.col === maze.exit.col) {
      setDragging(false)
      finish()
    }
  }

  const box = centreOf(at)
  const exit = centreOf(maze.exit)
  // Only the last few seconds — see `countdown.ts` for why a full-length timer
  // makes people watch the clock instead of the maze.
  const secondsLeft = countdownSeconds(party.ticksRemaining)

  return (
    <div className="party-maze">
      <div className="party-maze__head">
        <span className="party-maze__hint">
          {done ? 'Out!' : 'Drag the box to the exit'}
        </span>
        {secondsLeft !== null && !done && (
          <span className="party-maze__clock" data-testid="maze-clock">
            {secondsLeft}s
          </span>
        )}
      </div>

      <svg
        ref={svg}
        className={`party-maze__board${bumped ? ' party-maze__board--bump' : ''}`}
        viewBox={`-3 -3 ${BOARD + 6} ${BOARD + 6}`}
        data-testid="maze-board"
        // Stops the browser panning the page while a finger is dragging in here.
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (done) return
          const here = cellAt(e)
          if (!here) return
          // Start from the box or the cell beside it. Demanding the exact cell
          // is unusable with a thumb on a ten-by-ten grid, and it cannot be
          // abused: the box still only ever moves one legal step at a time.
          const near =
            Math.abs(here.row - at.row) <= 1 && Math.abs(here.col - at.col) <= 1
          if (!near) return

          // ⚠️ CAPTURE IS AN ENHANCEMENT, NOT A REQUIREMENT, AND IT MUST NOT BE
          // ABLE TO STOP THE DRAG. `setPointerCapture` throws whenever the
          // browser does not consider the pointer active on this element — a
          // stale id, a synthetic event, an element mid-remount — and the throw
          // lands BEFORE `setDragging(true)`, so the drag silently never
          // begins. Everything still works without capture; the finger just has
          // to stay over the board.
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // No capture available. Carry on.
          }
          setDragging(true)
        }}
        onPointerMove={move}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <rect x={0} y={0} width={BOARD} height={BOARD} className="party-maze__floor" rx={2} />

        {/* The exit, drawn under the walls so its glow never covers one. */}
        <rect
          x={maze.exit.col * cell + 1}
          y={maze.exit.row * cell + 1}
          width={cell - 2}
          height={cell - 2}
          className="party-maze__exit"
          rx={1.5}
        />

        {wallsOf.map((w, i) => (
          <line
            key={i}
            x1={w.x1}
            y1={w.y1}
            x2={w.x2}
            y2={w.y2}
            className="party-maze__wall"
          />
        ))}

        {/* The trail, so a player can see where they have been on a small screen. */}
        {route.current.length > 1 && (
          <polyline
            className="party-maze__trail"
            points={route.current.map((c) => {
              const p = centreOf(c)
              return `${p.x},${p.y}`
            }).join(' ')}
          />
        )}

        <g className="party-maze__runner" transform={`translate(${box.x} ${box.y})`}>
          <rect
            x={-cell * 0.3}
            y={-cell * 0.3}
            width={cell * 0.6}
            height={cell * 0.6}
            rx={1.2}
            className="party-maze__runner-box"
          />
        </g>

        <text x={exit.x} y={exit.y + cell * 0.16} className="party-maze__exit-mark">
          ★
        </text>
      </svg>
    </div>
  )
}
