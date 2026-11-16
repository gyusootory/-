-- =====================================================================
-- 가치작명소: 가족 투표 (저장한 이름 후보를 링크로 보내고, 가족이 ♥로 투표)
-- Supabase → SQL Editor에 붙여넣고 Run (한 번만, 이메일 바꿀 곳 없음)
--
-- 보안 설계
--  · 표(vote_lists, vote_marks)는 앱 사용자가 직접 읽거나 쓸 수 없음 (정책 없음 = 모두 차단)
--  · 아래 함수 3개로만 접근: 투표판 만들기 / 링크 아이디로 그 투표판 하나 읽기 / ♥ 누르기·취소
--  · 링크 아이디는 추측할 수 없는 22자 무작위 문자 → 링크를 받은 사람만 볼 수 있음
--  · 생년월일 등은 저장하지 않음 (이름·한자·점수·뜻풀이·투표한 사람 별명만)
--  · 만든 지 180일 지난 투표판은 새 투표판이 만들어질 때 자동 삭제
-- =====================================================================

create table if not exists public.vote_lists (
  id          text primary key check (id ~ '^[A-Za-z0-9_-]{16,32}$'),
  created_at  timestamptz not null default now(),
  title       text check (char_length(title) <= 30),
  names       jsonb not null check (jsonb_typeof(names) = 'array' and jsonb_array_length(names) between 1 and 30 and pg_column_size(names) < 20000)
);
create table if not exists public.vote_marks (
  list_id     text not null references public.vote_lists(id) on delete cascade,
  voter       text not null check (char_length(voter) between 1 and 12),
  name_key    text not null check (char_length(name_key) between 1 and 12),
  created_at  timestamptz not null default now(),
  primary key (list_id, voter, name_key)
);
alter table public.vote_lists enable row level security;
alter table public.vote_marks enable row level security;
revoke all on public.vote_lists, public.vote_marks from anon, authenticated;

-- 1) 투표판 만들기
create or replace function public.vote_create(p_id text, p_title text, p_names jsonb)
returns text language plpgsql security definer set search_path = public as $$
begin
  delete from vote_lists where created_at < now() - interval '180 days';
  insert into vote_lists (id, title, names) values (p_id, nullif(left(coalesce(p_title, ''), 30), ''), p_names);
  return p_id;
end $$;

-- 2) 링크 아이디로 투표판 하나 읽기 (후보 + 누가 어떤 이름에 ♥ 했는지)
create or replace function public.vote_get(p_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'title', l.title, 'names', l.names, 'created_at', l.created_at,
    'marks', coalesce((select jsonb_agg(jsonb_build_object('v', m.voter, 'k', m.name_key) order by m.created_at)
                       from vote_marks m where m.list_id = l.id), '[]'::jsonb))
  from vote_lists l where l.id = p_id;
$$;

-- 3) ♥ 누르기(p_on = true) / 취소(false) · 후보에 있는 이름만, 한 투표판에 투표하는 사람은 20명까지
create or replace function public.vote_toggle(p_id text, p_voter text, p_key text, p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select exists (select 1 from vote_lists l, jsonb_array_elements(l.names) n where l.id = p_id and n->>'k' = p_key) into ok;
  if not ok then return false; end if;
  if p_on then
    if (select count(distinct voter) from vote_marks where list_id = p_id and voter <> p_voter) >= 20 then return false; end if;
    insert into vote_marks (list_id, voter, name_key) values (p_id, left(p_voter, 12), p_key) on conflict do nothing;
  else
    delete from vote_marks where list_id = p_id and voter = p_voter and name_key = p_key;
  end if;
  return true;
end $$;

revoke all on function public.vote_create(text, text, jsonb), public.vote_get(text), public.vote_toggle(text, text, text, boolean) from public;
grant execute on function public.vote_create(text, text, jsonb), public.vote_get(text), public.vote_toggle(text, text, text, boolean) to anon, authenticated;
