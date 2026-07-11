import { io, type Socket } from "socket.io-client";

/**
 * Reusable Socket.IO client manager for the Kingdoms client.
 *
 * A single shared connection is used across the entire app. It does NOT
 * auto-connect: call `connectSocket()` when the app is ready to go online and
 * `disconnectSocket()` on teardown. Feature domains (lobby, match) build their
 * event handlers on top of this shared instance — see SOCKET_EVENTS.md for the
 * networking contract. The client only sends intents and renders authoritative
 * state received from the server (see ARCHITECTURE.md).
 */

/** Server URL, overridable per environment via `VITE_SERVER_URL`. */
const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL ?? "https://elementals-c1937bd8ae33.herokuapp.com";
/**
 * The single shared socket instance. Socket.IO manages reconnection
 * automatically; after a reconnect the app re-requests authoritative state
 * (`conn:resync` / `state:full`) rather than replaying missed events.
 */
export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
});

/** Opens the shared connection if it isn't already open. */
export function connectSocket(): Socket {
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/** Closes the shared connection if it is currently open. */
export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

/** True while the shared socket has a live connection to the server. */
export function isConnected(): boolean {
  return socket.connected;
}
