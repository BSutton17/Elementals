// Generic object pool (Epic 9, ticket #210). Reused by every effect system so
// many simultaneous effects (8-player matches) recycle a bounded set of display
// nodes instead of churning allocations and GC.

export interface PoolOptions {
  /** Nodes to create up front. */
  prewarm?: number
  /** Cap on retained idle nodes; extras released beyond this are dropped. */
  maxIdle?: number
}

export class ObjectPool<T> {
  private readonly idle: T[] = []
  private readonly maxIdle: number
  private readonly factory: () => T
  private readonly reset?: (item: T) => void
  private _created = 0

  constructor(factory: () => T, reset?: (item: T) => void, options: PoolOptions = {}) {
    this.factory = factory
    this.reset = reset
    this.maxIdle = options.maxIdle ?? Infinity
    for (let i = 0; i < (options.prewarm ?? 0); i++) this.idle.push(this.make())
  }

  private make(): T {
    this._created++
    return this.factory()
  }

  /** Reuse an idle item, or create one if the pool is empty. */
  acquire(): T {
    return this.idle.pop() ?? this.make()
  }

  /** Reset an item and return it to the idle set (dropped if over maxIdle). */
  release(item: T): void {
    this.reset?.(item)
    if (this.idle.length < this.maxIdle) this.idle.push(item)
  }

  /** Idle items currently retained. */
  get idleCount(): number {
    return this.idle.length
  }

  /** Total items ever created (for pool-sizing diagnostics). */
  get created(): number {
    return this._created
  }

  /** Empties the idle set, optionally destroying each retained item. */
  clear(destroy?: (item: T) => void): void {
    if (destroy) for (const item of this.idle) destroy(item)
    this.idle.length = 0
  }
}
