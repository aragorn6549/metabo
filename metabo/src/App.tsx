// src/App.tsx
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';
import SupabaseSetupGate from './features/setup/SupabaseSetupGate';
import AuthScreen from './features/auth/AuthScreen';
import Onboarding from './features/onboarding/Onboarding';
import Home from './pages/Home';
import { useAuthStore } from './store/authStore';

export default function App() {
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  // Подписываемся на изменения авторизации, когда Supabase настроен
  useEffect(() => {
    if (!configured) return;
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((_event, sess) => {
      useAuthStore.getState().setSession(sess);
      if (!sess) qc.clear();
    });
    void sb.auth.getSession().then(({ data: d }) => {
      useAuthStore.getState().setSession(d.session);
    });
    return () => { data.subscription.unsubscribe(); };
  }, [configured, qc]);

  if (!configured) {
    return <SupabaseSetupGate onReady={() => setConfigured(true)} />;
  }

  if (loading) return <div className="screen-loading">Загрузка…</div>;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthScreen />} />
      <Route
        path="/onboarding"
        element={
          !session ? <Navigate to="/login" replace />
            : profile?.onboarded ? <Navigate to="/" replace />
              : <Onboarding />
        }
      />
      <Route
        path="/"
        element={
          !session ? <Navigate to="/login" replace />
            : !profile?.onboarded ? <Navigate to="/onboarding" replace />
              : <Home />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
