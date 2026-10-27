// Роутинг и guard-логика (§4.2, §9 readme1.md):
// /login — AuthScreen; /onboarding — онбординг; / — Home (требует baseline).
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useBaseline } from '@/hooks/useInBodyLogs';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/pages/Home';
import { Skeleton } from '@/components/ui';

function FullLoader() {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Skeleton h={40} w={200} /><Skeleton h={200} /><Skeleton h={80} />
    </div>
  );
}

/** Пустой профиль (age/height = null) ⇒ онбординг не пройден (§9: «нет inbody_logs/profile → /onboarding») */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedHome() {
  const { user } = useAuthStore();
  const { baseline, isLoading } = useBaseline();
  const onboarded = !!user?.user_metadata?.onboarded || !!baseline;
  if (isLoading) return <FullLoader />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return <Home />;
}

function OnboardingRoute() {
  const { user, loading } = useAuthStore();
  const { baseline, isLoading } = useBaseline();
  if (loading || isLoading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  // если уже онборднут и зашёл вручную — на главную (кроме явного запроса ?edit=1)
  if ((baseline || user.user_metadata?.onboarded) && new URLSearchParams(window.location.search).get('edit') !== '1') {
    return <Navigate to="/" replace />;
  }
  return <Onboarding />;
}

export function App() {
  const location = useLocation();
  void location;
  return (
    <Routes>
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/" element={<RequireAuth><ProtectedHome /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
