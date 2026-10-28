#!/usr/bin/env node
/**
 * delete-user.mjs — безопасное удаление пользователя из Supabase-проекта MetaBo.
 *
 * Почему нельзя удалять строки руками:
 *   Регистрация идёт в auth.users (Supabase Auth), а public.profiles — лишь расширение.
 *   Если удалить строку только из profiles, запись в auth.users остаётся, и повторная
 *   регистрация на тот же e-mail падает с "User already registered".
 *   Этот скрипт удаляет пользователя через Admin API (service_role) — каскадно уходят
 *   все его данные из profiles / inbody_logs / food_logs / activities / dishes / goals /
 *   daily_history (FK on delete cascade).
 *
 * Использование:
 *   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *     node scripts/delete-user.mjs user@example.com [more@ex.com ...]
 *
 *   node scripts/delete-user.mjs --list            # показать всех пользователей (email + id)
 *   node scripts/delete-user.mjs --id <uuid>       # удалить по UUID из auth.users
 *   node scripts/delete-user.mjs --dry-run a@b.c   # только найти и показать, что будет удалено
 *   node scripts/delete-user.mjs --yes a@b.c       # без интерактивного подтверждения
 *
 * Ключи берутся из окружения; поддержка .env / .env.local в корне проекта (метабол/.env*).
 * НЕ используйте service_role ключ во фронтенде! Только этот локальный скрипт.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ---------- аргументы ----------
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));

const emails = [];
let targetId = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--id') { targetId = argv[++i]; continue; }
  if (a.startsWith('--')) continue;
  emails.push(a.trim().toLowerCase());
}

const LIST = flags.has('--list');
const DRY = flags.has('--dry-run');
const YES = flags.has('--yes');

// ---------- конфиг ----------
function loadEnvFiles() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(PROJECT_ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, key, rawVal] = m;
      const val = rawVal.replace(/^["']|["']$/g, '').trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnvFiles();

const URL_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

if (!URL_BASE || !KEY) {
  console.error(`Не заданы SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.
Пример:
  SUPABASE_URL=https://ваш-проект.supabase.co \\
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \\
  node scripts/delete-user.mjs user@example.com

Service role key: Dashboard → Settings → API → "service_role" (держать в секрете!).`);
  process.exit(1);
}
if (/placeholder/i.test(URL_BASE)) {
  console.error('SUPABASE_URL выглядит как placeholder — укажите реальный URL проекта.');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  return { ok: res.ok, status: res.status, data };
}

const ADMIN = `${URL_BASE}/auth/v1/admin`;

// ---------- helpers ----------
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findUsersByQuery(q) {
  // /users?page=1&per_page=50 & filters not supported everywhere — используем search параметр GoTrue (?search=)
  const r = await req('GET', `${ADMIN}/users?page=1&per_page=1000&search=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(`Не удалось получить список пользователей: ${r.status} ${JSON.stringify(r.data)}`);
  const users = r.data?.users ?? r.data ?? [];
  const qq = q.toLowerCase();
  return users.filter((u) =>
    (u.email || '').toLowerCase() === qq ||
    (u.phone || '') === q ||
    (u.id || '').toLowerCase() === qq
  );
}

async function listAllUsers() {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const r = await req('GET', `${ADMIN}/users?page=${page}&per_page=1000`);
    if (!r.ok) throw new Error(`Не удалось получить список пользователей: ${r.status} ${JSON.stringify(r.data)}`);
    const users = r.data?.users ?? r.data ?? [];
    out.push(...users);
    if (users.length < 1000) break;
  }
  return out;
}

async function countPublicRows(uid) {
  // PostgREST c table_count по auth.uid не фильтрует (RLS own_rows пуст для чужих uid),
  // но с service_role заголовком RLS обходится — можно посчитать остатки данных пользователя.
  const tables = ['profiles', 'inbody_logs', 'food_logs', 'activities', 'dishes', 'goals', 'daily_history'];
  const counts = {};
  for (const t of tables) {
    const r = await req('GET', `${URL_BASE}/rest/v1/${t}?select=id&user_id=eq.${uid}&limit=1000`, undefined);
    // у profiles PK называется id, а не user_id
    let rows = r.ok && Array.isArray(r.data) ? r.data : null;
    if (!rows) {
      const r2 = await req('GET', `${URL_BASE}/rest/v1/${t}?select=id&id=eq.${uid}&limit=1000`, undefined);
      rows = r2.ok && Array.isArray(r2.data) ? r2.data : [];
    }
    counts[t] = rows.length;
  }
  return counts;
}

function fmtUser(u) {
  return `${(u.email || u.phone || '(без email)').padEnd(34)} id=${u.id}  created=${(u.created_at || '').slice(0, 10)}`;
}

// ---------- main ----------
async function main() {
  if (LIST) {
    const users = await listAllUsers();
    console.log(`Всего пользователей в auth.users: ${users.length}\n`);
    for (const u of users) console.log(fmtUser(u));
    return;
  }

  const targets = [];
  if (targetId) {
    if (!uuidRe.test(targetId)) {
      console.error(`"--id" ожидает UUID (например 8f14e45f-...), получено: ${targetId}`);
      process.exit(1);
    }
    const r = await req('GET', `${ADMIN}/users/${targetId}`);
    if (!r.ok) { console.error(`Пользователь с id=${targetId} не найден (${r.status}).`); process.exit(1); }
    targets.push(r.data);
  }
  for (const email of emails) {
    const found = await findUsersByQuery(email);
    if (found.length === 0) {
      console.warn(`⚠  Не найден пользователь с почтой "${email}" в auth.users.`);
      console.warn('   Возможно, вы уже удалили его корректно, или почта указана с опечаткой (--list для просмотра).');
    } else {
      for (const u of found) targets.push(u);
    }
  }

  if (targets.length === 0) {
    console.error('Нечего удалять. Укажите email/UUID или используйте --list.');
    process.exit(1);
  }

  // дедупликация по id
  const uniq = [...new Map(targets.map((u) => [u.id, u])).values()];

  console.log(`Найдено пользователей для удаления: ${uniq.length}`);
  for (const u of uniq) {
    console.log(`  • ${fmtUser(u)}`);
    try {
      const c = await countPublicRows(u.id);
      const nonEmpty = Object.entries(c).filter(([, n]) => n > 0).map(([t, n]) => `${t}:${n}`).join(', ');
      console.log(`    данные в public.*: ${nonEmpty || 'нет (или остались осиротевшие строки — см. SQL ниже)'}`);
    } catch { /* не критично */ }
  }

  if (DRY) {
    console.log('\n--dry-run: ничего не удалено.');
    return;
  }

  if (!YES) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ans = (await rl.question(`\nУдалить этих пользователей и ВСЕ их данные? Это необратимо. [y/N] `)).trim().toLowerCase();
    rl.close();
    if (ans !== 'y' && ans !== 'yes') { console.log('Отменено.'); return; }
  }

  let failed = 0;
  for (const u of uniq) {
    const r = await req('DELETE', `${ADMIN}/users/${u.id}`);
    if (r.ok) {
      console.log(`✔ Удалён: ${u.email || u.id}`);
    } else {
      failed++;
      console.error(`✖ Ошибка удаления ${u.email || u.id}: ${r.status} ${JSON.stringify(r.data)}`);
    }
  }

  console.log(failed ? `\nГотово с ошибками: ${failed} не удалены.` : '\nГотово. Теперь можно зарегистрироваться заново на эти почты.');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
