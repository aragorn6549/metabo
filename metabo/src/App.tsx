// §4.2 маршрутизация: /login, /onboarding, /* (защищённое приложение).
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/pages/Home';
import { ToastProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

/** Защита: без сессии → /login (§4.2) */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(s => s.session);
  const loading = useAuthStore(s => s.loading);
  const loc = useLocation();
  if (loading) return <div className="app-loading">Загрузка…</div>;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

/** Если нет ни одного inbody_logs — редирект на онбординг (§9 дефолт-редирект) */
function ProtectedLayout() {
  const session = useAuthStore(s => s.session);
  const navigate = useNavigate();

  // Синхронизируем стор при каждой смене URL (на случай рассинхронизации событий)
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) useAuthStore.setState({ session: data.session, user: data.session.user, loading: false });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      // DECISION (FIX): сначала дождаться реальной сессии — иначе head-запрос при RLS
      // с auth.uid() IS NULL вернёт count=0 даже у пользователя с данными,
      // и редирект на /onboarding будет «прыгать» при каждом маунте.
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { count } = await supabase.from('inbody_logs').select('*', { count: 'exact', head: true });
      if ((count ?? 0) === 0) navigate('/onboarding', { replace: true });
    })();
  }, [session, navigate]);

  return (
    <RequireAuth>
      <Home />
    </RequireAuth>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);
  useEffect(() => { void init(); }, [init]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<AuthScreen />} />
              <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
