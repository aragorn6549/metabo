// Supabase-клиент (readme1.md §12). Секретный ключ сюда никогда не попадает.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// DECISION: если env не задан — падаем с понятным сообщением, а не создаём битый клиент.
if (!url || !anonKey) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Скопируйте .env.example в .env.local и заполните значения.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
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
