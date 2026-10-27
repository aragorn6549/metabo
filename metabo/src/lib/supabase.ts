// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const LS_URL = 'metabo.supabase.url';
const LS_KEY = 'metabo.supabase.anonKey';

function envUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
}
function envKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
}

export function getSupabaseConfig(): { url: string; key: string } {
  let url = envUrl();
  let key = envKey();
  try {
    if (!url) url = localStorage.getItem(LS_URL)?.trim() ?? '';
    if (!key) key = localStorage.getItem(LS_KEY)?.trim() ?? '';
  } catch { /* no localStorage */ }
  return { url, key };
}

export function saveSupabaseConfig(url: string, key: string): void {
  try {
    localStorage.setItem(LS_URL, url.trim());
    localStorage.setItem(LS_KEY, key.trim());
  } catch { /* ignore */ }
  client = null; // пересоздадим клиент с новыми значениями
}

export function clearSupabaseUrl(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

type Client = ReturnType<typeof createClient<Database>>;
let _client: Client | null = null;
let _clientSig = '';

function makeClient(url: string, anonKey: string): Client {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

// Placeholder-клиент: рендерится, пока настройки нет. НИКОГДА не должен ходить в сеть —
// все реальные запросы блокирует SupabaseSetupGate. Если по какой-то причине запрос
// всё же уйдёт сюда — получим понятную ошибку вместо «No API key found».
const PLACEHOLDER_URL = 'https://placeholder.invalid';
const PLACEHOLDER_KEY = 'missing-config';

/** Актуальный клиент по текущим настройкам; при изменении URL/ключа пересоздаёт клиента. */
export function sb(): Client {
  const url = resolveUrl();
  const key = resolveAnonKey();
  const sig = url + '|' + key;
  if (_client && _clientSig === sig) return _client;
  if (!url || !key) {
    // не настроено — возвращаем placeholder (сеть для него закрыта ниже)
    if (!_client || _clientSig !== 'placeholder') {
      _client = makeClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
      _clientSig = 'placeholder';
    }
    return _client;
  }
  _client = makeClient(url, key);
  _clientSig = sig;
  return _client;
}

/** Бросает ошибку, если Supabase не настроен (для вызовов из кода, который требует БД). */
export function requireSupabase(): SupabaseClient {
  const c = getSupabase();
  if (!c) throw new Error('Supabase не настроен: добавьте URL и anon-ключ');
  return c;
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}
