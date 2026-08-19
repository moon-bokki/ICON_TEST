# Supabase 연동

아이콘·태그·분류·삭제 기록·이미지 라벨을 브라우저가 아니라 **Supabase(원격 DB)** 에 저장합니다.
설정하지 않으면 앱은 지금처럼 **localStorage 만** 사용하므로, 연결 전에도 그대로 동작합니다.

```
설정 없음  →  브라우저에만 저장 (기기·브라우저마다 따로)
설정 있음  →  Supabase 에 저장 (모든 기기·모든 방문자가 같은 목록)
```

## 1. 프로젝트 만들기

1. https://supabase.com 가입 → **New project**
2. 이름·비밀번호·리전(Seoul 권장) 입력 → 생성까지 1~2분

## 2. 테이블 만들기

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. [`migrations/0001_init.sql`](migrations/0001_init.sql) 내용을 통째로 붙여넣기
3. **Run** — `icons`, `icon_overrides` 두 테이블과 접근 정책이 만들어집니다

## 3. 키 넣기

**Project Settings → API** 에서 두 값을 복사합니다.

| Supabase 화면 | .env.local 항목 |
| ------------- | --------------- |
| Project URL   | `VITE_SUPABASE_URL` |
| anon public   | `VITE_SUPABASE_ANON_KEY` |

프로젝트 루트(`my-app/`)에서:

```bash
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
```

`.env.local` 을 열어 두 값을 채우고 개발 서버를 **다시 시작**합니다 (환경변수는 재시작해야 반영).

```bash
npm run dev
```

## 4. 배포에도 적용

Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables** 에 같은 두 값을 추가한 뒤
다시 배포합니다.

```bash
npx vercel --prod
```

## 데이터 구조

| 테이블 | 내용 |
| ------ | ---- |
| `icons` | 화면에서 추가한 아이콘 (`name`, `category`, `tags`, `body`, `scale`) |
| `icon_overrides` | 그 밖의 설정. `kind` 로 구분 — `tag` · `category` · `hidden` · `label` |

## 동작 방식

1. 첫 화면은 **localStorage 값으로 즉시** 그립니다 (네트워크를 기다리지 않음)
2. 곧바로 Supabase 에서 최신 값을 받아 덮어씁니다
3. 이후 변경은 localStorage 와 Supabase 양쪽에 씁니다

원격을 다 받아오기 전에는 밀어 올리지 않으므로, 접속하자마자 남의 데이터를 덮어쓰는 일은 없습니다.
네트워크가 끊기면 알림이 뜨고 로컬 저장은 계속됩니다.

## ⚠ 권한 조이기

현재 정책은 **로그인 없이 누구나 읽고 쓰기** 입니다. 주소와 anon key 를 아는 사람은
누구나 아이콘을 고치거나 지울 수 있습니다. 사내용이면 충분하지만, 공개 서비스라면
쓰기만 로그인 사용자로 제한하세요.

```sql
-- 예: 읽기는 누구나, 쓰기는 로그인한 사용자만
drop policy "icons_insert" on public.icons;
drop policy "icons_update" on public.icons;
drop policy "icons_delete" on public.icons;
create policy "icons_insert" on public.icons for insert to authenticated with check (true);
create policy "icons_update" on public.icons for update to authenticated using (true) with check (true);
create policy "icons_delete" on public.icons for delete to authenticated using (true);
```

> `anon key` 는 브라우저에 노출되는 공개 키라 숨길 수 없습니다. 실제 보호는 RLS 정책이 합니다.
> `service_role` 키는 **절대** 프런트엔드에 넣지 마세요.
