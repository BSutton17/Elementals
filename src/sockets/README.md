# sockets — Socket.IO Transport

The shared Socket.IO client manager and connection lifecycle.

- `socket.ts` — the single shared socket instance + connect/disconnect helpers
- `useSocket.ts` — React hook exposing live connection status

Higher-level, domain-specific messaging (lobby/match intents) belongs in
`services/`, which build on this transport. Server URL comes from
`VITE_SERVER_URL` (see `.env.example`).
