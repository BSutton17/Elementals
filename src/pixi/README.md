# pixi — PixiJS Rendering

The gameplay canvas rendered with PixiJS (animated with GSAP). Owns:

- Pixi app/stage bootstrap
- Visual entities (kingdoms, projectiles, effects)
- Event→visual translators: turning server `evt:*` gameplay events into
  projectiles, impacts, particles, trails (see [ARCHITECTURE.md](../../../ARCHITECTURE.md))

Rendering only — it reads game state/events and never decides gameplay outcomes.
