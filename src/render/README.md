# render — Visual Effects

The battlefield's animation layer: canvas particle systems, easing, camera,
pooling, timelines, and the per-ability effect specs.

📖 **Start with [HANDOFF.md](HANDOFF.md)** — it is the real documentation for
this folder, and it opens with the one rule that governs everything here:
*rendering is 100% downstream of gameplay.* The server has already decided what
happened; this layer only shows it. An effect that changes what the player
believes about game state is a bug, however good it looks.

Effects are registered by ability/status id in `registry.ts`, so adding one
means adding a spec — not touching the battlefield component.
