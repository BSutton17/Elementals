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
    /**
     * ⚠️ `src/__*.test.tsx` ARE RENDER HARNESSES, NOT TESTS. They draw skins
     * and screens to files for visual review: no assertions, an absolute
     * scratch path, and dozens of server-side castle renders each. `npm test`
     * excludes them — see the script — because left in the run they added
     * CPU-bound work to a suite already tuned around jsdom contention, and were
     * part of why unrelated tests intermittently blew their 5s timeout.
     *
     * The exclusion lives in the script rather than here on purpose: an
     * `exclude` in this config also blocks naming the file directly, which
     * leaves no way to run one at all. To run one:
     *   npx vitest run src/__preview.test.tsx
     */
  },
})
