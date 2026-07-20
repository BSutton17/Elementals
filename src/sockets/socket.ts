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

/** Production server URL (used when the app is built for deployment). */
const PROD_SERVER_URL = "https://elementals-c1937bd8ae33.herokuapp.com";
/** Local dev server URL (the Node/Socket.IO server's default port). */
const DEV_SERVER_URL = "http://localhost:3001";

/**
 * Server URL. An explicit `VITE_SERVER_URL` always wins; otherwise we default
 * to localhost during local dev (`vite dev`) and the production host in a
 * built/deployed bundle (`import.meta.env.DEV` is baked in at build time).
 */
const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? DEV_SERVER_URL : PROD_SERVER_URL);
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
