-- =====================================================================
-- 가치작명소: 관리자 화면에서 한자 추가 · 제보 처리 완료 기록하기
-- (Supabase → SQL Editor에 붙여넣고 Run, 한 번만 하면 됩니다)
-- ⚠️ 아래 'admin@example.com' 4곳을 관리자 로그인 이메일(setup.sql에 넣었던 것과 같은 이메일)로 바꾼 뒤 실행하세요.
-- =====================================================================

-- 1) 관리자가 추가한 한자: 앱이 열릴 때 읽어 가서 한자 목록에 합치고, 상단 공지도 만듭니다
create table if not exists public.hanja_extra (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  ch          text not null check (char_length(ch) = 1),
  eum         text not null check (eum ~ '^[가-힣]$'),
  hun         text not null check (char_length(hun) between 1 and 12),
  strokes     int  not null check (strokes between 1 and 64),
  elem        text not null check (elem in ('木', '火', '土', '金', '水')),
  radical     int  check (radical between 1 and 214),
  meaning     text check (char_length(meaning) <= 40),
  notice      boolean not null default true,
  unique (ch, eum)
);
alter table public.hanja_extra enable row level security;

drop policy if exists "anyone can read" on public.hanja_extra;
create policy "anyone can read" on public.hanja_extra
  for select to anon, authenticated using (true);          -- 앱 사용자 누구나 읽기만 가능

drop policy if exists "admin can write" on public.hanja_extra;
create policy "admin can write" on public.hanja_extra
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com')         -- ← 본인 이메일로 바꾸기
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');   -- ← 본인 이메일로 바꾸기

grant select on public.hanja_extra to anon, authenticated;
grant insert, update, delete on public.hanja_extra to authenticated;

-- 2) 제보 '처리 완료' 표시: 휴대폰·PC 어디서 봐도 같게 서버에 보관 (관리자만 읽고 쓰기)
create table if not exists public.report_done (
  key         text primary key check (char_length(key) <= 40),
  created_at  timestamptz not null default now()
);
alter table public.report_done enable row level security;

drop policy if exists "admin only" on public.report_done;
create policy "admin only" on public.report_done
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com')         -- ← 본인 이메일로 바꾸기
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');

grant select, insert, delete on public.report_done to authenticated;
