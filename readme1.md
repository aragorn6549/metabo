README.md — MetaBo Production Spec
Для AI-агента-разработчика: ниже — полное техническое задание на переделку HTML-прототипа MetaBol.txt (одностраничный React-компонент с localStorage) в полноценное production-приложение на React + TypeScript + Supabase + Vercel. Сохрани всю функциональность и визуальный дизайн прототипа, но переведи данные с localStorage на Postgres (Supabase) с аутентификацией и RLS. Следуй разделам по порядку — там вся спецификация, включая формулы, схему БД и чеклист приёмки.

0. TL;DR
Что: MetaBo — приложение для трекинга метаболизма, состава тела, еды и тренировок. Показывает «здесь и сейчас» баланс жира (липолиз/эстерификация) и синтез мышц на 3D-модели тела в реальном времени.

Стек: React 18 + TypeScript + Vite, Supabase (Auth + Postgres + RLS), Three.js, React Query, Recharts или собственные SVG-графики, Vercel.

Не менять: математические модели, формулы, логику симуляции, дизайн-систему, UX-структуру табов.

Изменить: способ хранения (Postgres вместо localStorage), аутентификация (Supabase Auth вместо самописной), API-слой, обработка loading/error, типизация, деплой.

1. Что делает приложение
Приложение трекает ежедневный обмен веществ, опираясь на:

Замеры InBody (вес, % жира, % мышц, BMR, ИМТ) — история с дельтами.

Приёмы пищи (КБЖУ + время) — из каталога блюд или вручную.

Тренировки (силовые/кардио/спорт по MET), сон, прочая активность.

Цель (вес/% жира/% мышц + дата) с проверкой реалистичности и расчётом дневных КБЖУ-норм.

На основе этих данных приложение:

Считает BMR / TDEE / TEF по Mifflin–St Jeor.

Симулирует почасовую динамику липолиза, эстерификации, чистого жирового потока, синтеза и распада мышц (формулы в §6).

Рисует 3D-модель тела с визуализацией процессов (Three.js).

Показывает прогресс к цели (опережение/отставание) по каждому процессу.

Строит графики (вес, % жира, % мышц, липолиз, липогенез, синтез мышц, энергобаланс) и таблицу истории.

2. Технологический стек (обязательный)
Слой	Технология
UI	React 18 + TypeScript, Vite
Роутинг	React Router v6 (или state-based с URL-hash)
Server-state	TanStack React Query v5
UI-state	Zustand (модалки, активный таб, тосты)
Формы	react-hook-form + zod
Стили	Сохранить текущий CSS или перенести в Tailwind (дизайн 1:1)
3D	three@0.160+
Графики	Recharts или свои SVG (как в прототипе)
Даты	date-fns (locale: ru)
Тосты	sonner или своя реализация
Backend	Supabase (Postgres 15, Auth, RLS)
Деплой	Vercel
Тесты	Vitest (юнит-тесты формул) + Playwright (e2e happy path)
3. Структура проекта
text
metabo/
├── api/                 # (опционально) edge-функции, если нужен cron/снапшоты
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── lib/
│   │   ├── supabase.ts              # createClient(...)
│   │   ├── queryClient.ts
│   │   └── utils.ts
│   ├── types/
│   │   ├── db.ts                    # типы БД (сгенерировать supabase gen types)
│   │   └── domain.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── useAuth.ts
│   │   │   └── ProtectedRoute.tsx
│   │   ├── onboarding/
│   │   │   ├── OnboardingScreen.tsx
│   │   │   └── useProfile.ts
│   │   ├── inbody/
│   │   │   ├── InBodyTab.tsx
│   │   │   ├── InBodyEditor.tsx
│   │   │   └── useInBodyLogs.ts
│   │   ├── food/
│   │   │   ├── DishesTab.tsx
│   │   │   ├── DishEditor.tsx
│   │   │   ├── FoodLogger.tsx
│   │   │   └── useFoodLogs.ts
│   │   ├── activities/
│   │   │   ├── ActivityLogger.tsx
│   │   │   ├── ActivityHistory.tsx
│   │   │   └── useActivities.ts
│   │   ├── goal/
│   │   │   ├── GoalTab.tsx
│   │   │   └── useGoal.ts
│   │   ├── map/
│   │   │   ├── MetabolismMap.tsx
│   │   │   ├── Body3D.tsx
│   │   │   ├── ProcessCard.tsx
│   │   │   └── MiniSparkline.tsx
│   │   ├── journal/
│   │   │   ├── Journal.tsx
│   │   │   ├── ChartsView.tsx
│   │   │   ├── LineChart.tsx
│   │   │   └── useDailyHistory.ts
│   │   ├── help/
│   │   │   └── HelpTab.tsx
│   │   └── profile/
│   │       └── MobileProfile.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── MobileNav.tsx
│   │   ├── NumberInput.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── hooks/
│   │   └── useMediaQuery.ts
│   ├── math/
│   │   ├── bmr.ts
│   │   ├── tdee.ts
│   │   ├── simulation.ts            # ВАЖНО: см. §6.3
│   │   ├── goalAssessment.ts
│   │   └── bmi.ts
│   └── styles/
│       └── global.css               # копия CSS из прототипа
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
├── .env.example
├── vite.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
|── README1.md
└── README.md
5. Supabase: схема БД
Создай проект Supabase, включи Email/Password Auth, и примени миграцию.

sql
-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (расширение auth.users)
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  age int,
  gender text check (gender in ('male','female')),
  height_cm numeric(5,1),
  activity_level text check (activity_level in ('sedentary','light','moderate','high','extreme')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Триггер: создать профиль после регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. INBODY_LOGS
-- ────────────────────────────────────────────────────────────
create table public.inbody_logs (
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
create index inbody_logs_user_date_idx on public.inbody_logs(user_id, measured_at desc);

-- ────────────────────────────────────────────────────────────
-- 3. FOOD_LOGS
-- ────────────────────────────────────────────────────────────
create table public.food_logs (
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
create index food_logs_user_ts_idx on public.food_logs(user_id, consumed_at desc);

-- ────────────────────────────────────────────────────────────
-- 4. ACTIVITIES
-- ────────────────────────────────────────────────────────────
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('workout','sleep','other')),
  subtype text,                       -- strength|cardio|volleyball|padel|tennis|football|basketball|walk|work_sit|work_stand|chill
  duration_min int check (duration_min >= 0),
  calories numeric(6,1) check (calories >= 0),
  hours numeric(4,2) check (hours >= 0),
  quality int check (quality between 1 and 5),
  started_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index activities_user_ts_idx on public.activities(user_id, started_at desc);

-- ────────────────────────────────────────────────────────────
-- 5. DISHES (каталог блюд)
-- ────────────────────────────────────────────────────────────
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  calories numeric(6,1) not null default 0 check (calories >= 0),
  protein numeric(5,1) not null default 0 check (protein >= 0),
  fat numeric(5,1) not null default 0 check (fat >= 0),
  carbs numeric(5,1) not null default 0 check (carbs >= 0),
  created_at timestamptz not null default now()
);
create index dishes_user_idx on public.dishes(user_id);
create unique index dishes_user_name_idx on public.dishes(user_id, lower(name));

-- ────────────────────────────────────────────────────────────
-- 6. GOALS (цели, одна активная)
-- ────────────────────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('weight','fatPercent','musclePercent')),
  target_value numeric(5,1) not null,
  target_date date not null,
  assessment jsonb not null,          -- снапшот assessGoal()
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Только одна активная цель на пользователя
create unique index goals_one_active_idx on public.goals(user_id) where is_active = true;

-- ────────────────────────────────────────────────────────────
-- 7. DAILY_HISTORY (дневные снапшоты, для графиков)
-- ────────────────────────────────────────────────────────────
create table public.daily_history (
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
create index daily_history_user_day_idx on public.daily_history(user_id, day desc);
4.1 RLS-политики (обязательно)
Для всех таблиц включи RLS и добавь политику «только своё»:

sql
alter table public.profiles      enable row level security;
alter table public.inbody_logs   enable row level security;
alter table public.food_logs     enable row level security;
alter table public.activities    enable row level security;
alter table public.dishes        enable row level security;
alter table public.goals         enable row level security;
alter table public.daily_history enable row level security;

-- Шаблон для пользовательских таблиц
create policy "own_rows" on public.inbody_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (повторить для food_logs, activities, dishes, goals, daily_history)

create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
4.2 Генерация типов
bash
npx supabase gen types typescript --project-id <id> > src/types/db.ts
5. Аутентификация и онбординг
5.1 Auth-флоу
AuthScreen (/login) — две вкладки: Вход / Регистрация.

Email + password. Валидация: email содержит @, пароль ≥ 6 символов (в проде — минимум 8).

supabase.auth.signUp({ email, password }) / signInWithPassword.

Ошибки Supabase (Invalid login credentials, User already registered) → показать в .auth-error.

Удалить демо-режим и «⚡ Попробовать демо» — либо реализовать через signInAnonymously() c отдельным флагом is_demo в profiles (см. §10).

Защита роутов: <ProtectedRoute> проверяет useAuth() (обёртка над supabase.auth.getSession() + onAuthStateChange). Редирект на /login, если нет сессии.

Logout: supabase.auth.signOut() + очистка React Query кэша (queryClient.clear()).

5.2 Онбординг
Показывается, если у профиля нет хотя бы одного inbody_log (или profile.age is null).

Форма (поля 1:1 из прототипа):

Имя, Возраст, Пол (male/female), Рост (см), Вес (кг), % жира, % мышц, Уровень активности.

BMR считается на лету (Mifflin–St Jeor) и показывается в .stat-card.

При сохранении:

update profiles set name, age, gender, height_cm, activity_level.
insert into inbody_logs — первый замер на сегодня.
Инвалидировать запросы profile и inbody_logs.
Baseline для всех расчётов = последний по дате inbody_log. Не хранить weight/fat/muscle в profiles — только рост, возраст, пол, активность.

6. Бизнес-логика (не менять — копировать точь-в-точь)
Все формулы должны совпадать с прототипом, иначе цифры «поплывут». Разместить в src/math/. Ниже — референсные формулы и псевдокод.

6.1 BMR, TEF, TDEE, BMI
ts
// bmr.ts
export const calculateBMR = (w: number, h: number, a: number, g: 'male'|'female') => {
  const b = 10*w + 6.25*h - 5*a;
  return g === 'male' ? b + 5 : b - 161;
};

// tdee.ts
export const calculateTEF = (p: number, c: number, f: number) =>
  p*4*0.30 + c*4*0.10 + f*9*0.03;

export const ACTIVITY_COEF = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, extreme: 1.9,
} as const;

export const calculateTDEE = (
  bmr: number, level: ActivityLevel, workoutCal: number, macros: Macros
) => bmr * ACTIVITY_COEF[level] + calculateTEF(macros.protein, macros.carbs, macros.fat) + workoutCal;

// bmi.ts
export const calcBMI = (w: number, hCm: number) => +(w / Math.pow(hCm/100, 2)).toFixed(1);
6.2 MET
ts
export const MET_COEF = { volleyball: 4.0, padel: 6.0, tennis: 7.0, football: 7.0, basketball: 6.5 } as const;
export const calcMETCalories = (met: number, w: number, min: number) =>
  Math.round(met * w * (min/60));
6.3 Почасовая симуляция — ГЛАВНАЯ ФУНКЦИЯ
Это сердце приложения. Скопируй без изменений логики:

ts
export type HourlyRate = {
  lipolysis: number;
  esterification: number;
  netFatFlux: number;   // < 0 — сжигание, > 0 — накопление
  netMuscle: number;
};

export function computeHourlyRate(
  hour: number,
  dayStartTs: number,
  foodLogs: FoodLog[],
  activities: Activity[],
  calorieBalance: number,
): HourlyRate {
  const isSleepingHour = hour >= 23 || hour < 7;
  const baseFat = 0.22;
  let insulinSuppression = 1.0;
  let insulinSignal = 0;

  // Инсулиновая супрессия липолиза — 5 ч после еды
  for (const meal of foodLogs) {
    const hoursSince = hour - (meal.timestamp - dayStartTs) / 3600e3;
    if (hoursSince < 0 || hoursSince > 5) continue;
    const suppStrength = Math.min(0.9, 0.3 + (meal.carbs||0)*0.012 + (meal.calories||0)/2500);
    const decay = 1 - hoursSince/5;
    insulinSuppression *= (1 - suppStrength * decay);
    const peak = hoursSince < 1 ? hoursSince : Math.max(0, 1 - (hoursSince-1)/4);
    insulinSignal += ((meal.carbs||0)*0.02 + (meal.fat||0)*0.03
                    + (meal.protein||0)*0.015 + (meal.calories||0)/1000) * peak;
  }

  // Циркадный ритм
  const circadian = 0.6 + 0.55 * Math.cos((hour - 4) / 24 * 2 * Math.PI);

  // Сон
  let sleepBoost = isSleepingHour ? 1.4 : 1.0;
  for (const s of activities.filter(a => a.type === 'sleep')) {
    const startHour = (s.timestamp - dayStartTs) / 3600e3;
    const endHour = startHour + (s.hours || 8);
    if (hour >= startHour && hour <= endHour) sleepBoost = Math.max(sleepBoost, 1.45);
  }

  // Тренировки: кардио даёт больший буст липолиза, силовые — меньший
  let exerciseBoost = 0;
  for (const w of activities.filter(a => a.type === 'workout')) {
    const hoursSince = hour - (w.timestamp - dayStartTs) / 3600e3;
    if (hoursSince < 0) continue;
    const cardioFactor = w.subtype === 'cardio' ? 1.0 : 0.35;
    const intensity = Math.min(1, (w.calories || 300) / 500);
    exerciseBoost += cardioFactor * intensity * Math.exp(-hoursSince / 2) * 0.9;
  }

  // Дефицит/профицит
  const deficitFactor = calorieBalance < 0
    ? 1 + Math.min(1.0, Math.abs(calorieBalance) / 600)
    : Math.max(0.35, 1 - calorieBalance / 1200);

  const lipolysis = Math.max(0.01,
    (baseFat + exerciseBoost) * insulinSuppression * circadian * sleepBoost * deficitFactor);

  // Эстерификация (хранение)
  const baseEsterif = 0.10;
  const insulinDriven = insulinSignal * 3.5;
  const surplusFactor = calorieBalance > 0 ? Math.min(2.0, calorieBalance / 500) : 0;
  const dnl = surplusFactor * 0.4; // de novo lipogenesis
  const esterification = baseEsterif * (1 + insulinDriven) * (1 + surplusFactor) + dnl;

  const netFatFlux = lipolysis - esterification;

  // MPS (синтез мышечного белка)
  const baseMps = 0.03;
  let mealMps = 0;
  for (const meal of foodLogs) {
    if ((meal.protein||0) < 15) continue;
    const hoursSince = hour - (meal.timestamp - dayStartTs) / 3600e3;
    if (hoursSince < 0 || hoursSince > 3.5) continue;
    const intensity = Math.min(1, (meal.protein||0) / 35);
    mealMps += intensity * 2.0 * (1 - hoursSince / 3.5);
  }
  let trainingBoost = 1.0;
  for (const w of activities.filter(a => a.type === 'workout' && a.subtype === 'strength')) {
    const hoursSince = hour - (w.timestamp - dayStartTs) / 3600e3;
    if (hoursSince < 0 || hoursSince > 36) continue;
    trainingBoost = Math.max(trainingBoost, 0.7 + 1.5 * Math.exp(-hoursSince / 10));
  }
  const sleepFactor = isSleepingHour ? 0.15 : 1.0;
  const energyFactor = calorieBalance < 0 ? 0.5 : 1.0;
  const mps = (baseMps + mealMps) * trainingBoost * sleepFactor * energyFactor;

  // MPB (распад мышечного белка)
  let mpb = 0.06;
  if (isSleepingHour) mpb = 0.13;
  let lastMealHour = -Infinity;
  for (const meal of foodLogs) {
    const mh = (meal.timestamp - dayStartTs) / 3600e3;
    if (mh <= hour && mh > lastMealHour) lastMealHour = mh;
  }
  const fastingHours = lastMealHour > -Infinity ? hour - lastMealHour : hour;
  if (fastingHours > 5) mpb *= 1.25;
  if (fastingHours > 9) mpb *= 1.15;

  const netMuscle = mps - mpb;
  return { lipolysis, esterification, netFatFlux, netMuscle };
}

// simulateDay — интеграция по часам (шаг 0.25 ч), возвращает итоги за сегодня + snapshots
export function simulateDay(foodLogs: FoodLog[], activities: Activity[], calorieBalance: number) {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const dayStartTs = dayStart.getTime();
  const currentHour = (now.getTime() - dayStartTs) / 3600e3;
  const step = 0.25;
  let netFatToday = 0, fatOxidized = 0, fatStored = 0, muscleToday = 0;
  const snapshots: Array<HourlyRate & {hour: number}> = [];
  for (let h = 0; h <= currentHour + 1e-9; h += step) {
    const hh = Math.min(h, currentHour);
    const r = computeHourlyRate(hh, dayStartTs, foodLogs, activities, calorieBalance);
    snapshots.push({ hour: hh, ...r });
    if (snapshots.length > 1) {
      const prev = snapshots[snapshots.length - 2];
      const dh = hh - prev.hour;
      if (dh > 0) {
        netFatToday  += (r.netFatFlux + prev.netFatFlux) / 2 * dh;
        fatOxidized  += (r.lipolysis + prev.lipolysis) / 2 * dh;
        fatStored    += (r.esterification + prev.esterification) / 2 * dh;
        muscleToday  += (r.netMuscle + prev.netMuscle) / 2 * dh;
      }
    }
  }
  const current = snapshots[snapshots.length - 1] ?? {
    lipolysis: 0, esterification: 0, netFatFlux: 0, netMuscle: 0,
  };
  return {
    currentLipolysis: current.lipolysis,
    currentEsterification: current.esterification,
    currentNetFatFlux: current.netFatFlux,
    currentMuscle: current.netMuscle,
    netFatToday, fatOxidized, fatStored, muscleToday,
    currentHour, snapshots,
  };
}
Знак: netFatFlux < 0 = жир сжигается. На карте отображается fatDisplayRate = -netFatFlux (то есть отрицательное значение = плохо/зелёное… нет — отрицательное = сжигание, смотри ProcessCard: для жира isGood = currentDisplayRate < -0.05, где currentDisplayRate = -netFatFlux).

6.4 Оценка цели
assessGoal({ targetType, targetValue, targetDate, baseline, tdee }) возвращает объект с полями:
isFeasible, verdict, direction, targetType, targetValue, targetUnit, currentValue, targetDelta, dailyCalorieAdjustment, targetCalories, targetProtein, targetFat, targetCarbs, weeklyRateNeeded, monthlyRateNeeded, limitDescription, realisticDate, daysAvailable, originalDate.

Правила (кратко, полный код — в прототипе, строки ~340–390):

weight/fatPercent: лимит min(1% массы, 1 кг)/нед. Если превышен → isFeasible=false, realisticDate = сегодня + (дельта / лимит) дней.

musclePercent: лимит 1.5% массы/мес.

Коррекция калорий: при похудении dAdj в диапазоне [-25%, -15%] TDEE; при агрессивной цели — всегда -25%. При наборе мышц — +200..+300.

Макросы: белок 2.0 г/кг (похудение) или 1.8 (набор), жир 25% калорий, углеводы = остаток.

Сохраняется снапшот assessment в goals.assessment (jsonb) — чтобы UI не пересчитывал.

6.5 Производные планы
computePlan(goal, baseline) → { fatPerDay, musclePerDay, days } (г/день). Логика — в прототипе (строки ~200–230). Значения используются в ProcessCard.planDisplayValue:

жир: -plan.fatPerDay

мышцы: +plan.musclePerDay

7. API-слой (React Query hooks)
Каждый домен — свой хук. Примеры:

ts
// useFoodLogs.ts
export function useFoodLogs(range: 'today'|'week'|'month'|'all' = 'today') {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['food_logs', range],
    queryFn: async () => {
      let q = supabase.from('food_logs').select('*').order('consumed_at', { ascending: false });
      if (range === 'today') q = q.gte('consumed_at', startOfDay(new Date()).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewFoodLog) => {
      const { data, error } = await supabase.from('food_logs').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food_logs'] });
      qc.invalidateQueries({ queryKey: ['daily_history'] });
    },
  });
}
Аналогично: useInBodyLogs, useActivities, useDishes, useGoal, useDailyHistory, useProfile.

Оптимистичные апдейты для удаления/редактирования — обязательно (иначе UI дёргается).

7.1 Baseline
ts
export function useBaseline() {
  const { data: logs } = useInBodyLogs();
  const { data: profile } = useProfile();
  return useMemo(() => {
    const latest = logs?.[0]; // отсортировано по measured_at desc
    if (!latest || !profile) return null;
    return {
      ...latest,
      name: profile.name, age: profile.age, gender: profile.gender,
      height: profile.height_cm, activityLevel: profile.activity_level,
    };
  }, [logs, profile]);
}
7.2 Сегодняшние агрегаты (todayData)
Считается на клиенте в useMemo (как в прототипе, строки ~1100–1140):

todayFoods — food_logs за сегодня.

macros — сумма protein/fat/carbs.

calC — сумма калорий.

wCal — сумма калорий тренировок.

sleepH — сумма часов сна за сегодня.

hasStr — была ли силовая.

bmr — из latest inbody_log.

tdee = calculateTDEE(...), balance = calC - tdee.

7.3 Симуляция
ts
const sim = useMemo(
  () => todayData ? simulateDay(foodLogs, activities, todayData.balance) : null,
  [foodLogs, activities, todayData?.balance, tick],
);
tick — useState(0), инкремент раз в 60 секунд через setInterval (см. прототип).

8. Функциональные требования по экранам
8.1 Auth (/login)
Вкладки Вход / Регистрация.

Ошибки Supabase → .auth-error.

Кнопка «Войти» / «Создать аккаунт».

После успеха → редирект на / (или /onboarding если нет inbody_log).

8.2 Онбординг (/onboarding)
Поля: имя, возраст, пол, рост, вес, % жира, % мышц, активность.

Live-расчёт BMR.

Кнопка «Начать» → пишет профиль + первый inbody_log.

8.3 Карта (/) — главный экран
Двухколоночный layout: 3D + процессы слева, статистика справа.

3D-модель (Body3D): Three.js сцена 1:1 из прототипа (голова, шея, торс, руки, ноги). Три «оболочки» (fat зелёный, lipo красный, muscle синий) с AdditiveBlending и пульсацией. Вращение мышью/тачем.

Две ProcessCard:

🔥 Жир: rate -netFatFlux, breakdown (липолиз/эстерификация), today, план, прогресс-бар vs время дня, статус (опережение/в графике/отставание), sparkline, контекст.

💪 Мышцы: rate netMuscle, today, план, аналогично.

Статистика (правая колонка):

Энергобаланс (баланс + план + норма ккал).

КБЖУ сегодня с прогресс-барами к плану.

Сон.

Кнопка «🎯 Поставить цель» (если цели нет) или «+ Добавить активность».

История активностей под картой (ActivityHistory): группировка по дням, свёрнутые дни, внутри — по типам (🍽 / 🏋️ / 😴 / 🚶), кнопки ✎ / ×.

Floating-дельты поверх 3D (↓ сожжено, ↑ накоплено, ↑ мышц).

Если данных за сегодня нет — заглушка «Добавь еду и тренировки, чтобы увидеть прогноз», 3D-анимация в покое.

8.4 Цель (/goal)
Селект: Вес (кг) / % жира / % мышц.

Числовое значение + дата.

Кнопка «Рассчитать» — считает assessGoal локально (не нужно писать в БД, пока не «Сохранить»).

Результат: вердикт (✓ реалистично / ! слишком агрессивно), текущее значение, цель, дневной дефицит/профицит, реалистичная дата.

Дневные цели КБЖУ (калории, белки, жиры, углеводы).

Дневные планы по составу тела (г/день).

Если цель нереалистична → предупреждение .goal-warning.

При сохранении:

update goals set is_active = false where user_id = ... and is_active = true
insert goals с assessment (jsonb) и is_active = true.
Инвалидировать goal.
8.5 Рацион (/dishes)
Сетка карточек блюд (имя, КБЖУ, кнопки ✎ ×).

Кнопка «+ Блюдо» → DishEditor.

DishEditor: name, calories, protein, fat, carbs. Валидация: name обязателен.

При сохранении нового блюда проверить unique (user_id, lower(name)) — если конфликт, показать тост «Блюдо с таким названием уже есть».

8.6 Журнал (/journal)
Две под-вкладки: 📊 Графики и 📋 Замеры InBody.

Графики:

Фильтр День/Неделя/Месяц.

5–8 SVG-графиков: вес, % жира, % мышц, (липолиз/липогенез/мышцы-net — если есть данные), энергобаланс.

На графиках веса/% — жёлтая пунктирная линия «цель» + жёлтая пунктирная «план» (computePlanSeries).

Таблица истории: дата, вес, % жира, % мышц, ккал, баланс, [липолиз, липогенез].

ВАЖНО: в проде данные для графиков брать из daily_history, а сегодняшнюю точку добавлять из sim + todayData (как в прототипе).

InBody:

Список замеров по убыванию даты.

У каждого: дата, бейдж «текущий» (у самого свежего), значения + дельта относительно предыдущего замера (цвет: % жира ↓ зелёный, % мышц ↑ зелёный, вес/ИМТ нейтральный).

Кнопка «+ Замер» → InBodyEditor.

InBodyEditor: дата, вес, % жира, % мышц, BMR, ИМТ. Вес → автопересчёт ИМТ.

После insert/update/delete — пересчитать baseline (см. §7.1) и инвалидировать inbody_logs, profile, daily_history, goal (assessment мог устареть).

8.7 Справка (/help)
Аккордеон с секциями: BMR, TDEE, TEF, Липолиз, Эстерификация, Баланс жира, InBody, Рацион. Формулы — в <div class="formula">. Публичная (доступна без auth) — или только внутри (по желанию).

8.8 Профиль (мобильная вкладка)
Аватар + имя.

Возраст, рост, вес, % жира, % мышц, BMR.

Активная цель.

Кнопки: 📖 Справка, + Новый замер, Выйти.

8.9 Логгер активности (модалка)
4 таба: 🍽 Еда / 🏋️ Тренировка / 😴 Сон / 🚶 Прочее.

Еда:

Шаг 1: выбор блюда из каталога (список .dish-pick-item) + кнопка «+ Новое блюдо».

Шаг 2: форма с предзаполненными КБЖУ (можно менять — не влияет на каталог).

При сохранении нового имени (не из каталога) — авто-добавить в dishes (сохранить это поведение прототипа; либо сделать настройку — по желанию).

Тренировка:

subtype: strength / cardio / volleyball / padel / tennis / football / basketball.

Длительность (мин), Калории.

Для спорта — кнопка/переключатель «авто по MET» (при смене subtype или duration — пересчёт calcMETCalories).

Сон: часы + качество 1–5.

Прочее: подтип (walk / work_sit / work_stand / chill) + длительность.

Редактирование: заголовок «Редактирование» + бейдж edit, при сохранении — update по id.

9. Мобильный UX
useMediaQuery('(max-width: 768px)'):

Desktop: header с логотипом + табами + аватар + logout. Layout с 2 колонками.

Mobile:

.mobile-header (sticky) с логотипом и аватаром-кнопкой → профиль.

.mobile-content с паддингами.

.mobile-nav (fixed bottom): Карта / Цель / [➕] / Рацион / Журнал.

Модалки — .modal-backdrop align-items: flex-end, скругление только сверху, max-height: 85vh.

3D-блок 280px, процессы друг под другом.

Тосты — bottom: 80px.

Все стили — скопировать из прототипа 1:1 (CSS-переменные, классы). Если переводишь на Tailwind — сохрани визуал (цвета --bg #080b14, --fat #f97316, --muscle #3b82f6, --accent #8b5cf6, --goal #eab308).

10. Demo-режим (рекомендация)
В прототипе был «⚡ Демо» без регистрации. Варианты для прода:

Рекомендуется: supabase.auth.signInAnonymously() + флаг profiles.is_demo = true. При первом входе засеять демо-данные. Дать плашку «Демо-режим, данные удалятся» и кнопку «Создать аккаунт».

Не делать вовсе (только регистрация).

Если выберешь вариант 1 — добавь is_demo boolean default false в profiles, edge-функцию seed_demo_data(user_id) на SQL/PLpgSQL, и cron (напр. Supabase scheduled function) для очистки анонимных пользователей старше 7 дней.

11. Миграция данных из demo (опционально)
Если пользователь заходит и в localStorage есть metabo_data_<email> — предложить импорт:

Прочитать объект.

Пакетно insert в inbody_logs, food_logs, activities, dishes, goals, daily_history.

Очистить localStorage.

Показать тост «Импортировано N записей».

Это необязательно, но приятный «плюс» для существующих пользователей прототипа.

12. Переменные окружения
.env.local (не коммитить) и Vercel Environment Variables:

text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
supabase.ts:

ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
Секретный service_role ключ — никогда во фронт; только в edge-функциях / миграциях.

13. Деплой на Vercel
npm create vite@latest metabo -- --template react-ts

Установить зависимости из §2.

Создать проект Supabase, применить миграцию, включить Email/Password Auth, настроить Redirect URLs (https://<vercel-domain>/auth/callback).

vercel link, vercel env add (или через dashboard).

vercel deploy --prod.

Добавить vercel.json для SPA-fallback:

json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
В Supabase → Auth → URL Configuration: Site URL = прод-домен, Redirect URLs — все варианты.

14. Чеклист приёмки (QA)
□ Регистрация нового пользователя → онбординг → карта.
□ Логин / логаут / refresh сессии (перезагрузить страницу — сессия сохраняется).
□ Второй пользователь не видит данные первого (проверить RLS через прямой API-запрос без JWT → 0 строк).
□ После создания food_log карта пересчитывается, цифры сходятся с ручным расчётом по §6.
□ При удалении последнего inbody_log baseline переключается на предыдущий; при удалении всех — предложение пройти онбординг заново.
□ Цель: установка → сохранение в БД → отображение в карте (план, прогресс-бары) → редактирование → удаление.
□ Графики: линия «план» и «цель» отображаются, точки на графике соответствуют daily_history.
□ 3D-модель вращается мышью и тачем.
□ Мобильная вёрстка: нижняя навигация, модалки снизу, safe-area-inset.
□ Тосты об успехе/ошибке на всех мутациях.
□ Loading-скелетоны на всех запросах; error state с retry при падении Supabase.
□ Валидация форм: пустые поля, отрицательные числа, пустая дата — показывают ошибки, не пишут в БД.
□ supabase gen types → типы совпадают со схемой; нет any в хуках.
□ Unit-тесты на simulateDay (эталонный день → ожидаемые значения ±0.01).
□ npm run build без warnings, tsc --noEmit чистый.
□ Lighthouse mobile ≥ 85.
15. Что НЕ делать
❌ Не использовать localStorage для данных (только Supabase Auth session — это делает SDK).

❌ Не хранить вес/% жира/% мышц в profiles — они живут в inbody_logs (baseline = latest).

❌ Не дублировать расчёт TDEE на сервере — он лёгкий и детерминированный, достаточно клиента. daily_history при желании считать edge-функцией по расписанию (cron 00:05), но это опционально.

❌ Не менять формулы «на глазок» — цифры в UI должны 1:1 совпадать с прототипом.

❌ Не выносить секретный ключ Supabase во фронт.

❌ Не делать real-time подписки, если не требуется — это усложняет код. Достаточно invalidateQueries после мутаций.

❌ Не забывать про onAuthStateChange (иначе после logout останутся данные).

16. Опциональные улучшения (не блокируют MVP)
Экспорт данных в CSV.

Push-уведомления (если развернуть PWA).

Импорт InBody по фото (OCR) — Supabase Storage + edge-функция.

Дневник настроения/самочувствия.

Реалтайм-синхронизация между устройствами (Supabase Realtime на food_logs, activities).

Тёмная/светлая тема (сейчас только тёмная).

i18n (ru → en).

17. Ссылка на прототип
Исходный HTML-файл MetaBol.txt прилагается рядом с этим README. Он содержит:

Полный CSS (скопировать без изменений или перевести на Tailwind 1:1).

Полные React-компоненты (переписать на TS + разбить по папкам).

Полные математические функции (§6) — не менять.

Three.js-сцену (§8.3) — не менять геометрию и материалы.

Приоритет: сначала инфраструктура (Supabase + auth + RLS), потом перенос логики, потом UI 1:1, в конце — тесты и деплой.

Удачи. Если что-то в спецификации неоднозначно — выбирай более простое production-решение и оставляй комментарий // DECISION: в коде.
