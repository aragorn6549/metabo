// Экран первичной настройки: если VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы
// в окружении — просим ввести их один раз. Сохраняем в localStorage.
import { useState } from 'react';
import {
  getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured,
  setSupabaseAnonKey, setSupabaseUrl,
} from '@/lib/supabase';

export function SupabaseSetupGate({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState(getSupabaseUrl());
  const [key, setKey] = useState(getSupabaseAnonKey());
  const [err, setErr] = useState('');

  // Настроен полностью (env или сохранённые значения) — пускаем дальше
  if (isSupabaseConfigured()) return <>{children}</>;

  const save = () => {
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
        placeholder="sb_publishable_... или eyJhbGciOi..."
        value={key}
        onChange={(e) => { setKey(e.target.value); setErr(''); }}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      {err && <div style={{ color: '#ff6b6b', marginTop: 8, fontSize: 13 }}>{err}</div>}
      <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={save}>
        Сохранить и продолжить
      </button>
      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
        Где взять: supabase.com → ваш проект → шестерёнка Project Settings → вкладка API →
        поля Project URL и anon/public key (кнопка Reveal). Эти данные публичные (их всё равно видно в коде сайта),
        доступ к данным защищает RLS на стороне базы.
      </p>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Не видите этот экран, но кнопки не работают? Значит браузер открыл старую версию сайта — обновите
        страницу с очисткой кэша: <b>Ctrl+Shift+R</b> (Windows) / <b>Cmd+Shift+R</b> (Mac).
      </p>
    </div>
  );
}
