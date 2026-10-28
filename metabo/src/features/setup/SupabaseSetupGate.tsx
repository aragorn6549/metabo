// Экран первичной настройки + самодиагностика подключения.
// Если VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы в env — просим ввести их один раз (localStorage).
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured,
  sb, setSupabaseAnonKey, setSupabaseUrl,
} from '@/lib/supabase';

export function SupabaseSetupGate({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState(getSupabaseUrl());
  const [key, setKey] = useState(getSupabaseAnonKey());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Настроен полностью (env или сохранённые значения) — пускаем дальше
  if (isSupabaseConfigured()) {
    return <ConfiguredGuard>{children}</ConfiguredGuard>;
  }

  const save = async () => {
    let u = url.trim();
    let k = key.trim();
    // Авточинимые частые ошибки ручного ввода:
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;   // вставили URL без протокола
    u = u.replace(/\/+$/, '');
    if (k.startsWith('"') || k.startsWith("'")) k = k.slice(1); // случайно скопировали кавычку
    if (k.endsWith('"') || k.endsWith("'")) k = k.slice(0, -1);
    if (!/^[a-z0-9.-]+\.supabase\.co/i.test(u.replace(/^https?:\/\//i, ''))) {
      setErr('Введите адрес проекта вида https://xxxxxxxx.supabase.co — он виден в Supabase: Project Settings → API → Project URL');
      return;
    }
    if (k.length < 20) {
      setErr('Введите anon public key целиком (Project Settings → API → Project API keys → anon public → Reveal и скопируйте всю длинную строку)');
      return;
    }
    setBusy(true);
    setErr('');
    // Реальная проверка ключа: создаём временный клиент и запрашиваем /auth/v1/settings.
    // Если сервер отвечает «Invalid API key / JWT» — не сохраняем, просим другой ключ.
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const test = createClient(u, k, { auth: { persistSession: false } });
      const res = await fetch(`${u}/auth/v1/health`, { headers: { apikey: k } }).catch(() => null);
      void test; // клиент создан только для совместимости типов
      if (res && res.status === 401) {
        setErr('Supabase отклонил этот ключ (401). Скопируйте «anon public» целиком из Project Settings → API Keys (длинная строка, начинается с eyJ…).');
        setBusy(false);
        return;
      }
    } catch (e) {
      setErr(`Не удалось связаться с сервером: ${(e as Error).message}. Проверьте адрес проекта.`);
      setBusy(false);
      return;
    }
    setSupabaseUrl(u);
    setSupabaseAnonKey(k);
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 460, margin: '80px auto', padding: 24 }}>
      <h2 style={{ marginBottom: 12 }}>Настройка подключения</h2>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Приложение впервые открыто на этом устройстве. Укажите адрес вашего Supabase-проекта
        и его публичный ключ (anon key) — это нужно сделать только один раз.
      </p>
      <label style={{ fontSize: 12, opacity: 0.7 }}>Project URL</label>
      <input
        className="inp"
        style={{ width: '100%', padding: '10px 12px', fontSize: 15, marginTop: 4 }}
        placeholder="https://xxxxxxxx.supabase.co"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setErr(''); }}
        autoFocus
      />
      <label style={{ fontSize: 12, opacity: 0.7, display: 'block', marginTop: 14 }}>Anon public key</label>
      <input
        className="inp"
        style={{ width: '100%', padding: '10px 12px', fontSize: 13, marginTop: 4 }}
        placeholder="eyJhbGciOi... (длинный JWT)"
        value={key}
        onChange={(e) => { setKey(e.target.value); setErr(''); }}
        onKeyDown={(e) => e.key === 'Enter' && void save()}
      />
      {err && <div style={{ color: '#ff6b6b', marginTop: 8, fontSize: 13 }}>{err}</div>}
      <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={() => void save()} disabled={busy}>
        {busy ? 'Проверка…' : 'Сохранить и продолжить'}
      </button>
      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
        Где взять: supabase.com → ваш проект → шестерёнка Project Settings → вкладка API →
        поля Project URL и Project API keys → anon public (кнопка Reveal). Эти данные публичные,
        доступ к данным защищает RLS на стороне базы.
      </p>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Не видите этот экран, но кнопки не работают? Значит браузер открыл старую версию сайта — обновите
        страницу с очисткой кэша: <b>Ctrl+Shift+R</b> (Windows) / <b>Cmd+Shift+R</b> (Mac).
      </p>
    </div>
  );
}

/** После настройки — быстрая проверка, что ключ валиден; при ошибке показываем понятное сообщение. */
function ConfiguredGuard({ children }: { children: ReactNode }) {
  const [diag, setDiag] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void checkConnection().then((msg) => { if (alive && msg) setDiag(msg); });
    return () => { alive = false; };
  }, []);
  if (diag) {
    return (
      <div style={{ maxWidth: 460, margin: '80px auto', padding: 24 }}>
        <h2 style={{ marginBottom: 12 }}>⚠ Проблема с подключением</h2>
        <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.5 }}>
          {diag}
        </div>
        <button className="btn secondary" style={{ marginTop: 16 }} onClick={() => { localStorage.removeItem('metabo.supabase.url'); localStorage.removeItem('metabo.supabase.anonkey'); window.location.reload(); }}>
          Изменить настройки
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

async function checkConnection(): Promise<string | null> {
  try {
    const { error } = await sb().auth.getSession();
    if (error) {
      const m = error.message || '';
      if (/invalid json|jwt|api key/i.test(m)) {
        return `Supabase отклонил ключ: «${m}». Скорее всего скопирован неверный ключ. Нужен «anon public» из Project Settings → API Keys (длинная строка, начинается с eyJ…).`;
      }
      return `Ошибка Supabase: ${m}`;
    }
    return null;
  } catch (e) {
    return `Сеть недоступна: ${(e as Error).message}. Проверьте адрес проекта.`;
  }
}
