-- MetaBo: идемпотентная доводка схемы (запускать ВМЕСТЕ с 0001_init.sql,
-- если 0001 упал на середине — этот скрипт безопасно создаст недостающие объекты).
-- Все команды используют IF NOT EXISTS / DROP IF EXISTS, повторный запуск безопасен.

-- ── таблицы ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  age int,
  gender text check (gender in ('male','female')),
  height_cm numeric(5,1),
  activity_level text check (activity_level in ('sedentary','light','moderate','high','extreme')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbody_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(5,1) not null check (weight_kg > 0),
  fat_percent numeric(4,1) not null check (fat_percent between 0 and 70),
  muscle_percent numeric(4,1) not null check (muscle_percent between 0 and 70),
  bmr numeric(6,0) not null check (bmr > 0),
  bmi numeric(4,1),
  created_at timestamptz not null default now()
);
create index if not exists inbody_logs_user_date_idx on public.inbody_logs(user_id, measured_at desc);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  calories numeric(6,1) not null default 0 check (calories >= 0),
  protein numeric(5,1) not null default 0 check (protein >= 0),
  fat numeric(5,1) not null default 0 check (fat >= 0),
  carbs numeric(5,1) not null default 0 check (carbs >= 0),
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_ts_idx on public.food_logs(user_id, consumed_at desc);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('workout','sleep','other')),
  subtype text,
  duration_min int check (duration_min >= 0),
  calories numeric(6,1) check (calories >= 0),
  hours numeric(4,2) check (hours >= 0),
  quality int check (quality between 1 and 5),
  started_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists activities_user_ts_idx on public.activities(user_id, started_at desc);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  calories numeric(6,1) not null default 0 check (calories >= 0),
  protein numeric(5,1) not null default 0 check (protein >= 0),
  fat numeric(5,1) not null default 0 check (fat >= 0),
  carbs numeric(5,1) not null default 0 check (carbs >= 0),
  created_at timestamptz not null default now()
);
create index if not exists dishes_user_idx on public.dishes(user_id);
create unique index if not exists dishes_user_name_idx on public.dishes(user_id, lower(name));

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('weight','fatPercent','musclePercent')),
  target_value numeric(5,1) not null,
  target_date date not null,
  assessment jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists goals_one_active_idx on public.goals(user_id) where is_active = true;

create table if not exists public.daily_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  weight_kg numeric(5,1),
  fat_percent numeric(4,1),
  muscle_percent numeric(4,1),
  calories_consumed numeric(6,1),
  balance numeric(6,1),
  fat_oxidized numeric(6,1),
  fat_stored numeric(6,1),
  muscle_net numeric(6,1),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists daily_history_user_day_idx on public.daily_history(user_id, day desc);

-- ── триггер профиля (drop+create — безопасно переопределяет) ──
drop trigger if exists on_auth_user_created on auth.users;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS + политики (drop+create — безопасно) ──
alter table public.profiles      enable row level security;
alter table public.inbody_logs   enable row level security;
alter table public.food_logs     enable row level security;
alter table public.activities    enable row level security;
alter table public.dishes        enable row level security;
alter table public.goals         enable row level security;
alter table public.daily_history enable row level security;

-- profiles: чтение владельца, вставка триггером (security definer) и обновление профиля
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "own_rows" on public.profiles;
create policy "own_rows" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own_rows" on public.inbody_logs;
create policy "own_rows" on public.inbody_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.food_logs;
create policy "own_rows" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.activities;
create policy "own_rows" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.dishes;
create policy "own_rows" on public.dishes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.goals;
create policy "own_rows" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.daily_history;
create policy "own_rows" on public.daily_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ── seed демо-данных (§10) ──
create or replace function public.seed_demo_data(uid uuid)
returns void language plpgsql security invoker as $$
declare
  base_w numeric := 78.0;
  i int;
begin
  update public.profiles set is_demo = true where id = uid;

  insert into public.inbody_logs (user_id, measured_at, weight_kg, fat_percent, muscle_percent, bmr, bmi)
  select uid, now() - (d * interval '1 day'), w, f, m, b, round((w / power(1.78, 2))::numeric, 1)
  from (values
    (70, 80.0, 20.0, 40.0, 1750),
    (56, 79.6, 19.4, 40.4, 1758),
    (42, 79.2, 18.8, 40.9, 1766),
    (28, 78.8, 18.4, 41.3, 1772),
    (14, 78.4, 18.2, 41.7, 1776),
    ( 0, 78.0, 18.0, 42.0, 1780)
  ) as t(d, w, f, m, b);

  insert into public.dishes (user_id, name, calories, protein, fat, carbs) values
    (uid, 'Овсянка с бананом', 420, 15, 8, 70),
    (uid, 'Куриная грудка + рис', 650, 55, 12, 75),
    (uid, 'Творог + орехи', 380, 30, 18, 20),
    (uid, 'Лосось + овощи', 550, 40, 25, 15),
    (uid, 'Паста с курицей', 700, 45, 18, 80),
    (uid, 'Салат с тунцом', 380, 35, 15, 20);

  insert into public.food_logs (user_id, name, calories, protein, fat, carbs, consumed_at) values
    (uid, 'Овсянка с бананом', 420, 15, 8, 70, now() - interval '8 hours'),
    (uid, 'Куриная грудка + рис', 650, 55, 12, 75, now() - interval '4 hours'),
    (uid, 'Творог + орехи', 380, 30, 18, 20, now() - interval '1.5 hours'),
    (uid, 'Лосось + овощи', 550, 40, 25, 15, now() - interval '0.5 hours'),
    (uid, 'Овсянка с бананом', 420, 15, 8, 70, now() - interval '1 day 8 hours'),
    (uid, 'Куриная грудка + рис', 650, 55, 12, 75, now() - interval '1 day 4 hours');

  insert into public.activities (user_id, type, subtype, duration_min, calories, hours, quality, started_at) values
    (uid, 'workout', 'strength', 60, 380, null, null, now() - interval '5 hours'),
    (uid, 'sleep', null, null, null, 8, 4, now() - interval '10 hours'),
    (uid, 'other', 'walk', 45, null, null, null, now() - interval '3 hours'),
    (uid, 'workout', 'cardio', 30, 300, null, null, now() - interval '1 day 6 hours'),
    (uid, 'sleep', null, null, null, 7.5, 3, now() - interval '1 day 9 hours');

  -- 14 дней истории со случайной динамикой
  for i in 0..13 loop
    insert into public.daily_history (user_id, day, weight_kg, fat_percent, muscle_percent,
                                      calories_consumed, balance, fat_oxidized, fat_stored, muscle_net)
    values (
      uid,
      (current_date - i),
      round((base_w + 1.2 - i * 0.09 - random() * 0.04 * i)::numeric, 1),
      round((18.6 - i * 0.04 - random() * 0.02 * i)::numeric, 1),
      round((41.2 + i * 0.03 + random() * 0.02 * i)::numeric, 1),
      round((1900 + random() * 600)::numeric, 1),
      round(((random() - 0.5) * 700)::numeric, 1),
      round((40 + random() * 40)::numeric, 1),
      round((25 + random() * 30)::numeric, 1),
      round((3 + random() * 10)::numeric, 1)
    );
  end loop;
end; $$;

grant execute on function public.seed_demo_data(uuid) to authenticated, anon;
