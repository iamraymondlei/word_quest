import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class FormBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught form error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: '15px', color: '#ff4d4f', border: '1px dashed #ff4d4f', borderRadius: '8px', margin: '10px 0', backgroundColor: '#fff2f0' }}>
            <h3>⚠️ Input Error Encountered</h3>
            <p>Please check your input and try again.</p>
            <button onClick={() => this.setState({ hasError: false })} style={{ padding: '6px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
