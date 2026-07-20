# Epic 9 — Battlefield Visual Effects (PixiJS) — Handoff

You are taking over the **visual effects / animation layer** for *Kingdoms* (a 2–8 player
real-time elemental RTS). This document is everything you need to be productive. Read it
fully before touching code.

---

## 0. The one rule that governs everything

**Rendering is 100% downstream of gameplay.** The server is authoritative. The Pixi layer
only *visualizes* events the server already decided. Concretely:

- **Never** put gameplay logic in the renderer. No damage math, no cooldowns, no targeting
  rules, no RNG that affects outcomes.
- **Never** compute gameplay from render state.
- The renderer's only inputs are: (a) authoritative gameplay **events**, and (b) battlefield
  **coordinates** (from `placement.ts`). Its only output is pixels.
- Keep effects **data-driven** (config objects in a registry), **reusable** (no per-kingdom
  branches), and **performant** (pooling, caps — matches can have 8 players throwing spells).

If you ever feel tempted to read HP, decide whether something hit, or branch on a specific
kingdom's name inside `render/`, stop — that's a design smell.

---

## 1. Architecture & data flow

```
SERVER (authoritative)                         CLIENT (visualize only)
─────────────────────                          ────────────────────────
engine/*  →  GameState.events (EventBus)
                     │ emits GameplayEvent (abilityCast, damage, …)
                     ▼
GameLoopManager  buffers events per tick
                     │ flushes on sync cadence (10 Hz) + at match end
                     ▼
net/gameSync.broadcastGameEvents
                     │  io.to(room).emit("evt:batch", { tick, events })
                     ▼
     ~~~~~~~~~~~~~ Socket.IO ~~~~~~~~~~~~~►  game/gameEvents.ts  (socket.on "evt:batch")
                                                     │ onGameEvents(handler)  (pub/sub)
                                                     ▼
                                            components/BattlefieldFx.tsx  (dispatch)
                                                     │ maps ids → coords (placement.ts)
                                                     │ playAbility(id, {from,to,sourceKingdom})
                                                     ▼
                                            render/framework.ts  AnimationFramework
                                                     │ resolves EffectDefinition from registry
                                                     ▼
                                   render/systems/{projectiles,impacts,particles} + camera
                                                     │ drive DisplayNodes (Pixi Graphics)
                                                     ▼
                                            render/stage.ts  PixiStage (Application + ticker)
                                                     └─ canvas overlay, beneath the HTML UI
```

**State vs events.** The client already had `game/gameState.ts` (a mirror of `state:sync`
snapshots — HP, economy, positions, used by the SVG battlefield/React). Epic 9 added a
*separate* transient **event** stream (`game/gameEvents.ts`) because effects are one-shot
signals, not state. Don't conflate them.

---

## 2. Where everything lives

### Server (repo: `Elementals-Server`, dir `Server/`)
| File | Role |
|---|---|
| `src/engine/events.ts` | **The `GameplayEvent` union** (abilityCast, damage, heal, statusApplied/Expired, eliminated, shieldGained/Destroyed, castFailed, projectileSpawned*, …) + the tiny `EventBus` class (`on`/`emit`/`enabled`). *`projectileSpawned` has **no emitter** — drive projectile VFX from `abilityCast`.* |
| `src/match/GameState.ts` | Owns `readonly events = new EventBus()` — one bus per match. |
| `src/engine/GameLoopManager.ts` | Subscribes to the bus **only when a `syncEvents` consumer is wired**, buffers events, flushes on the sync cadence + once at match end, unsubscribes on stop. |
| `src/net/gameSync.ts` | `broadcastGameEvents(io, match, events)` → emits `evt:batch`. (Also `broadcastGameState` for `state:sync`.) |
| `src/index.ts` | Wires `syncEvents: (m,e) => broadcastGameEvents(io,m,e)`. |
| `src/data/balance.ts` | `TICK.RATE = 20`, `TICK.SYNC_EVERY_TICKS = 2` ⇒ events/state flush at **10 Hz**. |

You will rarely touch the server. If a future effect needs data the events don't carry
(e.g. a projectile's arc kind), **add a field to the existing event or emit a new event
type** — do not invent a second event system, and do not compute it on the client.

### Client render framework (repo: `Elementals`, dir `Client/`)
All under `src/render/`. **Pure logic files have no `pixi.js` import** (so they're unit-testable
without WebGL); only `stage.ts`, `nodes.ts`, `layers.ts` import Pixi.

| File | Role |
|---|---|
| `types.ts` | `Vec2`, `DisplayNode` (the abstraction systems drive), `EasingName`, `ThemeToken`, and the **data-driven config types**: `ProjectileConfig`, `ImpactConfig`, `ParticleBurstConfig`, `CameraShakeConfig`, `EffectDefinition`. |
| `framework.ts` | **`AnimationFramework`** — the façade. `playAbility(id,{from,to,sourceKingdom})`, `playStatus(id,at,kingdom)`, `update(dt)`, `registry`. Resolves an `EffectDefinition` and drives the systems. **No Pixi, no gameplay.** |
| `stage.ts` | **`PixiStage`** — owns the Pixi `Application`, `LayerManager`, ticker; mounts a transparent canvas; contain-fits the 1000×1000 world; applies camera offset; full `destroy()`. Injects Pixi node factories into the framework. |
| `registry.ts` | `EffectRegistry` — `Map<abilityId|statusId, EffectDefinition>`. `register/registerMany/resolve/has`. |
| `effects.ts` | **`ABILITY_EFFECTS`** — the actual per-ability definitions, keyed by ability id. **This is where you add abilities.** Currently: `fireball`. |
| `defaults.ts` | `DEFAULT_ABILITY_EFFECT` — generic themed fallback so *any* unregistered ability still animates. |
| `systems/projectiles.ts` | Straight-line A→B travel over `durationMs`; fires `onArrive` at B. Pooled. |
| `systems/impacts.ts` | Grow-and-fade burst at a point. Pooled. |
| `systems/particles.ts` | Coned bursts, gravity, lifetime fade, **`maxActive` cap** for perf. Pooled. |
| `camera.ts` | `Camera` — decaying screen shake → a world-space offset the stage applies. |
| `timeline.ts` | `Tween` + `AnimationTimeline` — generic tweened values. |
| `trajectory.ts` | `lerpPoint`, `angleBetween`, `distance` — pure geometry. |
| `pool.ts` | `ObjectPool<T>` — prewarm/maxIdle. Used by every system. |
| `easing.ts` | Named easing curves. |
| `colors.ts` | `themeColor(kingdomId, token)`, `hexToNumber` — bridges the elemental palette to Pixi numeric colors. |
| `nodes.ts` | Pixi node factories: `makeCircleNode`, `makeRingNode` (white unit sprites, tinted+scaled per effect). *Only place besides stage/layers that imports Pixi.* |
| `layers.ts` | `LayerManager` — ordered render layers (background/impacts/particles/projectiles/overlay) under one transformable root. |
| `nodeUtil.ts` | `UNIT_RADIUS` (base sprite radius) + `resetDisplayNode` (pooled reset). |
| `index.ts` | Public API barrel. |

### Client integration
| File | Role |
|---|---|
| `game/events.ts` | Typed event interfaces the renderer consumes (`AbilityCastEvent`, …) + `RawGameEvent` (wire shape). Add typed interfaces here as you visualize more event types. |
| `game/gameEvents.ts` | `socket.on('evt:batch')` → `onGameEvents(handler)` pub/sub. `applyEventBatch` is exported for tests. |
| `game/placement.ts` | **Single source of truth for coordinates.** `placeKingdoms(count)` → positions on a circle in a **1000×1000** space (center 500,500, radius 340). Kingdom `i` = `positions[i]`, ordered by the match roster. |
| `game/kingdomThemes.ts` | The shared elemental palette (`primary/secondary/dark` hex per kingdom). |
| `components/BattlefieldFx.tsx` | **The bridge.** Mounts `PixiStage` as an overlay inside `.battlefield__arena-box`, subscribes to `onGameEvents`, and `dispatch()`es each event → `framework.playAbility(...)`. Maps ids→coords with `placeKingdoms`. Guards against no-WebGL (jsdom). |
| `components/BattlefieldView.tsx` | The existing SVG battlefield (unchanged). Renders `<BattlefieldFx order={match.players…}/>` inside the arena box. |
| `components/BattlefieldView.css` | `.battlefield__arena-box{position:relative}` + `.battlefield__fx{position:absolute;inset:0;z-index:1;pointer-events:none}` (Pixi above the SVG, click-through preserved). |

### Design docs & memory
- Root design docs: `../../../ABILITY_SYSTEM.md`, `ARCHITECTURE.md`, `GAME_TICK.md`, `SOCKET_EVENTS.md` (multi-target §, event contract).
- Persistent memory (Claude): `~/.claude/projects/…/memory/kingdoms-epic9-visual-effects.md` and siblings — architecture decisions & status.

---

## 3. Key concepts you must understand

### 3.1 Coordinates
Everything the framework consumes is in the **1000×1000 arena space**. `placeKingdoms(n)`
returns the castle positions; `BattlefieldFx` builds `positionOf(id)` by the roster index.
`PixiStage` contain-fits that 1000×1000 world into the on-screen arena box the same way the
SVG does, so effects line up with the visible castles. **Always source positions from
`placement.ts`** — never hardcode.

### 3.2 `DisplayNode` — why the framework is testable without a GPU
Systems don't touch Pixi directly. They manipulate a minimal interface:
```ts
interface DisplayNode { x, y, alpha, rotation, visible, tint, scale{ x,y,set() }, destroy() }
```
Pixi `Graphics`/`Container`/`Sprite` satisfy it structurally (production). Tests pass plain
fake objects. So **all motion/pooling/timing logic is unit-tested in jsdom**, and only the
literal drawing is Pixi. When you write a new system, keep it operating on `DisplayNode` and
inject a node factory — do the same.

### 3.3 Effect definitions & the registry (data-driven)
An effect is data: a `projectile`, an `impact`, `particles`, a `shake` — any subset. Keyed by
**ability id or status id** (the ids the server events carry). `tintFrom: 'primary'|'secondary'|'dark'`
optionally recolors the whole effect from the caster's theme (shared palette). Unknown ids
fall back to `DEFAULT_ABILITY_EFFECT`. Appearance is driven purely by **tint + scale** on a
white unit sprite, so no per-kingdom art is needed yet.

### 3.4 The play pipeline
`playAbility(id, {from, to, sourceKingdom})`:
1. resolve `EffectDefinition` (registry → else default),
2. if it has a `projectile`: spawn one traveling `from→to` over `durationMs`; on arrival →
3. `burst`: spawn `impact` + emit `particles` + `camera.shake` at the landing point.
(No projectile ⇒ burst immediately at `to`. `playStatus` bursts at a point, no travel.)

### 3.5 Pooling & the "don't read a finished node" trap
Every system pools nodes. When an effect completes it's **released and reset** (position 0,
scale 1, hidden). So **do not assert/read a node's transform after it finishes** — it's been
recycled. (The unit tests learned this the hard way; check state mid-animation.)

### 3.6 The ticker
`PixiStage` drives `framework.update(ticker.deltaMS)` every frame and re-applies the camera
offset. Systems advance by delta time. Events arrive in ~10 Hz batches but each carries its
own `tick`; effects then animate smoothly on the render ticker.

---

## 4. How to add the next ability (the common task)

1. Open `render/effects.ts`. Add an entry to `ABILITY_EFFECTS` keyed by the **exact ability
   id** the server uses (see `Server/src/data/*Abilities.ts` / `abilitiesRegistry.ts`; e.g.
   `waterfall`, `zap`, `icicle`, `meteorShower`). Compose `projectile`/`impact`/`particles`/
   `shake`. Use explicit colors for a signature look, or `tintFrom` to inherit the theme.
2. That's usually it — `BattlefieldFx` already forwards every `abilityCast`, so the new
   definition is picked up automatically.
3. If the ability needs behavior beyond "projectile → burst" (e.g. an AoE with no single
   target, a channeled beam, a self-buff aura), you may:
   - add a new **event handler** in `BattlefieldFx.dispatch` (e.g. handle `statusApplied` →
     `framework.playStatus(statusId, at)`), and/or
   - add a new **reusable system** in `render/systems/` (keep it `DisplayNode`-based) and a
     matching config type in `types.ts`. Prefer extending the generic systems over
     one-off code.
4. Add/extend a test in `render/effects.test.ts` (definition shape + a framework
   integration with fake nodes). Run build + tests.

### To visualize a new event type
Add a typed interface in `game/events.ts`, then a `case` in `BattlefieldFx.dispatch` that
maps it to framework calls. Current dispatch only handles `abilityCast`. Good next handlers:
`damage` → hit flash on the target castle; `eliminated` → castle destruction; `statusApplied`/
`statusExpired` → auras.

---

## 5. Testing, building, running

**Two separate git repos.** `Client/` (front end, repo *Elementals*) and `Server/` (back end,
repo *Elementals-Server*). Build/test each in its own dir.

```bash
# Client (Vite + Vitest)
cd Client && npm run build          # tsc -b && vite build
cd Client && npx vitest run         # all tests
cd Client && npx vitest run src/render   # just the framework

# Server (tsc + node:test via tsx)
cd Server && npm run build
cd Server && npm test
cd Server && npx tsx --test test/gameEventsTransport.test.ts
```

**What tests can and can't cover.** jsdom has **no WebGL**, so nothing renders in tests. The
framework's *logic* is fully unit-tested via fake `DisplayNode`s; the *pixels* are not. There
is a real **visual-verification gap** — to confirm something looks right you must run the app
(server + client) in a browser and drive a match. Be honest about this in your reports: passing
tests ≠ "looks correct on screen."

To see it live: start the Server, start the Client (`npm run dev`), open two browsers, create/
join a lobby, pick kingdoms, ready up, then cast abilities. Fireball should streak + burst.

---

## 6. Gotchas & constraints (read these — they cost real time)

- **`erasableSyntaxOnly` is ON in the Client tsconfig.** TypeScript **constructor parameter
  properties are banned** (`constructor(private x: T)`). Declare fields explicitly and assign
  in the body. (The whole framework already does this.)
- **jsdom has no WebGL.** `BattlefieldFx` probes for a WebGL context and **skips mounting**
  when absent, so tests don't try to init Pixi. Keep that guard if you refactor the mount.
- **Pixi v8 API specifics** (not v7): `new Application()` then `await app.init({...})` (async);
  `app.canvas`; `app.ticker.deltaMS`; `Container.label`; Graphics is fluent —
  `g.circle(0,0,r).fill(0xffffff)` / `.stroke({width,color})`; `tint` + `scale.set()` on nodes.
- **Pixi is above the SVG** and `pointer-events:none`. If you need effects *behind* castles,
  change the z-index — but keep click-through so SVG targeting still works.
- **`projectileSpawned` has no server emitter.** Drive projectiles from `abilityCast`.
- **Multi-target** (Air's "Embrace of Winds"): `abilityCast.targetIds` can have several ids;
  `dispatch` already spawns one projectile per target.
- **Pixi now ships in the client bundle (~623 KB main).** A good perf-pass win is to
  lazy-load `BattlefieldFx` (dynamic import) so the initial load stays light.
- **Particle system uses pooled `Graphics` circles**, not a `ParticleContainer` yet. Swapping
  to `ParticleContainer` (for real texture particles at high counts) is a localized change in
  `nodes.ts` + the particle layer — deferred to the perf pass, since it needs real textures.
- **Don't read a node after its effect completes** (§3.5 — it's been reset/pooled).

---

## 7. Current status (as of this handoff)

**DONE**
- **#210 Core Animation Framework** — pool, timeline, easing, trajectory, camera, projectile/
  impact/particle systems, `PixiStage`, `EffectRegistry`, `AnimationFramework`. (`render/`)
- **Event transport** — server EventBus → `evt:batch` → client `gameEvents` (`GameLoopManager`,
  `broadcastGameEvents`, `game/gameEvents.ts`).
- **Stage mount** — `BattlefieldFx` overlay wired into `BattlefieldView`.
- **Ability #1: fireball** — `render/effects.ts`.
- Tests: Server 456 pass, Client 67 pass. Both build clean.

**NOT done / next**
- Abilities #2…N, one at a time (register in `effects.ts`).
- Event→VFX handlers beyond `abilityCast`: `damage` (hit flash), `eliminated` (destruction),
  `statusApplied/Expired` (auras).
- Camera/victory feedback polish; filters/shaders for glow.
- Perf pass: `ParticleContainer`, lazy-load Pixi, profile 8-player load.
- (Optional, larger) eventually Pixi may render more of the battlefield itself.

---

## 8. TL;DR for your first hour
1. Read §0 (the rule) and §1 (data flow).
2. Skim `render/framework.ts`, `render/types.ts`, `render/effects.ts`, `components/BattlefieldFx.tsx`.
3. Run `cd Client && npx vitest run src/render` to see the framework green.
4. Add your ability to `render/effects.ts`, test, build.
5. If pixels matter, run the app and eyeball it — tests don't cover rendering.
