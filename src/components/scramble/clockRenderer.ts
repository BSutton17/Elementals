// Clock renderer — reusable canvas draw primitives for the "Half Past 12"
// temporal-scramble effect (Time). Every mark here is pure: it draws to a 2D
// context and returns nothing, so the overlay's simulation owns all state and
// these stay trivially reusable/testable. Palette is golden / silver / pale
// blue "unstable time" energy over the grandfather-clock theme.

export const SCRAMBLE_PALETTE = {
  gold: '217, 178, 90', // aged brass
  silver: '207, 214, 224', // clock silver
  blue: '159, 208, 255', // pale temporal blue
  ink: '61, 43, 26', // walnut ink for outlines
} as const

export type ClockHue = keyof typeof SCRAMBLE_PALETTE

const TAU = Math.PI * 2

/** A translucent clock FACE with a tick ring and two hands at the given time. */
export function drawClockFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  /** Whole rotation of the whole face (radians) — the face itself tumbling. */
  rotation: number,
  /** Minute/hour hand angles (radians, 0 = up). */
  minute: number,
  hour: number,
  alpha: number,
  hue: ClockHue = 'silver',
): void {
  if (alpha <= 0) return
  const rgb = SCRAMBLE_PALETTE[hue]
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)

  // Rim.
  ctx.lineWidth = Math.max(1, r * 0.05)
  ctx.strokeStyle = `rgba(${rgb}, ${alpha})`
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.stroke()

  // Inner glow ring.
  ctx.strokeStyle = `rgba(${SCRAMBLE_PALETTE.blue}, ${alpha * 0.4})`
  ctx.lineWidth = Math.max(1, r * 0.03)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.86, 0, TAU)
  ctx.stroke()

  // Twelve ticks (12, 3, 6, 9 longer).
  ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.85})`
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU
    const major = i % 3 === 0
    const outer = r * 0.92
    const inner = r * (major ? 0.74 : 0.82)
    ctx.lineWidth = major ? Math.max(1, r * 0.045) : Math.max(1, r * 0.025)
    ctx.beginPath()
    ctx.moveTo(Math.sin(a) * inner, -Math.cos(a) * inner)
    ctx.lineTo(Math.sin(a) * outer, -Math.cos(a) * outer)
    ctx.stroke()
  }

  // Hands (drawn in the face's local frame; 0 = up).
  drawHand(ctx, hour, r * 0.5, Math.max(1.5, r * 0.06), `rgba(${rgb}, ${alpha})`)
  drawHand(ctx, minute, r * 0.78, Math.max(1, r * 0.04), `rgba(${SCRAMBLE_PALETTE.gold}, ${alpha})`)

  // Hub.
  ctx.fillStyle = `rgba(${SCRAMBLE_PALETTE.gold}, ${alpha})`
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(1.5, r * 0.06), 0, TAU)
  ctx.fill()

  ctx.restore()
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  angle: number,
  len: number,
  width: number,
  stroke: string,
): void {
  ctx.save()
  ctx.rotate(angle)
  ctx.strokeStyle = stroke
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, width)
  ctx.lineTo(0, -len)
  ctx.stroke()
  ctx.restore()
}

/** A spinning GEAR silhouette (outline + hub), teeth around the rim. */
export function drawGear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  teeth: number,
  rotation: number,
  alpha: number,
  hue: ClockHue = 'gold',
): void {
  if (alpha <= 0) return
  const rgb = SCRAMBLE_PALETTE[hue]
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.strokeStyle = `rgba(${rgb}, ${alpha})`
  ctx.lineWidth = Math.max(1, r * 0.08)
  ctx.beginPath()
  const toothH = r * 0.22
  for (let i = 0; i <= teeth; i++) {
    const a0 = (i / teeth) * TAU
    const a1 = ((i + 0.5) / teeth) * TAU
    const ro = r + toothH
    // outer tooth tip then back to the root — a simple castellated rim.
    ctx.lineTo(Math.cos(a0) * ro, Math.sin(a0) * ro)
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r)
  }
  ctx.closePath()
  ctx.stroke()
  // Hub.
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.4, 0, TAU)
  ctx.stroke()
  ctx.restore()
}

/** A long, thin clock HAND sweeping across part of the screen from a pivot. */
export function drawSweepHand(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  length: number,
  angle: number,
  alpha: number,
  hue: ClockHue = 'blue',
): void {
  if (alpha <= 0) return
  const rgb = SCRAMBLE_PALETTE[hue]
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  const grad = ctx.createLinearGradient(0, 0, length, 0)
  grad.addColorStop(0, `rgba(${rgb}, ${alpha})`)
  grad.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.strokeStyle = grad
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-length * 0.08, 0)
  ctx.lineTo(length, 0)
  ctx.stroke()
  ctx.restore()
}

/** An expanding "tick" RIPPLE ring — a visual heartbeat of passing time. */
export function drawRipple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
  hue: ClockHue = 'blue',
): void {
  if (alpha <= 0 || r <= 0) return
  ctx.strokeStyle = `rgba(${SCRAMBLE_PALETTE[hue]}, ${alpha})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.stroke()
}

/** A drifting glowing NUMERAL (clock digits shaken loose). */
export function drawNumeral(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  size: number,
  rotation: number,
  alpha: number,
  hue: ClockHue = 'gold',
): void {
  if (alpha <= 0) return
  const rgb = SCRAMBLE_PALETTE[hue]
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.font = `700 ${size}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = `rgba(${rgb}, ${alpha})`
  ctx.shadowBlur = size * 0.5
  ctx.fillStyle = `rgba(${rgb}, ${alpha})`
  ctx.fillText(text, 0, 0)
  ctx.restore()
}
