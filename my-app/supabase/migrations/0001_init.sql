-- 아이콘 컴포넌트 테스터 — 초기 스키마
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 내용을 붙여넣고 Run
--
-- ⚠ 접근 정책: 로그인 없이 "누구나 읽기·쓰기" 입니다.
--    주소와 anon key 를 아는 사람은 누구나 아이콘을 고치거나 지울 수 있습니다.
--    외부에 공개하는 서비스라면 supabase/README.md 의 '권한 조이기' 를 참고하세요.

-- ── 화면에서 추가한 아이콘 ────────────────────────────
create table if not exists public.icons (
  name       text primary key,
  category   text        not null default '기타',
  tags       text[]      not null default '{}',
  body       text        not null,
  scale      real,                                  -- 24×24 로 맞출 때 쓴 배율 (선 두께 보정용)
  updated_at timestamptz not null default now()
);

-- ── 사용자 설정 (태그 · 분류 이동 · 삭제 · 이미지 라벨) ──
--    kind 로 종류를 나누고 key 는 아이콘 이름 또는 "@파일명"
create table if not exists public.icon_overrides (
  kind       text        not null check (kind in ('tag', 'category', 'hidden', 'label')),
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (kind, key)
);

create index if not exists icon_overrides_kind_idx on public.icon_overrides (kind);

-- ── RLS ───────────────────────────────────────────────
alter table public.icons          enable row level security;
alter table public.icon_overrides enable row level security;

drop policy if exists "icons_read"      on public.icons;
drop policy if exists "icons_insert"    on public.icons;
drop policy if exists "icons_update"    on public.icons;
drop policy if exists "icons_delete"    on public.icons;
create policy "icons_read"   on public.icons for select using (true);
create policy "icons_insert" on public.icons for insert with check (true);
create policy "icons_update" on public.icons for update using (true) with check (true);
create policy "icons_delete" on public.icons for delete using (true);

drop policy if exists "overrides_read"   on public.icon_overrides;
drop policy if exists "overrides_insert" on public.icon_overrides;
drop policy if exists "overrides_update" on public.icon_overrides;
drop policy if exists "overrides_delete" on public.icon_overrides;
create policy "overrides_read"   on public.icon_overrides for select using (true);
create policy "overrides_insert" on public.icon_overrides for insert with check (true);
create policy "overrides_update" on public.icon_overrides for update using (true) with check (true);
create policy "overrides_delete" on public.icon_overrides for delete using (true);
