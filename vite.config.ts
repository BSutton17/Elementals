/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    /**
     * ⚠️ CAPPED BELOW THE CORE COUNT ON PURPOSE. Vitest defaults to one worker
     * per core, and each carries a full jsdom environment — the heaviest part
     * of this suite by far. Saturating all twelve made tests exceed their 5s
     * timeout in a different combination on every run, which reads as a
     * regression and is not one: every "failing" test passed when run alone.
     *
     * Six is comfortably faster than serial and leaves the machine able to
     * actually schedule them. Matches `--test-concurrency` on the server.
     */
    maxWorkers: 6,
  },
})
