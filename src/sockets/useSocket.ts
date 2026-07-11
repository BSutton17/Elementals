import { useEffect, useState } from "react";
import { socket } from "./socket";

/**
 * React hook exposing the shared socket's live connection status.
 *
 * It subscribes to connect/disconnect events but does NOT open or close the
 * connection itself — connection lifecycle is owned by the app (see
 * `connectSocket` / `disconnectSocket` in socket.ts). Components use this to
 * reflect connectivity in the UI.
 */
export function useSocket(): { socket: typeof socket; connected: boolean } {
  const [connected, setConnected] = useState<boolean>(socket.connected);

  useEffect(() => {
    const onConnect = (): void => setConnected(true);
    const onDisconnect = (): void => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Sync in case status changed between render and effect setup.
    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket, connected };
}
