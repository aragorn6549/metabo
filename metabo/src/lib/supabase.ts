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

let client: SupabaseClient | null = null;

/** Возвращает клиент Supabase или null, если URL/ключ ещё не настроены. */
export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
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
