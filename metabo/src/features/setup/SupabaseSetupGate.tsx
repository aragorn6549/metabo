// src/features/setup/SupabaseSetupGate.tsx
import { useState } from 'react';
import { getSupabaseConfig, saveSupabaseConfig } from '../../lib/supabase';

interface Props {
  onReady: () => void;
}

/**
 * Экран «Настройка подключения»: показывается, если VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY не заданы в окружении. Пользователь вводит
 * Project URL и anon public key из панели Supabase — они сохраняются
 * в localStorage браузера. Ключи публичные (anon), доступ к чужим данным
 * запрещён политиками RLS.
 */
export default function SupabaseSetupGate({ onReady }: Props) {
  const [url, setUrl] = useState(getSupabaseConfig().url);
  const [key, setKey] = useState(getSupabaseConfig().key);
  const [err, setErr] = useState('');

  const save = () => {
    const u = url.trim();
    const k = key.trim();
    if (!/^https:\/\/.+\.supabase\.co$/.test(u)) {
      setErr('URL должен выглядеть как https://xxxxxxxx.supabase.co');
      return;
    }
    if (k.length < 20) {
      setErr('Похоже, ключ неполный. Скопируйте anon public key целиком.');
      return;
    }
    saveSupabaseConfig(u, k);
    setErr('');
    onReady();
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">⚙️ Настройка подключения</h1>
        <p className="auth-sub">
          Приложение впервые открыто на этом устройстве. Укажите данные вашего проекта
          Supabase (их видно в панели Supabase → Connect → API).
        </p>
        <label className="field-label" htmlFor="sb-url">Project URL</label>
        <input
          id="sb-url"
          className="input"
          placeholder="https://yxpgjajehqmynixpaasb.supabase.co"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label className="field-label" htmlFor="sb-key">Anon public key</label>
        <input
          id="sb-key"
          className="input"
          placeholder="eyJhbGciOi..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        {err && <div className="toast toast-error">{err}</div>}
        <button className="btn btn-primary" onClick={save}>Сохранить и продолжить</button>
        <p className="auth-hint">
          Эти значения сохранятся только в этом браузере. Это публичный ключ — он не даёт
          доступ к чужим данным благодаря политике безопасности RLS.
        </p>
      </div>
    </div>
  );
}
