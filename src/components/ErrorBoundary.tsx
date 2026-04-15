import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-6 text-center bg-surface">
          <span className="material-symbols-outlined text-6xl text-tertiary mb-4">
            error
          </span>
          <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Something went wrong
          </h1>
          <p className="text-sm font-body text-on-surface-variant mb-6">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-label font-bold tracking-widest uppercase text-secondary hover:text-secondary/80 flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
