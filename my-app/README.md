# 아이콘 컴포넌트 테스터

React 아이콘 컴포넌트와, 그 아이콘들을 눈으로 검증하는 테스트 페이지입니다.
79개 라인 아이콘(24×24 그리드)이 기본 포함되어 있습니다.

## 실행 방법

### 1. 바로 열어보기 — 설치 불필요

`standalone.html` 을 더블클릭하면 끝입니다.
(React·Babel 을 unpkg CDN 에서 불러오므로 인터넷 연결이 필요합니다.)

### 2. Vite 개발 서버 — 실무 작업용

```bash
npm install
npm run dev
```

| 명령                 | 설명                              |
| -------------------- | --------------------------------- |
| `npm run dev`        | 개발 서버 (http://localhost:5173) |
| `npm run build`      | `dist/` 로 프로덕션 빌드          |
| `npm run standalone` | `standalone.html` 재생성          |

## 데이터 저장 위치

화면에서 추가·수정한 내용(아이콘 · 태그 · 분류 이동 · 삭제 기록 · 이미지 라벨)은 두 곳 중
하나에 저장됩니다.

| 설정 | 저장 위치 | 범위 |
| ---- | --------- | ---- |
| 기본 | 브라우저 **localStorage** | 이 브라우저에서만 |
| `.env.local` 에 Supabase 키 입력 | **Supabase** (원격 DB) | 모든 기기·모든 방문자 |

Supabase 를 켜면 첫 화면은 localStorage 값으로 즉시 그리고, 곧바로 원격 값을 받아 덮어씁니다.
연결이 없거나 실패해도 localStorage 로 계속 동작합니다. 설정 방법은
[supabase/README.md](supabase/README.md) 를 보세요.

> 테마(다크/라이트)는 기기별 설정이라 항상 localStorage 에만 저장됩니다.
> `standalone.html` 은 Supabase 를 쓰지 않고 항상 localStorage 로 동작합니다.

## 파일 구조

```
my-app/
├─ standalone.html      ← 더블클릭 실행 (자동 생성물, 직접 수정 금지)
├─ build-standalone.js  ← src/ → standalone.html 생성기
├─ index.html           ← Vite 진입점
├─ .env.example         ← Supabase 키 서식 (.env.local 로 복사해서 사용)
├─ supabase/            ← 원격 저장소 설정
│  ├─ README.md            ← 프로젝트 생성 · 연결 방법
│  └─ migrations/
│     └─ 0001_init.sql     ← 테이블 · RLS 정책
├─ package.json
├─ vite.config.js
├─ icon/                ← cafe On 이미지 아이콘 (GIF·PNG·SVG 등)
│  ├─ home.gif
│  └─ ...
└─ src/
   ├─ app/                 ← 앱 셸: 상태·조립·전역 설정
   │  ├─ main.jsx             ← 진입점 (createRoot)
   │  ├─ App.jsx              ← 검색·필터·선택 상태를 들고 컴포넌트를 조립
   │  ├─ constants.js         ← 분류 목록 · 색상 프리셋 · 기본값
   │  └─ hooks.js             ← useTheme · useToast · useCustomTags
   ├─ components/          ← 화면 조각 (상태는 props 로만 받음)
   │  ├─ Icon.jsx             ← ★ 재사용 아이콘 컴포넌트
   │  ├─ Masthead.jsx         ← 헤더 + 테마 전환
   │  ├─ Toolbar.jsx          ← 검색 · 크기/두께/색상 · 분류 칩
   │  ├─ IconGrid.jsx         ← 아이콘 그리드 + 빈 상태(EmptyState)
   │  ├─ DetailPanel.jsx      ← 라인 아이콘 상세
   │  ├─ AssetPanel.jsx       ← cafe On 이미지 아이콘 상세
   │  ├─ BgPicker.jsx         ← 미리보기 배경 선택
   │  ├─ TagEditor.jsx        ← 태그 추가·삭제
   │  ├─ ExportBox.jsx        ← 크기 변환 · 내보내기
   │  ├─ CodeBlock.jsx        ← 복사 버튼이 달린 코드 블록
   │  ├─ DropOverlay.jsx      ← 드래그 앤 드롭 안내
   │  └─ Toast.jsx            ← 알림
   ├─ data/                ← 데이터
   │  ├─ icons.js             ← 아이콘 데이터셋 (단일 소스)
   │  ├─ customIcons.js       ← 화면에서 추가한 아이콘 레지스트리
   │  ├─ animatedIcons.js     ← icon/ 폴더 자동 수집
   │  └─ store/               ← 저장소 (로컬 · 원격)
   │     ├─ index.js             ← 설정에 따라 로컬/원격 선택
   │     ├─ localStore.js        ← localStorage
   │     └─ supabaseStore.js     ← Supabase 읽기·쓰기
   ├─ lib/                 ← UI 와 무관한 순수 유틸
   │  ├─ supabase.js          ← Supabase 연결 설정 (REST)
   │  ├─ svgImport.js         ← 붙여넣은 SVG → 아이콘 변환
   │  ├─ assetUtils.js        ← GIF 파싱 · 에셋 로더 · 리사이즈/내보내기
   │  ├─ clipboard.js         ← 복사 (file:// 폴백 포함)
   │  └─ stage.js             ← 미리보기 배경 · 대비 글자색 계산
   └─ styles/
      └─ styles.css        ← 두 버전이 공유
```

> 아이콘 데이터는 `src/data/icons.js` 하나뿐입니다. standalone 은
> `build-standalone.js` 가 이 파일을 그대로 인라인하므로, 수정 후
> `npm run standalone` 만 실행하면 됩니다.

## Icon 컴포넌트 사용법

```jsx
import Icon from './components/Icon';

<Icon name="search" />
<Icon name="loader" size={20} spin />
<Icon name="trash" color="#dc2626" strokeWidth={2} title="삭제" />
<Icon name="chevron-right" size={16} rotate={90} />
```

| prop                  | 기본값         | 설명                                              |
| --------------------- | -------------- | ------------------------------------------------- |
| `name`                | (필수)         | 아이콘 이름                                       |
| `size`                | `24`           | px 크기. `"1em"` 을 주면 글자 크기를 따라감       |
| `strokeWidth`         | `1.75`         | 선 두께                                           |
| `color`               | `currentColor` | 기본값은 부모의 글자색을 상속                     |
| `title`               | –              | 있으면 `role="img"`, 없으면 `aria-hidden`(장식용) |
| `spin` / `pulse`      | `false`        | 회전 / 깜빡임 애니메이션                          |
| `rotate` / `flip`     | `0` / –        | 회전 각도, `'x' \| 'y' \| 'xy'` 반전              |
| `absoluteStrokeWidth` | `false`        | 크기가 커져도 선 두께를 24px 기준으로 고정        |

`toSvgString(name, opts)` 로 독립 SVG 문자열도 얻을 수 있습니다.

## 테스트 페이지 기능

- **검색** — 이름·태그·분류 통합 검색 (`/` 키로 검색창 포커스)
- **분류 필터** — 전체 / **cafe On** / 인터페이스 / 액션 / 방향 / 상태 / 미디어 / 파일 /
  커뮤니케이션 / 커머스 / 기타
- **cafe On** — `icon/` 폴더의 이미지 아이콘 묶음. 옆의 **파일 추가** 버튼을 누르거나
  페이지 아무 곳에나 파일을 끌어다 놓으면 목록에 들어가고, 라인 아이콘과 같은 그리드에서
  크기·배경을 바꿔가며 비교할 수 있습니다. 클릭하면 `<img>` / JSX 코드를 복사할 수 있습니다.
- **실시간 조절** — 크기 12~96px, 선 두께 0.5~3, 색상(프리셋 + 컬러픽커)
- **8px 그리드 오버레이** — 선이 픽셀 격자에 맞는지 확인
- **다크 모드** — 설정은 localStorage 에 저장
- **상세 패널** — 아이콘 클릭 시 오른쪽에서 슬라이드로 열립니다. 확대 미리보기,
  회전·반전·애니메이션 토글, 크기별(12~64px) 렌더링 비교, JSX·SVG 코드 복사 (`Esc` 로 닫기)
- **배경 테스트** — 상세 패널 안에서 미리보기 배경을 투명(체커) / 흰색 / 회색 / 검정 /
  브랜드 / 사진 6종 중에 고르거나 **직접** 색을 지정할 수 있습니다. 직접 지정 시 배경 밝기를
  계산해 글자색을 자동으로 맞추므로, `currentColor` 아이콘이 어떤 배경에서든 보이는지
  그대로 확인할 수 있습니다.
- **SVG 아이콘 추가** — 툴바의 **+ SVG 아이콘 추가** 버튼으로 코드를 붙여넣거나 `.svg` 파일을
  선택하면 라인 아이콘으로 바로 등록됩니다. `<svg>` 껍데기와 `fill`·`stroke` 속성을 자동으로
  걷어내고, `viewBox` 가 24×24 가 아니면 배율을 계산해 맞춥니다. 추가하기 전에 대화상자 안에서
  **선 두께(0.5~3)와 색상을 바꿔가며** 16·24·32·48px 미리보기로 확인할 수 있습니다.
  채움(fill) 아이콘은
  `currentColor` 로 칠하도록 처리하고, 스크립트·이벤트 핸들러는 제거합니다. 추가한 아이콘은
  툴바의 색상·두께 조절이 그대로 적용되고 이 브라우저(localStorage)에 저장되며, 상세 패널에서
  삭제할 수 있습니다. **icons.js 에 넣을 코드**가 함께 만들어지므로 소스에 영구 반영도 쉽습니다.
- **이름 수정** — 상세 패널 제목 옆의 연필 버튼으로 아이콘 이름을 바꿀 수 있습니다.
  이름은 곧 `<Icon name="…" />` 의 키라서, 새 이름으로 다시 등록하고 붙여 둔 태그·분류를
  함께 옮깁니다. 기본 아이콘은 `src/data/icons.js` 를 고칠 수 없으므로 원본을 **숨김** 으로
  넣어 두므로 언제든 되돌릴 수 있습니다. 중복된 이름과 잘못된 문자는 입력 단계에서 막습니다.
  cafe On 이미지 아이콘도 같은 자리에서 **표시 이름(라벨)** 을 바꿀 수 있습니다. 파일명은
  그대로 두고 목록·검색·코드 조각·내보내기 파일명에 쓰이는 이름만 바뀌며, 한글도 쓸 수
  있습니다. 원래 파일명을 다시 입력하면 되돌아갑니다.
- **아이콘 삭제 · 복원** — 상세 패널의 **삭제** 버튼으로 아이콘을 목록에서 없앨 수 있습니다.
  기본 아이콘과 `icon/` 폴더의 이미지는 소스를 건드리지 않고 **감추는** 방식이라, 툴바에 나타나는
  **숨김** 칩에서 하나씩 또는 **모두 복원**으로 되돌릴 수 있습니다. 화면에서 추가한 아이콘과
  드래그해 넣은 파일은 되돌릴 수 없으므로 **한 번 더 확인**한 뒤 완전히 삭제됩니다.
  삭제한 아이콘은 검색·분류·개수에서 모두 빠집니다.
- **분류 이동** — 상세 패널의 **분류** 항목에서 아이콘을 다른 분류로 옮길 수 있습니다.
  드롭다운에서 기존 분류를 고르거나 **+ 새 분류 만들기**로 없던 분류를 만들 수 있고,
  옮기는 즉시 상단 필터 칩의 개수와 목록에 반영됩니다. **되돌리기** 버튼으로 언제든
  `src/data/icons.js` 의 기본 분류로 되돌아갑니다. 변경 내용은 이 브라우저(localStorage)에
  저장되며, **icons.js 용 category 복사** 버튼으로 소스에 영구 반영할 수 있습니다.
  cafe On 이미지 아이콘도 같은 방식으로 일반 분류에 넣을 수 있습니다.
- **태그 편집** — 상세 패널에서 검색용 태그를 직접 추가할 수 있습니다.
  Enter 로 추가, 쉼표로 여러 개 한 번에, `×` 로 삭제. 추가한 태그는 이 브라우저
  (localStorage)에 저장되고 검색에 바로 반영됩니다. `src/data/icons.js` 의 기본 태그는 고정이며,
  **icons.js 용 tags 복사** 버튼으로 `tags: [...]` 배열을 만들어 소스에 영구 반영할 수
  있습니다. cafe On 의 이미지 아이콘에도 같은 방식으로 태그를 붙일 수 있습니다.

### cafe On — 이미지 아이콘

`icon/` 폴더의 GIF·APNG·WebP·SVG·PNG 를 자동으로 읽어 그리드에 함께 보여줍니다.
페이지에 파일을 **끌어다 놓으면** 폴더에 넣지 않고도 즉시 테스트할 수 있습니다
(브라우저 안에서만 처리되며 업로드되지 않습니다).

이미지 아이콘을 클릭하면 상세 패널에서 아래를 확인할 수 있습니다.

- **크기별 렌더링** — 16 · 20 · 24 · 32 · 48 · 64px 동시 비교
- **배경 테스트** — 라인 아이콘과 동일한 6종 프리셋 + 직접 색 지정
- **처음부터 재생** — Blob URL 재발급 방식이라 애니메이션이 확실히 리셋됩니다
- **메타데이터** — GIF 헤더를 직접 파싱해 원본 해상도, 파일 용량, 프레임 수, 재생 시간 표시
- **크기 변환 · 내보내기** — 목표 픽셀(8~512px)과 배율(@1x/@2x/@3x), 형식(PNG/WebP)을
  정하면 원본을 그 크기로 **다시 렌더링**해 결과 용량과 미리보기를 보여주고 바로 내려받습니다.
  640px 원본을 24px 로 화면에서 줄여 보는 것과 달리 실제 24px 파일이 만들어집니다.
  비율은 유지한 채 정사각형 캔버스 가운데 배치되며,
  **애니메이션은 유지되지 않고 정지 이미지 한 장으로 저장**됩니다.

> `file://` 로 열면 브라우저 보안 정책상 `fetch` 가 막혀 메타데이터·변환 기능이
> 제한됩니다. 이때는 파일을 페이지에 드래그하거나 `npm run dev` 로 실행하세요.

## 아이콘 추가하기

`src/data/icons.js` 에 항목을 추가합니다.

```js
'my-icon': {
  category: '기타',
  tags: ['검색용', '키워드'],
  // 24×24 viewBox 기준, fill/stroke 속성은 컴포넌트가 넣으므로 생략
  body: '<path d="M4 12h16"/><circle cx="12" cy="12" r="8"/>',
},
```

그 다음 `npm run standalone` 으로 standalone.html 을 다시 만듭니다.

배포
길 B — 터미널에서 (막히면 이쪽, 2분)
웹에서 계속 막히면 이게 확실합니다. VSCode 터미널에 그대로 입력하세요.

cd my-app
npx vercel
처음 실행하면 질문이 순서대로 나옵니다. 이렇게 답하세요:

질문 답
Set up and deploy "…my-app"? y + Enter
Which scope do you want to deploy to? Enter (본인 계정)
Link to existing project? n + Enter
What's your project name? Enter (my-app 그대로) 또는 원하는 이름
In which directory is your code located? Enter (./ 그대로)
Want to modify these settings? n + Enter
맨 처음에는 로그인 안내가 뜹니다. 브라우저가 열리면 GitHub으로 로그인 승인만 해주세요.

끝나면 터미널에 배포 주소가 찍힙니다. 정식 배포는:

npx vercel --prod
이 방법은 my-app 폴더 안에서 실행하니까 Root Directory 문제도 없고, GitHub 연동 문제도 안 겪습니다.

둘 중 편한 쪽으로 해보시고, 화면에 나온 내용(에러든 성공이든)을 그대로 알려주세요. 길 B로 하신다면 터미널 출력을 복사해 붙여주시면 바로 다음 단계 짚어드리겠습니다.

길 B 로 베포하는 방법을 한 단계식 알려줘
CLI 배포를 처음부터 끝까지 안내드릴게요. 먼저 환경을 확인해두겠습니다.

Bash Check node and pre-fetch vercel CLI
IN
cd "d:/HTML/아이콘 컴포넌트/my-app" && node -v && timeout 180 npx --yes vercel --version 2>&1 | tail -3

OUT
v24.14.1
Vercel CLI 59.0.0
59.0.0
Edit d:\HTML\아이콘 컴포넌트\my-app\.gitignore
Added 1 line
준비는 제가 미리 해뒀습니다. 아래 순서대로만 따라오시면 됩니다.

0단계 — 준비 완료 (제가 확인함)
항목 상태
Node.js ✅ v24.14.1
Vercel CLI ✅ v59.0.0 — 미리 받아뒀으니 설치 대기 없음
빌드 정상 동작 ✅ npm run build 성공 확인
.vercel 폴더 git 제외 ✅ .gitignore에 추가해둠
1단계 — 터미널에서 my-app 폴더로 이동
VSCode 터미널에 입력:

cd "D:\HTML\아이콘 컴포넌트\my-app"
확인 방법: 프롬프트 끝이 ...\my-app> 으로 바뀌면 성공입니다.

PS D:\HTML\아이콘 컴포넌트\my-app>
⚠️ 이 폴더 안에서 실행하는 게 핵심입니다. 그래야 Root Directory 문제가 아예 안 생깁니다.

2단계 — Vercel 로그인

npx vercel login
이런 목록이 나옵니다:

? Log in to Vercel
❯ Continue with GitHub
Continue with GitLab
Continue with Bitbucket
Continue with Email
Continue with SAML Single Sign-On
↑ ↓ 화살표 키로 Continue with GitHub 선택 → Enter
브라우저가 자동으로 열립니다 → Authorize / 승인 클릭
터미널에 아래가 뜨면 성공:

> Success! GitHub authentication complete
> Congratulations! You are now logged in.
> 브라우저가 안 열리면, 터미널에 나온 주소를 직접 복사해서 브라우저에 붙여넣으세요.

3단계 — 배포 실행

npx vercel
질문이 순서대로 나옵니다. 표대로만 답하세요:

순서 화면에 나오는 질문 입력
1 Set up and deploy "D:\...\my-app"? y → Enter
2 Which scope do you want to deploy to? 그냥 Enter (본인 계정 선택됨)
3 Link to existing project? n → Enter
4 What's your project name? 그냥 Enter (my-app) — 원하는 이름을 써도 됨
5 In which directory is your code located? 그냥 Enter (./)
6 Want to modify these settings? n → Enter
6번에서 이런 화면이 먼저 뜹니다. Vite로 잘 잡혔는지만 눈으로 확인하고 n 누르시면 됩니다.

Auto-detected Project Settings (Vite):

- Build Command: npm run build
- Output Directory: dist
- Development Command: vite --port $PORT
  4단계 — 결과 확인
  빌드가 돌아가고 이렇게 끝납니다:

🔍 Inspect: https://vercel.com/jaccko/my-app/xxxxx
✅ Preview: https://my-app-xxxxx.vercel.app [30s]
Preview: 뒤의 주소를 브라우저에 붙여넣으면 아이콘 테스터가 뜹니다. (터미널에서 주소를 Ctrl + 클릭해도 열립니다.)

여기까지가 미리보기 배포입니다.

5단계 — 정식(프로덕션) 배포
미리보기가 잘 뜨는 걸 확인했으면:

npx vercel --prod

✅ Production: https://my-app.vercel.app [25s]
이 주소가 남들에게 공유할 최종 주소입니다. 끝났습니다.

앞으로 코드를 고쳤을 때

cd "D:\HTML\아이콘 컴포넌트\my-app"
npx vercel --prod
이 두 줄이면 됩니다. (로그인은 한 번만 하면 계속 유지됩니다.)

막힐 때
증상 해결
Error: No existing credentials found 2단계 로그인부터 다시
Command "npm run build" exited with 1 빌드 실패 — 터미널 출력을 저에게 그대로 붙여주세요
질문이 안 나오고 바로 끝남 이미 링크된 상태. npx vercel --prod 로 바로 진행
화살표 선택이 안 먹힘 VSCode 터미널 대신 PowerShell 앱을 직접 열어서 시도
2단계부터 시작해서, 막히는 지점의 터미널 출력을 그대로 복사해 주세요. 바로 짚어드리겠습니다.

image.png
527×192
다음은?
로그인 완료됐습니다. 이제 배포만 하면 됩니다.

다음 — 이 명령 하나

npx vercel
나오는 질문에 이렇게 답하세요
질문 입력
Set up and deploy ...my-app? y → Enter
Which scope ...? 그냥 Enter
Link to existing project? n → Enter
What's your project name? 그냥 Enter
In which directory is your code located? 그냥 Enter
Want to modify these settings? n → Enter
마지막 질문 직전에 이 화면이 뜨는데, Vite 라고 잡혔는지만 확인하고 n 누르시면 됩니다.

Auto-detected Project Settings (Vite):

- Build Command: npm run build
- Output Directory: dist
  성공하면

✅ Preview: https://my-app-xxxxx.vercel.app [30s]
이 주소를 브라우저에서 열어 아이콘 테스터가 뜨는지 확인하고, 잘 나오면 마지막으로:

npx vercel --prod
이걸 실행하면 정식 주소가 나옵니다.

터미널 출력 그대로 보여주시면 이어서 봐드릴게요.

image.png
379×189
다음은?
화면이 CLI 최신 버전이라 조금 다르게 나왔네요. 확인부터:

Directory ...\my-app ✅ 맞습니다
Team jaccko ✅ 본인 계정 맞습니다
지금 할 것
↓ 아래 방향키를 한 번 눌러 Create a new project 로 옮긴 뒤 → Enter

? Which project?
Search all projects
❯ Create a new project ← 여기로 이동해서 Enter
Search all projects는 기존 프로젝트에 연결하는 메뉴입니다. 지금은 처음 만드는 거니 아래쪽을 골라야 합니다.

그 다음 이어질 질문
질문 입력
What's your project name? 그냥 Enter (my-app)
In which directory is your code located? 그냥 Enter (./)
Want to modify these settings? n → Enter
마지막 질문 전에 Auto-detected Project Settings (Vite) 가 뜨는지만 눈으로 확인하세요.

진행하시고 다음 화면 보여주세요.

image.png
356×233
어떻게 해야 하나?
실수로 Search all projects(기존 프로젝트 목록)로 들어가셨습니다. 지금 보이는 movie, fake-blog, mobile-nvitation은 예전에 만드신 프로젝트들이라 고르면 안 됩니다.

되돌아가기
↓ 아래 방향키를 계속 눌러 맨 아래 Back to project options 로 이동 → Enter

movie
fake-blog
mobile-nvitation
─────────────────────
❯ Back to project options ← 여기까지 내려서 Enter
그러면 처음 화면으로 돌아옵니다. 거기서:

Search all projects
❯ Create a new project ← 이번엔 이걸로 Enter
더 간단한 방법
헷갈리면 그냥 취소하고 다시 시작해도 됩니다.

Ctrl + C 눌러서 취소

npx vercel
Which project? 가 나오면 ↓ 한 번 눌러 Create a new project → Enter
💡 핵심: 첫 화면에서 Enter를 바로 누르지 말고, 반드시 ↓ 한 번 누른 뒤 Enter 입니다.

이후 질문은 전부 Enter, 마지막 Want to modify these settings? 만 n 입니다.

image.png
440×172
다음은?
거의 다 왔습니다. 지금은 프로젝트 이름을 묻고 있습니다. 괄호 안 (my-app)이 기본값입니다.

지금 할 것
이 이름이 곧 배포 주소가 됩니다 (https://이름.vercel.app). 둘 중 하나 고르세요:

선택 방법 결과 주소
그대로 쓰기 그냥 Enter my-app-xxxx.vercel.app
이름 바꾸기 (추천) icon-tester 입력 후 Enter icon-tester.vercel.app
my-app은 너무 일반적이라 나중에 프로젝트가 늘면 헷갈립니다. icon-tester 정도를 추천드립니다.

이름 규칙: 영문 소문자 · 숫자 · 하이픈(-)만 됩니다. 한글·공백·대문자는 안 됩니다.

이어서 나올 질문
질문 입력
In which directory is your code located? 그냥 Enter (./)
Want to modify these settings? n → Enter
두 번째 질문 직전에 이게 뜨는지만 확인하세요:

Auto-detected Project Settings (Vite):

- Build Command: npm run build
- Output Directory: dist
  Vite로 안 잡히고 Other로 나오면 그때는 n 대신 y 를 누르고 알려주세요.

그 뒤엔 자동으로 빌드가 돌아가고 ✅ Preview: https://... 주소가 나옵니다.

image.png
493×216
다음은?
완벽합니다. Detected Vite 로 정확히 잡혔고, Build Command와 Output Directory(dist)도 맞습니다.

지금 할 것
n 입력 후 Enter

(y/N) 에서 대문자 N이 기본값이라 그냥 Enter만 눌러도 동일하게 넘어갑니다.

그 다음 자동으로 진행됩니다

🔍 Inspect: https://vercel.com/jaccko/icon-tester/xxxxx
⠙ Building...
✅ Preview: https://icon-tester-xxxxx.vercel.app [30s]
빌드에 20~40초 정도 걸립니다.

Preview: 주소를 브라우저에서 열어 아이콘 테스터가 제대로 뜨는지 확인하세요. (터미널에서 Ctrl + 클릭해도 열립니다.)

확인 후 마지막 단계
미리보기가 잘 뜨면 정식 배포:

npx vercel --prod
여기서 나오는 ✅ Production: 주소가 최종 공유용 주소입니다.

결과 화면 보여주세요.
