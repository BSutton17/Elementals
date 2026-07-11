# pages — Screens

Top-level screens the app routes between (e.g. Lobby, Match, Results). Each page
composes `components/`, subscribes to game state (`game/`), and reads
connectivity via hooks.

Pages orchestrate; they delegate rendering of the gameplay canvas to `pixi/` and
reusable UI to `components/`.
