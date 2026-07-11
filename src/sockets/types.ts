/** The uniform acknowledgement envelope returned by server event handlers. */
export interface Ack<T = unknown> {
  ok: boolean
  data?: T
  error?: { code: string; message: string }
}
