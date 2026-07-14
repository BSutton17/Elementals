import type { EffectDefinition } from './types'

// Effect registry (Epic 9, ticket #210). Effects are keyed by ability id and
// status id — the same authoritative ids the server events carry — so future
// tickets register visuals per ability/status without touching the framework.
// Shared elemental themes (via each definition's `tintFrom`) supply common
// colours, keeping definitions small.

export class EffectRegistry {
  private readonly defs = new Map<string, EffectDefinition>()

  register(id: string, def: EffectDefinition): this {
    this.defs.set(id, def)
    return this
  }

  registerMany(entries: Record<string, EffectDefinition>): this {
    for (const [id, def] of Object.entries(entries)) this.defs.set(id, def)
    return this
  }

  resolve(id: string): EffectDefinition | undefined {
    return this.defs.get(id)
  }

  has(id: string): boolean {
    return this.defs.has(id)
  }

  get size(): number {
    return this.defs.size
  }
}
