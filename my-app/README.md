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

## 파일 구조

```
my-app/
├─ standalone.html      ← 더블클릭 실행 (자동 생성물, 직접 수정 금지)
├─ build-standalone.js  ← src/ → standalone.html 생성기
├─ index.html           ← Vite 진입점
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
   │  └─ animatedIcons.js     ← icon/ 폴더 자동 수집
   ├─ lib/                 ← UI 와 무관한 순수 유틸
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
