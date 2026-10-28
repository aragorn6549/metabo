// AuthScreen — UI 1:1 с прототипом; localStorage-авторизация заменена на Supabase Auth (§8.1).
// Демо-режим (§10) временно отключён: возвращение кнопки запланировано после стабилизации Auth.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';

import { useAuthStore } from '@/store/authStore';

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const { signIn, signUp } = useAuthStore();

  const doAuth = async () => {
    setError(''); setNotice('');
    // Ключ и URL могут быть только в env Vercel (в localStorage их нет) —
    // проверяем полную конфигурацию, а не отдельно URL.
    if (!isSupabaseConfigured()) {
      setError('Supabase не настроен на этом устройстве. Перезагрузите страницу (Ctrl+Shift+R) и введите URL проекта и anon-ключ на экране настройки.');
      return;
    }
    const e = email.trim();
    if (!e || !password) { setError('Заполните оба поля'); return; }
    if (!e.includes('@')) { setError('Введите корректный email'); return; }
    if (mode === 'register' && password.length < 6) { setError('Пароль минимум 6 символов (требование Supabase)'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await signUp(e, password);
        if (res.error) setError(res.error);
        else if (res.needsConfirm) setNotice('Проверьте почту для подтверждения аккаунта.');
        else navigate('/'); // сессия уже в сторе (signUp записал её напрямую)
      } else {
        const res = await signIn(e, password);
        if (res.error) {
          let msg = res.error;
          const low = msg.toLowerCase();
          if (low.includes('invalid login credentials')) {
            msg = 'Неверный email или пароль. Если аккаунт создавался раньше — нажмите «Регистрация» и создайте новый.';
          } else if (low.includes('email not confirmed')) {
            msg = 'Email не подтверждён. В Supabase: Authentication → Providers → Email → выключите "Confirm email", затем зарегистрируйтесь заново.';
          } else if (low.includes('failed to fetch') || low.includes('networkerror')) {
            msg = 'Нет связи с Supabase. Проверьте Project URL (должен быть вида https://xxxx.supabase.co).';
          }
          setError(msg);
        } else {
          // DECISION (FIX «вход выполнен → перенаправляет → и ничего не происходит»):
          // сами выполняем переход на / после успешного входа, не полагаясь на то,
          // что RequireAuth «перерисует» этот экран сам (он этого не делает —
          // компонент /login не следит за session).
          setNotice('✓ Вход выполнен, перенаправляем…');
          navigate('/', { replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-logo">Meta<span>bo</span></div>
        <div className="auth-tag">Метаболизм в реальном времени</div>
        <div className="auth-switch">
          <button type="button" className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Вход</button>
          <button type="button" className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(''); setNotice(''); }}>Регистрация</button>
        </div>
        <form onSubmit={(ev) => { ev.preventDefault(); void doAuth(); }}>
          {error && <div className="auth-error">⚠ {error}</div>}
          {notice && <div className="auth-note" style={{ color: 'var(--muscle-2)' }}>{notice}</div>}
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
            <div className="field"><label>Email</label>
              <input type="text" inputMode="email" value={email} onChange={ev => setEmail(ev.target.value)}
                placeholder="you@example.com" autoComplete="email" /></div>
            <div className="field"><label>Пароль</label>
              <input type="password" value={password} onChange={ev => setPassword(ev.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          </div>
          <button type="submit" className="btn" disabled={busy}>
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        <div className="auth-note">Данные хранятся в Supabase и защищены вашим аккаунтом.</div>
      </div>
    </div>
  );
}
