import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MazeGame } from './MazeGame'
import type { PartySnapshot } from '../../game/party'

/**
 * Dragging the box through the maze.
 *
 * ⚠️ THIS FILE EXISTS BECAUSE THE DRAG SILENTLY DID NOT START. The board drew
 * perfectly, the box glowed in the corner, and pressing on it did nothing —
 * because the press was mapped to the wrong CELL, and the drag only begins when
 * the press lands on the runner. Nothing threw, nothing logged, and the picture
 * was correct the whole time.
 *
 * jsdom implements no SVG geometry, so `getScreenCTM` and `createSVGPoint` are
 * stubbed with a known transform. That makes this a test of the drag's RULES —
 * where a press starts it, which steps are legal, when it reports — rather than
 * of the browser's matrix maths, which is the browser's business.
 */

const SIZE = 10
const CELL = 10 // 100 user units across ten cells

/** A grid walled only on its boundary: every interior step is legal. */
function openGrid() {
  return Array.from({ length: SIZE * SIZE }, (_, i) => ({
    top: i < SIZE,
    bottom: i >= SIZE * (SIZE - 1),
    left: i % SIZE === 0,
    right: i % SIZE === SIZE - 1,
  }))
}

const party = (cells = openGrid()): PartySnapshot => ({
  gameId: 'maze',
  description: 'Escape the maze',
  elapsedTicks: 10,
  ticksRemaining: 180,
  shared: {
    maze: { size: SIZE, cells, start: { row: 0, col: SIZE - 1 }, exit: { row: SIZE - 1, col: 0 } },
  },
  players: { me: { done: false, outcome: null, finishedTick: null, data: {} } },
  firstFinisherId: null,
  finishOrder: [],
  resolved: false,
  resultText: null,
})

const acted = vi.fn().mockResolvedValue(true)
vi.mock('../../game/party', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../game/party')>()),
  partyAct: (action: Record<string, unknown>) => acted(action),
}))

/**
 * One user unit = one client pixel, with the origin at 0,0 — so a point in cell
 * (row, col) is simply its centre in user units.
 *
 * ⚠️ HAND-BUILT, BECAUSE jsdom HAS NEITHER `DOMMatrix` NOR SVG GEOMETRY. Reaching
 * for `new DOMMatrix()` throws in here, and a throw inside a pointer handler is
 * invisible: two of these tests passed on it, because "the box did not move" is
 * exactly what they were asserting. An identity transform stated explicitly is
 * both honest and enough — the browser's matrix maths is the browser's job.
 */
function stubSvgGeometry() {
  const identity = { inverse: () => identity }
  const proto = window.SVGSVGElement.prototype as unknown as {
    getScreenCTM: () => unknown
    createSVGPoint: () => unknown
  }
  proto.getScreenCTM = () => identity
  proto.createSVGPoint = () => ({
    x: 0,
    y: 0,
    matrixTransform(this: { x: number; y: number }) {
      return { x: this.x, y: this.y }
    },
  })
}

const pointIn = (row: number, col: number) => ({
  clientX: col * CELL + CELL / 2,
  clientY: row * CELL + CELL / 2,
})

/** Where the runner is now, read off its transform. */
function runnerCell(container: HTMLElement): { row: number; col: number } {
  const runner = container.querySelector('.party-maze__runner')!
  const [, x, y] = /translate\(([\d.]+) ([\d.]+)\)/.exec(runner.getAttribute('transform')!)!
  return { row: Math.floor(Number(y) / CELL), col: Math.floor(Number(x) / CELL) }
}

describe('the maze drag', () => {
  beforeEach(() => {
    acted.mockClear()
    stubSvgGeometry()
  })

  it('starts the box in the top-right corner on the first frame', () => {
    // Not from an effect: on a ten-second game a blank first frame is real time
    // off the clock, and it also renders as nothing wherever effects do not run.
    const { container } = render(<MazeGame party={party()} youId="me" />)
    expect(runnerCell(container)).toEqual({ row: 0, col: SIZE - 1 })
  })

  it('drags one cell at a time from a press on the box', () => {
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(0, 8), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 0, col: 8 })

    fireEvent.pointerMove(board, { ...pointIn(1, 8), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 1, col: 8 })
  })

  it('walks to where the finger got to, one legal step at a time', () => {
    // ⚠️ THIS USED TO DO NOTHING AT ALL, AND THAT WAS THE COMPLAINT. A finger
    // crossing two or three cells between pointer events is what a
    // normal-speed drag looks like on a phone; those frames were discarded, so
    // the box only moved when the drag happened to be slow enough and
    // otherwise appeared to refuse to follow.
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(5, 2), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 5, col: 2 })
  })

  it('reports every cell it crossed, not just the two ends', () => {
    // The server replays the route against its own walls, so a walk has to
    // arrive as the individual steps it was made of. A route that jumped from
    // the start straight to the exit is precisely what it refuses.
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(9, 0), pointerId: 1 })

    const route = acted.mock.calls.at(-1)?.[0].route as { row: number; col: number }[]
    expect(route[0]).toEqual({ row: 0, col: 9 })
    expect(route.at(-1)).toEqual({ row: 9, col: 0 })
    for (let i = 1; i < route.length; i++) {
      const step = Math.abs(route[i]!.row - route[i - 1]!.row) +
        Math.abs(route[i]!.col - route[i - 1]!.col)
      expect(step).toBe(1)
    }
  })

  it('turns a corner without the finger being lifted', () => {
    // ⚠️ THE REPORTED BUG, AND IT IS ABOUT STALE STATE, NOT ABOUT WALLS.
    // `pointermove` fires faster than React commits a render, so several
    // handlers used to run against the SAME position from the last paint. Each
    // recomputed its walk from a cell the box had already left, so a change of
    // direction was measured from the wrong origin, came out illegal, and was
    // dropped — while the route collected repeated segments the server would
    // refuse. Firing three moves with no render in between is exactly that.
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    // Down the right-hand side, then left along the bottom, then back up.
    fireEvent.pointerMove(board, { ...pointIn(4, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(4, 5), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(1, 5), pointerId: 1 })

    expect(runnerCell(container)).toEqual({ row: 1, col: 5 })
  })

  it('keeps following a finger that strays off the edge of the board', () => {
    // The start and the exit sit in opposite CORNERS, so the finger is over the
    // edge exactly where the maze matters most. An off-board point used to map
    // to nothing and the drag quietly stopped registering.
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(-2, 12), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 0, col: 9 })

    fireEvent.pointerMove(board, { ...pointIn(12, -2), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 9, col: 0 })
  })

  it('never moves the board itself, however hard it is dragged into a wall', () => {
    // ⚠️ THE BOARD SHAKING WAS NOT A COSMETIC PROBLEM. Wall feedback used to
    // translate the whole SVG, and dragging along a wall triggers it on almost
    // every frame — so the maze juddered continuously while being played. It
    // also broke the drag: `getScreenCTM()` reads that same element, so the
    // shake moved the screen-to-cell mapping out from under the finger.
    const cells = openGrid()
    const { container } = render(<MazeGame party={party(cells)} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    // Straight up, into the boundary wall, repeatedly.
    for (let i = 0; i < 5; i++) {
      fireEvent.pointerMove(board, { ...pointIn(-1, 9), pointerId: 1 })
    }
    expect(board.getAttribute('class')).toBe('party-maze__board')
  })

  it('will not walk through a wall', () => {
    const cells = openGrid()
    // Wall between (0,9) and (0,8), on both sides — a wall recorded once is the
    // classic maze bug: it blocks in one direction only.
    cells[9]!.left = true
    cells[8]!.right = true

    const { container } = render(<MazeGame party={party(cells)} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!
    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(0, 8), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 0, col: 9 })
  })

  it('does not move when nothing is being dragged', () => {
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!
    fireEvent.pointerMove(board, { ...pointIn(0, 8), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 0, col: 9 })
  })

  it('holds its position through a state sync', () => {
    // ⚠️ THE BOX SNAPPING BACK, WHICH IS WHAT THIS IS FOR. `party.shared.maze` is
    // a fresh object twenty times a second, so anything keyed on its identity
    // re-runs twenty times a second. A reset effect keyed that way put the box
    // back at the start on every sync — on screen, a box that fights the drag.
    const { container, rerender } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(0, 8), pointerId: 1 })
    fireEvent.pointerMove(board, { ...pointIn(0, 7), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 0, col: 7 })

    // A sync arrives: same maze, brand-new objects, one tick later.
    rerender(<MazeGame party={{ ...party(), elapsedTicks: 11 }} youId="me" />)
    expect(runnerCell(container)).toEqual({ row: 0, col: 7 })

    // ...and the drag is still live, rather than needing a new press.
    fireEvent.pointerMove(board, { ...pointIn(0, 6), pointerId: 1 })
    expect(runnerCell(container)).toEqual({ row: 0, col: 6 })
  })

  it('reports the whole route once the box reaches the exit', async () => {
    // ⚠️ THE ROUTE, NOT A VERDICT. The server replays every step against its own
    // walls; a client that could say "I made it" would win this every time.
    const { container } = render(<MazeGame party={party()} youId="me" />)
    const board = container.querySelector('[data-testid="maze-board"]')!

    fireEvent.pointerDown(board, { ...pointIn(0, 9), pointerId: 1 })
    for (let col = 8; col >= 0; col--) {
      fireEvent.pointerMove(board, { ...pointIn(0, col), pointerId: 1 })
    }
    for (let row = 1; row < SIZE; row++) {
      fireEvent.pointerMove(board, { ...pointIn(row, 0), pointerId: 1 })
    }

    expect(acted).toHaveBeenCalledTimes(1)
    const sent = acted.mock.calls[0]![0] as { type: string; route: { row: number; col: number }[] }
    expect(sent.type).toBe('solve')
    expect(sent.route[0]).toEqual({ row: 0, col: SIZE - 1 })
    expect(sent.route.at(-1)).toEqual({ row: SIZE - 1, col: 0 })
    // Every step is one orthogonal move: that is what the server checks.
    for (let i = 1; i < sent.route.length; i++) {
      const from = sent.route[i - 1]!
      const to = sent.route[i]!
      expect(Math.abs(to.row - from.row) + Math.abs(to.col - from.col)).toBe(1)
    }
  })
})
