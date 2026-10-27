// Глобальные UI-примитивы: тосты (§8.7), ErrorBoundary, Skeleton — из ТЗ.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Component, type ErrorInfo } from 'react';

// ---------- Toasts ----------
// DECISION: классы .toast/.success/.danger/.goal перенесены 1:1 из прототипа (global.css)
interface ToastItem { id: number; text: string; kind: 'success' | 'danger' | 'goal' }
type ToastFn = (text: string, kind?: 'success' | 'danger' | 'goal') => void;

const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback<ToastFn>((text, kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500); // как в прототипе
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
      ))}
    </ToastCtx.Provider>
  );
}

// ---------- ErrorBoundary ----------
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="screen center">
          <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 8 }}>Что-то пошло не так 😵</h2>
            <p className="muted" style={{ marginBottom: 16 }}>{String(this.state.error.message)}</p>
            <button className="btn primary" onClick={() => this.setState({ error: null })}>Попробовать снова</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Skeleton ----------
export function Skeleton({ h = 14, w = '100%', style }: { h?: number; w?: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />;
}
