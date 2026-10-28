// §17 ErrorBoundary: вместо белого экрана — понятное сообщение + кнопка перезагрузки.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui' }}>
          <h2 style={{ color: '#e5484d' }}>Что-то пошло не так</h2>
          <p style={{ opacity: .7 }}>{String(this.state.error.message ?? this.state.error)}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 18px', borderRadius: 8, border: 0, cursor: 'pointer', background: '#3b82f6', color: '#fff' }}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
