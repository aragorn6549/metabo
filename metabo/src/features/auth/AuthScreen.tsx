// AuthScreen — UI 1:1 с прототипом; localStorage-авторизация заменена на Supabase Auth (§8.1).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/db';
import { useAuthStore } from '@/store/authStore';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const { signIn, signUp } = useAuthStore();

  const doAuth = async () => {
    setError(''); setNotice('');
    const e = email.trim();
    if (!e || !password) { setError('Заполните оба поля'); return; }
    if (!e.includes('@')) { setError('Введите корректный email'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов (требование Supabase)'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await signUp(e, password);
        if (res.error) setError(res.error);
        else if (res.needsConfirm) setNotice('Проверьте почту для подтверждения аккаунта.');
        // при отключённом подтверждении email сессия появится через onAuthStateChange → редирект
      } else {
        const res = await signIn(e, password);
        if (res.error) setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async () => {
    setBusy(true);
    try {
      // DECISION (§10): демо = анонимный вход + is_demo=true в profiles.
      const { data, error: err } = await (await import('@/lib/supabase')).supabase.auth.signInAnonymously();
      if (err) { setError('Демо недоступно: ' + err.message); return; }
      if (data.user) {
        await supabase.from('profiles').update({ is_demo: true } as Partial<Profile>).eq('id', data.user.id);
      }
      navigate('/onboarding?demo=1');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-logo">Meta<span>bo</span></div>
        <div className="auth-tag">Метаболизм в реальном времени</div>
        <button type="button" className="btn goal" onClick={handleDemo} disabled={busy}
          style={{ padding: '16px', fontSize: 15, marginBottom: 4 }}>
          ⚡ Попробовать демо-режим
        </button>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginBottom: 20 }}>
          Без регистрации · сразу с примерами данных
        </div>
        <div className="auth-divider">
          <div className="line" /><span className="text">или через аккаунт</span><div className="line" />
        </div>
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
