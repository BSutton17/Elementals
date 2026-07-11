# services — Client Service Layer

Domain-oriented wrappers around the transport that express **intents** and
subscribe to server events (e.g. `lobbyService`, `matchService`). They call the
shared socket from `sockets/` and expose clean methods to pages/components.

- Services turn UI actions into `match:*` / `lobby:*` intents (see
  [SOCKET_EVENTS.md](../../../SOCKET_EVENTS.md)).
- They never resolve gameplay — the server is authoritative.
