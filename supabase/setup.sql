-- =====================================================================
-- 가치작명소 방문 통계 저장소 만들기 (Supabase → SQL Editor에 붙여넣고 Run)
-- ⚠️ 맨 아래 'admin@example.com'을 관리자로 쓸 본인 이메일로 바꾼 뒤 실행하세요.
-- =====================================================================

-- 1) 이벤트 기록 표: 방문·이름 추천·한자 찾기·공유 등을 한 줄씩 저장
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  event       text not null check (char_length(event) between 1 and 40),
  visitor     text not null check (char_length(visitor) <= 64),
  session     text check (char_length(session) <= 64),
  device      text check (device in ('mobile', 'desktop')),
  app_mode    text check (app_mode in ('web', 'app')),
  referrer    text check (char_length(referrer) <= 200),
  meta        jsonb not null default '{}'::jsonb check (pg_column_size(meta) < 2000)
);
create index if not exists events_created_at_idx on public.events (created_at desc);

-- 2) 보안 규칙(RLS): 누구나 '기록'만 할 수 있고, '조회'는 관리자 이메일로 로그인한 사람만
alter table public.events enable row level security;

drop policy if exists "anyone can insert" on public.events;
create policy "anyone can insert" on public.events
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read" on public.events;
create policy "admin can read" on public.events
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com');   -- ← 본인 이메일로 바꾸기

grant insert on public.events to anon, authenticated;
grant select on public.events to authenticated;
