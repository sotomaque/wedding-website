"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="w-full h-full flex items-center justify-center bg-muted p-8">
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold text-foreground">
                Oops! Something went wrong
              </p>
              <p className="text-sm text-muted-foreground">
                We're having trouble loading this content. Please try refreshing
                the page.
              </p>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
