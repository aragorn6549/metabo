// §4.2 маршрутизация: /login, /onboarding, /* (защищённое приложение).
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SupabaseSetupGate } from '@/features/setup/SupabaseSetupGate';
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

/**
 * Если нет ни одного inbody_logs — редирект на онбординг (§9 дефолт-редирект).
 * FIX v2 («вход выполнен → перенаправляет → и больше ничего не происходит, консоль пуста»):
 * в ваших логах Supabase видно POST /auth/v1/token?grant_type=password → 200,
 * но ПОСЛЕ этого нет НИ ОДНОГО запроса к /rest/v1/... Это значит, что приложение
 * после входа не успевало выполнить ни одного DB-запроса: проверка онбординга
 * запускалась «вслепую» до того, как токен новой сессии попадал в клиент, и
 * любая ошибка (RLS → 401, отсутствие таблиц → PGRST205) глушилась пустым
 * catch-блоком. Теперь:
 *  1) сессия берётся НАПРЯМУЮ из supabase.auth.getSession() (не из zustand-стора);
 *  2) запрос к БД идёт строго ПОСЛЕ подтверждения сессии;
 *  3) каждая ошибка видна текстом на экране + дублируется в console.warn —
 *     «тихих» состояний больше нет.
 */
function ProtectedLayout() {
  const storeSession = useAuthStore(s => s.session);
  const storeLoading = useAuthStore(s => s.loading);
  const [checked, setChecked] = useState(false);
  const [needOnboarding, setNeedOnboarding] = useState(false);
  const [checkError, setCheckError] = useState('');

  // Принудительная сверка стора с реальным хранилищем сессий Supabase
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) useAuthStore.setState({ session: data.session, user: data.session.user, loading: false });
      else if (useAuthStore.getState().session !== data.session) useAuthStore.setState({ session: null, user: null, loading: false });
    }).catch(() => { /* сеть недоступна — RequireAuth сам разберётся со старым состоянием */ });
    return () => { alive = false; };
  }, []);

  // Проверка «пройден ли онбординг» — один раз за маунт, после подтверждения сессии
  useEffect(() => {
    if (storeLoading || !storeSession) { setChecked(false); return; }
    let alive = true;
    setChecked(false);
    setCheckError('');
    void (async () => {
      try {
        // Ждём РЕАЛЬНУЮ сессию из хранилища supabase-js (гарантия, что access_token
        // уже обновлён и уйдёт в заголовке Authorization к PostgREST).
        const { data: sess, error: sessErr } = await supabase.auth.getSession();
        if (!alive) return;
        if (sessErr || !sess.session) {
          setCheckError(`Сессия не подтверждена: ${sessErr?.message ?? 'сессии нет'}. Выйдите и войдите заново.`);
          return;
        }
        // Двойная страховка: если стор «видит» сессию, а хранилище — старую/пустую.
        if (sess.session.user.id !== storeSession.user?.id) {
          useAuthStore.setState({ session: sess.session, user: sess.session.user, loading: false });
        }
        const { count, error } = await supabase
          .from('inbody_logs')
          .select('*', { count: 'exact', head: true });
        if (!alive) return;
        if (error) {
          // НЕ редиректим на онбординг при ошибке — иначе пользователь попадает
          // в бесконечный цикл (сохранить данные тоже не получится). Показываем текст.
          console.warn('[metabo] inbody_logs count failed:', error.code, error.message);
          const hint = /does not exist|Could not find|PGRST205|PGRST116/i.test(error.message)
            ? 'похоже, таблицы ещё не созданы — выполните SQL из supabase/migrations/0002_idempotent_fix.sql в Supabase (SQL Editor)'
            : /row level security|permission denied|401|JWT/i.test(error.message + String(error.code))
              ? 'RLS отклоняет запрос — проверьте политики из миграции 0002'
              : error.message;
          setCheckError(`Не удалось проверить данные (${error.code ?? 'без кода'}): ${hint}`);
        } else {
          setNeedOnboarding((count ?? 0) === 0);
        }
      } catch (e) {
        console.warn('[metabo] onboarding check crashed:', e);
        if (alive) setCheckError(`Сбой проверки подключения: ${String((e as Error)?.message ?? e)}`);
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => { alive = false; };
  }, [storeSession, storeLoading]);

  return (
    <RequireAuth>
      {!checked && !checkError ? (
        <div className="app-loading">Проверка данных…</div>
      ) : checkError ? (
        // Ошибку показываем НАД Home — экран не остаётся пустым никогда.
        <>
          <div className="app-loading" style={{ minHeight: 'auto', padding: '24px 16px 0' }}>
            <div style={{ maxWidth: 560, padding: '14px 18px', borderRadius: 12, background: 'rgba(229,72,77,.12)', border: '1px solid rgba(229,72,77,.4)', color: '#fda4af', fontSize: 13, lineHeight: 1.5 }}>
              ⚠ {checkError}
            </div>
          </div>
          <Home />
        </>
      ) : needOnboarding ? (
        <Onboarding onDone={() => { setNeedOnboarding(false); setChecked(false); }} />
      ) : (
        <Home />
      )}
    </RequireAuth>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);
  useEffect(() => { void init(); }, [init]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        {/* FIX: gate настройки Supabase нигде не подключался — на не настроенном
            устройстве запросы уходили в placeholder-клиент и молча падали. */}
        <SupabaseSetupGate>
          <BrowserRouter>
            <ToastProvider>
              <Routes>
                <Route path="/login" element={<AuthScreen />} />
                <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </ToastProvider>
          </BrowserRouter>
        </SupabaseSetupGate>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
