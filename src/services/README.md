# services — (folder unused)

**There is no code here.** The planned domain service layer was never built; the
responsibility is split between:

- [`../sockets/`](../sockets/) — the shared socket singleton and its helpers,
  which is where intents are emitted from
- [`../game/`](../game/) — the state mirror and stores (`matchStore.ts`,
  `lobbyStore.ts`, `gameState.ts`) that subscribe to server events

Kept only so the path in older tickets resolves somewhere. The contract itself
is [SOCKET_EVENTS.md](../../../SOCKET_EVENTS.md).
