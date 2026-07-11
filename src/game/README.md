# game — Client Game Systems

Client-side game state and logic that is **not** rendering and **not** authority.
Owns:

- The read-only mirror of authoritative server state (`state:full` / `state:delta`)
- Interpolation/prediction between syncs (e.g. cooldown countdowns)
- Mapping gameplay events to what `pixi/` should render

This is the bridge between `sockets/`/`services/` (data in) and `pixi/`/`pages/`
(presentation out). It never computes gameplay results — the server is
authoritative (see [ARCHITECTURE.md](../../../ARCHITECTURE.md)).
