import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom UI to show when a render error is caught. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render/lifecycle errors in the React tree and shows a fallback UI
 * instead of unmounting the whole app (a blank screen). This complements the
 * global window error handlers, which cover errors outside React rendering.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[Kingdoms] Render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <p>Something went wrong. Please refresh.</p>;
    }
    return this.props.children;
  }
}
