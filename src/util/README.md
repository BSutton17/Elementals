# util — Utilities

Cross-cutting, framework-light client helpers with no gameplay or rendering
knowledge. Owns:

- `errorHandler.ts` — global browser error/rejection handlers (safety net)
- Future generic helpers (formatting, ids, timing)

The React render-error boundary is a UI component and lives in
`components/ErrorBoundary.tsx`.
