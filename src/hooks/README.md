# hooks — Reusable React Hooks

Shared custom hooks for cross-cutting client concerns (e.g. reading game state,
timers/interpolation, input). Keep them pure and reusable.

Note: the socket connection-status hook lives with the socket manager in
`sockets/` for cohesion; general-purpose hooks belong here.
