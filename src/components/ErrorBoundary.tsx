import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI. Defaults to the branded crash panel. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level error boundary. Catches render-phase errors anywhere below it and
 * shows a recoverable fallback instead of a blank screen. Logging is kept
 * dependency-free on purpose — this component sits at the very root of the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught UI error:", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="organic-card rounded-[2rem] max-w-md w-full p-8 text-center">
          <h1 className="text-3xl font-heading font-semibold text-foreground mb-3">
            Something went sideways
          </h1>
          <p className="text-muted-foreground mb-6">
            An unexpected error interrupted this page. Reload to try again.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 h-11 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
