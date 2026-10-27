// Supabase-клиент (readme1.md §12). Секретный ключ сюда никогда не попадает.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

// URL и anon-ключ можно ввести прямо в интерфейсе (настраивается один раз, хранится в localStorage).
// В проде правильный путь — VITE_SUPABASE_* в окружении Vercel; ручной ввод — fallback для быстрых тестов.
const STORAGE_URL_KEY = 'metabo.supabase.url';
const STORAGE_KEY_KEY = 'metabo.supabase.anonkey';

function normalizeHost(v: string): string {
  let s = v.trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s.replace(/\/+$/, '');
}

function resolveUrl(): string {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  const env = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return normalizeHost(saved || env || '');
}

export function getSupabaseUrl(): string {
  return resolveUrl();
}

export function resolveAnonKey(): string {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;
  const env = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return (saved || env || '').trim();
}

export function getSupabaseAnonKey(): string {
  return resolveAnonKey();
}

export function isSupabaseConfigured(): boolean {
  // configured == есть URL и anon-ключ (введённые вручную или из env)
  return !!resolveUrl() && !!resolveAnonKey();
}

// Сохраняет URL проекта и пересоздаёт клиент (страница перезагружается вызывающим кодом).
export function setSupabaseUrl(value: string): void {
  localStorage.setItem(STORAGE_URL_KEY, normalizeHost(value));
}

export function setSupabaseAnonKey(value: string): void {
  localStorage.setItem(STORAGE_KEY_KEY, value.trim());
}

export function clearSupabaseUrl(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

let _client: ReturnType<typeof createClient<Database>> | null = null;

function makeClient() {
  const url = resolveUrl();
  const anonKey = resolveAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      'Supabase не настроен: задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в окружении или введите их на экране настройки.',
    );
  }
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

// Ленивый клиент: чтобы экран настройки мог отрендериться даже без конфигурации.
const hasEnvKeys = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export function sb(): ReturnType<typeof createClient<Database>> {
  if (!_client) {
    const url = resolveUrl();
    const key = resolveAnonKey();
    if ((!url || !key) && (hasEnvKeys || url)) {
      // placeholder: реальные запросы всё равно блокирует gate-экран настройки
      _client = createClient<Database>('https://placeholder.supabase.co', 'public-anon-placeholder-key');
    } else {
      _client = makeClient();
    }
  }
  return _client;
}

// Прокси, чтобы существующий код (`import { supabase }`) работал с ленивым клиентом.
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_t, prop) {
    return Reflect.get(sb(), prop);
  },
});

// ---------- Типобезопасная обёртка над PostgREST ----------
// DECISION: supabase-js v2.109 резолвит Update/Insert нашего ручного Database в never
// (проверено локально tsc). Обёртка ниже сохраняет типизацию схемы из types/db.ts
// и совместима со всеми используемыми цепочками (select/eq/gte/lt/ilike/order/limit/single...).
// В проде перегенерировать типы DB и убрать обёртку: npx supabase gen types typescript.
type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type RowOf<T extends TableName> = Tables[T]['Row'];
type InsertOf<T extends TableName> = Tables[T]['Insert'];
type UpdateOf<T extends TableName> = Tables[T]['Update'];
type Err = { message: string } | null;

// Цепочка фильтров: каждый метод возвращает «универсальный» интерфейс — он одновременно
// годится и как результат SELECT-цепочки, и как результат UPDATE/DELETE-цепочки.
interface Chain<T extends TableName> {
  eq(col: string, val: unknown): Chain<T>;
  neq(col: string, val: unknown): Chain<T>;
  gt(col: string, val: unknown): Chain<T>;
  gte(col: string, val: unknown): Chain<T>;
  lt(col: string, val: unknown): Chain<T>;
  lte(col: string, val: unknown): Chain<T>;
  in(col: string, vals: readonly unknown[]): Chain<T>;
  ilike(col: string, pattern: string): Chain<T>;
  is(col: string, val: unknown): Chain<T>;
  select(cols?: string): Chain<T>;
  order(col: string, opts?: { ascending?: boolean }): Chain<T>;
  limit(n: number): Chain<T>;
  single(): PromiseLike<{ data: RowOf<T> | null; error: Err }>;
  maybeSingle(): PromiseLike<{ data: RowOf<T> | null; error: Err }>;
  then<R>(f: (v: { data: RowOf<T>[] | null; error: Err }) => R): Promise<R>;
}

export interface DbTable<T extends TableName> {
  select(cols?: string): Chain<T>;
  insert(values: InsertOf<T> | InsertOf<T>[]): Chain<T>;
  upsert(values: InsertOf<T>, opts?: { onConflict?: string }): Chain<T>;
  update(values: UpdateOf<T>): Chain<T>;
  delete(): Chain<T>;
}

export function db(): {
  from: <T extends TableName>(table: T) => DbTable<T>;
  rpc: (fn: 'seed_demo_data', args: { uid: string }) => PromiseLike<{ data: unknown; error: Err }>;
} {
  return supabase as unknown as ReturnType<typeof db>;
}
