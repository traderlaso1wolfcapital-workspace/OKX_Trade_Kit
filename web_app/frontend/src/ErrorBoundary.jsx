import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "#ff4444", backgroundColor: "#111", minHeight: "100vh", fontFamily: "monospace" }}>
          <h2>💥 React App Crashed!</h2>
          <p>The application encountered an unexpected error.</p>
          <details style={{ whiteSpace: "pre-wrap", marginTop: "10px", padding: "10px", background: "#000", border: "1px solid #333" }}>
            <summary style={{ cursor: "pointer", color: "#fff" }}>Click here to view Error Details</summary>
            <br />
            <strong>Error Message:</strong>
            <br />
            {this.state.error && this.state.error.toString()}
            <br /><br />
            <strong>Stack Trace:</strong>
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
