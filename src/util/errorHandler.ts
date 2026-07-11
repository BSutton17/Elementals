/**
 * Registers global browser error handlers so unexpected runtime errors and
 * unhandled promise rejections are captured and logged instead of failing
 * silently. React render errors are handled separately by `ErrorBoundary`.
 *
 * These are a safety net: they keep the app from silently breaking and provide
 * a single place to later forward client errors to the server for diagnostics.
 */
export function registerGlobalErrorHandlers(): void {
  window.addEventListener("error", (event: ErrorEvent) => {
    console.error("[Kingdoms] Uncaught error:", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    console.error("[Kingdoms] Unhandled promise rejection:", event.reason);
  });
}
