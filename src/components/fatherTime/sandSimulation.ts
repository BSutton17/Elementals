// Reusable falling-sand simulation for Father Time's spectral hourglasses.
// A pool of glowing grains falling through a column; `pressure` (0..1) speeds
// them up as the victim's idle countdown escalates, and `reverse` makes the
// sand float back UP into the bulb on expiry. Pure canvas — no React, no state
// outside the instance — so it is trivially reusable and jsdom-safe.

interface Grain {
  x: number
  y: number
  vy: number
  r: number
  a: number
}

export class SandSimulation {
  private grains: Grain[] = []
  private readonly cx: number
  private readonly top: number
  private readonly bottom: number
  private readonly width: number

  constructor(cx: number, top: number, bottom: number, width: number, count = 40) {
    this.cx = cx
    this.top = top
    this.bottom = bottom
    this.width = width
    for (let i = 0; i < count; i++) this.grains.push(this.spawn(Math.random()))
  }

  private spawn(t: number): Grain {
    return {
      x: this.cx + (Math.random() - 0.5) * this.width,
      y: this.top + t * (this.bottom - this.top),
      vy: 40 + Math.random() * 40,
      r: 0.8 + Math.random() * 1.6,
      a: 0.5 + Math.random() * 0.4,
    }
  }

  /** Advance and draw. `pressure` 0..1 speeds the fall; `reverse` floats up. */
  update(
    ctx: CanvasRenderingContext2D,
    dt: number,
    pressure: number,
    fade: number,
    reverse: boolean,
  ): void {
    const speed = (0.6 + pressure * 2.4) * (reverse ? -1.6 : 1)
    for (const g of this.grains) {
      g.y += g.vy * speed * dt
      // narrow toward the pinch in the middle for an hourglass silhouette.
      if (!reverse && g.y > this.bottom) {
        Object.assign(g, this.spawn(0)) // recycle to the top
      } else if (reverse && g.y < this.top) {
        g.y = this.bottom
      }
      ctx.fillStyle = `rgba(233, 208, 150, ${g.a * fade})`
      ctx.beginPath()
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
