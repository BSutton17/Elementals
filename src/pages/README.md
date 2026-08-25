# pages — Screens

Top-level screens the app routes between: `StartupScreen`, `JoinScreen`,
`SearchingScreen` (public matchmaking), `LobbyScreen`, `BattlefieldScreen`,
`GameOverScreen`, and `HowToPlay`.

Each page composes `../components/`, subscribes to game state via `../game/`,
and reads connectivity from the socket hooks.

Routing is driven by match phase, not by a router: `App.tsx` shows the lobby
until `match.phase` turns `active`, then the battlefield, then game over.

Pages orchestrate; they delegate reusable UI to `../components/` and visual
effects to `../render/`.
