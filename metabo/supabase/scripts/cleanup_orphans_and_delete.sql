-- MetaBo: удаление пользователя «по-хорошему» из SQL Editor (Dashboard → SQL)
-- ────────────────────────────────────────────────────────────────────────────
-- ВАЖНО: удалять строки только из public.profiles НЕЛЬЗЯ — запись остаётся в
-- auth.users, и регистрация на тот же email падает ("User already registered").
-- Правильно: сначала удалить аккаунт (Dashboard → Authentication → Users → ⋮ → Delete,
-- либо скрипт scripts/delete-user.mjs через Admin API), затем этим скриптом
-- почистить осиротевшие строки, если они остались от прошлых «ручных» удалений.
--
-- Все таблицы имеют FK ... references auth.users(id) on delete cascade, поэтому
-- при корректном удалении аккаунта данные уходят сами. Ниже — страховка.
-- ────────────────────────────────────────────────────────────────────────────

begin;

-- 1) Осиротевшие профили (id отсутствует в auth.users) — например, после ручного удаления.
delete from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id);

-- 2) Осиротевшие данные во всех пользовательских таблицах.
delete from public.inbody_logs   where user_id not in (select id from auth.users);
delete from public.food_logs     where user_id not in (select id from auth.users);
delete from public.activities    where user_id not in (select id from auth.users);
delete from public.dishes        where user_id not in (select id from auth.users);
delete from public.goals         where user_id not in (select id from auth.users);
delete from public.daily_history where user_id not in (select id from auth.users);

commit;

-- ────────────────────────────────────────────────────────────────────────────
-- Если нужно удалить КОНКРЕТНОГО пользователя прямо отсюда (email должен быть
-- точным). Выполняйте этот блок отдельно, проверив SELECT перед DELETE:
--
-- select id from auth.users where email = 'user@example.com';   -- посмотреть
-- delete from auth.users where email = 'user@example.com';      -- удалит аккаунт,
--     -- каскадно уйдут profiles/inbody_logs/food_logs/activities/dishes/goals/daily_history
--
-- Примечание: delete from auth.users работает в SQL Editor (роль postgres имеет
-- права), но Dashboard → Authentication → Users делает то же самое безопаснее
-- (чистятся также refresh tokens / identities в схеме auth).
-- ────────────────────────────────────────────────────────────────────────────
