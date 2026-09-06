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
  /**
   * Wall feedback, shown on the BOX rather than on the board.
   *
   * ⚠️ THE BOARD ITSELF MUST NEVER MOVE, AND IT USED TO SHAKE. Hitting a wall
   * played a 2px translate on the whole SVG — and dragging along a wall hits one
   * on almost every frame, so on a phone the maze juddered continuously while
   * being played. It also broke the drag outright: `getScreenCTM()` reads that
   * same element, so the screen-to-cell mapping shifted with the shake and the
   * maze moved out from under the finger. A colour flash on the box says the
   * same thing and moves nothing.
   */
  const [nudged, setNudged] = useState(false)
  /**
   * Where the box actually is, right now.
   *
   * ⚠️ THE REF IS THE TRUTH DURING A DRAG; THE STATE IS ONLY FOR DRAWING. A
   * pointer can fire faster than React re-renders — routinely so on a phone,
   * where `pointermove` runs at the screen's refresh rate and a render does
   * not. Every one of those handlers closed over the SAME stale `at` from the
   * last committed render, so each recomputed its walk from a position the box
   * had already left and appended those steps to the route AGAIN.
   *
   * That is the whole complaint: the box jitters between two cells because
   * consecutive handlers disagree about where it is, changes of direction land
   * on a stale origin and are computed as illegal, and the route arrives at the
   * server with repeated and impossible segments, so a maze that was solved on
   * screen is refused. Reading and writing the ref makes every handler start
   * from where the previous one finished, however many of them run between
   * paints.
   */
  const atRef = useRef<{ row: number; col: number } | null>(maze ? { ...maze.start } : null)
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
    // ⚠️ CLAMPED TO THE BOARD, NOT REJECTED FOR LEAVING IT. Straying a few
    // pixels past the edge used to return nothing, so the drag simply stopped
    // registering — and the two places a finger is most likely to be over the
    // edge are the START and the EXIT, which sit in opposite CORNERS. The last
    // stretch of every maze was the least reliable part of it. The box still
    // only moves by legal steps, so treating an off-board point as the nearest
    // cell concedes nothing.
    const clamp = (v: number) => Math.min(size - 1, Math.max(0, Math.floor(v / cell)))
    return { row: clamp(local.y), col: clamp(local.x) }
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

  /**
   * Every legal single step from `from` towards `target`, in order.
   *
   * ⚠️ A JUMP OF MORE THAN ONE CELL USED TO BE DISCARDED, AND THAT WAS MOST
   * OF THEM. A finger crossing two or three cells between two pointer events is
   * not unusual on a phone — it is what a normal-speed drag looks like — and
   * dropping those frames meant the box only moved when the drag happened to be
   * slow enough. It read as the box refusing to follow.
   *
   * Walked one cell at a time, greedily, through walls it may not cross, so the
   * result is still a route of legal single steps. Greedy is enough: this only
   * ever closes a gap of a few cells, and if it runs into a wall it stops and
   * the next pointer event carries on from there.
   */
  const walkTowards = (
    from: { row: number; col: number },
    target: { row: number; col: number },
  ) => {
    const steps: { row: number; col: number }[] = []
    let cur = from
    // Bounded: a greedy walk can stall against a wall, and this must never spin.
    for (let guard = 0; guard < size * 2; guard++) {
      if (cur.row === target.row && cur.col === target.col) break
      const options: { row: number; col: number }[] = []
      // The longer axis first, so a diagonal drag tracks the finger rather than
      // staircasing along one wall.
      const dRow = target.row - cur.row
      const dCol = target.col - cur.col
      const vertical = { row: cur.row + Math.sign(dRow), col: cur.col }
      const horizontal = { row: cur.row, col: cur.col + Math.sign(dCol) }
      if (Math.abs(dRow) >= Math.abs(dCol)) {
        if (dRow !== 0) options.push(vertical)
        if (dCol !== 0) options.push(horizontal)
      } else {
        if (dCol !== 0) options.push(horizontal)
        if (dRow !== 0) options.push(vertical)
      }
      const next = options.find((o) => !blocked(cur, o))
      if (!next) break
      steps.push(next)
      cur = next
    }
    return steps
  }

  const move = (event: React.PointerEvent) => {
    if (!dragging || done) return
    const target = cellAt(event)
    if (!target) return
    // Read from the ref, never from `at` — see the note on `atRef`.
    const from = atRef.current
    if (!from) return
    if (target.row === from.row && target.col === from.col) return

    const steps = walkTowards(from, target)
    if (steps.length === 0) {
      // Nowhere legal to go: a wall is in the way. Flash the box rather than
      // the board — see the note on `nudged`.
      if (!nudged) {
        setNudged(true)
        window.setTimeout(() => setNudged(false), 220)
      }
      return
    }

    for (const step of steps) route.current.push(step)
    const last = steps[steps.length - 1]!
    atRef.current = last
    setAt(last)
    if (last.row === maze.exit.row && last.col === maze.exit.col) {
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
        className="party-maze__board"
        viewBox={`-3 -3 ${BOARD + 6} ${BOARD + 6}`}
        data-testid="maze-board"
        // Stops the browser panning the page while a finger is dragging in here.
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (done) return
          const here = cellAt(e)
          if (!here) return
          const from = atRef.current
          if (!from) return
          // Start from the box or anywhere within two cells of it. Demanding
          // the exact cell is unusable with a thumb on a ten-by-ten grid, and a
          // wide grab cannot be abused: the box still only ever travels by
          // legal single steps, and the server replays the whole route against
          // its own walls.
          const near =
            Math.abs(here.row - from.row) <= 2 && Math.abs(here.col - from.col) <= 2
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
            className={`party-maze__runner-box${
              nudged ? ' party-maze__runner-box--nudged' : ''
            }`}
          />
        </g>

        <text x={exit.x} y={exit.y + cell * 0.16} className="party-maze__exit-mark">
          ★
        </text>
      </svg>
    </div>
  )
}
