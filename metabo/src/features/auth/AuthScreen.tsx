import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore(s => s.setSession);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured()) { setErr('Supabase не настроен: добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в переменные окружения Vercel.'); return; }
    setErr(''); setBusy(true);
    try {
      const { data, error } = mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        navigate('/', { replace: true });
      } else {
        setErr('Проверьте почту и подтвердите регистрацию (или включите Confirm email=off в Supabase).');
      }
    } catch (e) {
      const msg = String((e as Error)?.message || JSON.stringify(e));
      setErr(msg.includes('disabled') ? 'Провайдер Email выключен в Supabase → Authentication → Providers → Email → Enable.' :
             msg.includes('low') ? 'Пароль слишком простой (минимум 6 символов).' :
             msg);
    } finally { setBusy(false); }
  };

  const demo = async () => {
    if (!isConfigured()) { setErr('Supabase не настроен.'); return; }
    setErr(''); setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        navigate('/onboarding?demo=1', { replace: true });
      } else {
        setErr('Анонимный вход вернул пустую сессию.');
      }
    } catch (e) {
      const msg = String((e as Error)?.message || JSON.stringify(e));
      setErr(
        msg.includes('not_enabled') || msg.includes('anonymous') 
          ? 'Anonymous sign-ins выключен: Supabase → Authentication → Providers → Anonymous sign-ins → Enable → Save.' 
          : `Демо недоступно: ${msg}`
      );
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Metabo</h1>
        <p className="auth-sub">Карта метаболизма</p>
        <form onSubmit={submit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль (мин. 6 символов)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          {err && <div className="auth-error">⚠ {err}</div>}
          <button type="submit" disabled={busy}>{busy ? '…' : mode === 'signup' ? 'Зарегистрироваться' : 'Войти'}</button>
        </form>
        <button className="btn ghost" onClick={() => setMode(m => m === 'signup' ? 'signin' : 'signup')} style={{ marginTop: 8 }}>
          {mode === 'signup' ? 'У меня есть аккаунт' : 'Создать аккаунт'}
        </button>
        <button className="btn demo" onClick={demo} disabled={busy} style={{ marginTop: 8 }}>Попробовать демо</button>
      </div>
    </div>
  );
}
