# sockets — Socket.IO Transport

The shared Socket.IO client manager and connection lifecycle.

- `socket.ts` — the single shared socket instance + connect/disconnect helpers
- `useSocket.ts` — React hook exposing live connection status

Server URL: `VITE_SERVER_URL` if set, otherwise `http://localhost:3001` in dev
and the production host in a build.

The planned `services/` layer was never built — domain messaging is emitted from
here and consumed by the stores in `../game/`. The wire contract is
[SOCKET_EVENTS.md](../../../SOCKET_EVENTS.md); this layer never resolves
gameplay, because the server is authoritative.
