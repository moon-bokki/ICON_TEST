/**
 * standalone.html 생성기
 *
 *   node build-standalone.js
 *
 * src/ 의 모듈들에서 import/export 구문만 걷어내 하나로 이어 붙여
 * 브라우저에서 바로 실행되는 단일 HTML 로 묶습니다.
 * 컴포넌트 코드를 고쳤다면 이 스크립트를 다시 실행해 주세요.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

/**
 * 묶을 파일 목록 — 위에서부터 순서대로 이어 붙인다.
 * 최상위 const 가 평가되는 순서가 곧 이 순서이므로 의존성 순서를 지킬 것.
 * (src/data/animatedIcons.js 는 Vite 전용 import.meta.glob 이라 제외하고,
 *  아래에서 icon/ 폴더를 직접 훑어 ANIMATED_ICONS 를 주입한다.
 *  src/app/main.jsx 도 마지막 render 호출로 대신한다.)
 */
const BUNDLE = [
  'src/data/icons.js',
  'src/lib/clipboard.js',
  'src/lib/stage.js',
  'src/lib/assetUtils.js',
  'src/app/constants.js',
  'src/app/hooks.js',
  'src/components/Icon.jsx',
  'src/components/CodeBlock.jsx',
  'src/components/BgPicker.jsx',
  'src/components/TagEditor.jsx',
  'src/components/ExportBox.jsx',
  'src/components/Toast.jsx',
  'src/components/DropOverlay.jsx',
  'src/components/Masthead.jsx',
  'src/components/Toolbar.jsx',
  'src/components/IconGrid.jsx',
  'src/components/DetailPanel.jsx',
  'src/components/AssetPanel.jsx',
  'src/app/App.jsx',
];

/** ESM 구문 제거 → Babel standalone(classic script)에서 실행 가능한 형태로 */
function stripModuleSyntax(src, label) {
  const out = src
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
    // import './styles.css';  → 삭제
    .replace(/^import\s+['"][^'"]+['"];\s*$/gm, '')
    // export default Icon;  → 삭제
    .replace(/^export default \w+;\s*$/gm, '')
    // export default (async) function X  → (async) function X
    .replace(/^export\s+default\s+(?=(?:async\s+)?function\b)/gm, '')
    // export (async) function / const / let / var / class  → 선언만 남김
    .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm, '')
    .trim();

  // 남은 모듈 구문이 있으면 standalone 이 통째로 죽는다 — 빌드에서 바로 잡는다
  const leftover = out
    .split('\n')
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => /^\s*(import|export)\b/.test(line));
  if (leftover.length) {
    throw new Error(
      `${label}: 처리하지 못한 모듈 구문이 남았습니다\n` +
        leftover.map(([n, l]) => `  ${n}: ${l.trim()}`).join('\n')
    );
  }
  return out;
}

function indent(src, n) {
  const pad = ' '.repeat(n);
  return src
    .split('\n')
    .map((l) => (l.trim() ? pad + l : l))
    .join('\n');
}

const modules = BUNDLE.map((path) => {
  const code = stripModuleSyntax(readFileSync(path, 'utf8'), path);
  return `    /* ───── ${path} ───── */\n${indent(code, 4)}`;
}).join('\n\n');

/** icon/ 폴더 스캔 — Vite 의 import.meta.glob 을 대신한다 */
const ASSET_EXT = /\.(gif|png|apng|webp|svg|avif|jpe?g)$/i;
const assets = existsSync('icon')
  ? readdirSync('icon')
      .filter((f) => ASSET_EXT.test(f))
      .sort()
      .map((f) => ({ name: f.replace(/\.[^.]+$/, ''), file: f, url: `icon/${f}` }))
  : [];
console.log(`icon/ 에셋 ${assets.length}개 포함`);

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>아이콘 컴포넌트 테스터 (standalone)</title>
  <link rel="stylesheet" href="src/styles/styles.css" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2' stroke-linecap='round'%3E%3Crect x='4' y='4' width='6.5' height='6.5' rx='1.5'/%3E%3Crect x='13.5' y='4' width='6.5' height='6.5' rx='1.5'/%3E%3Crect x='4' y='13.5' width='6.5' height='6.5' rx='1.5'/%3E%3Crect x='13.5' y='13.5' width='6.5' height='6.5' rx='1.5'/%3E%3C/svg%3E" />
</head>
<body>
  <div id="root"></div>

  <!-- ⚠ 이 파일은 build-standalone.js 가 생성합니다. 직접 수정하지 마세요.
       원본: src/ (app · components · data · lib · styles) -->

  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <script>
    // CDN 을 못 불러온 경우(오프라인 등) 안내
    window.addEventListener('load', function () {
      if (typeof React === 'undefined' || typeof Babel === 'undefined') {
        document.getElementById('root').innerHTML =
          '<div style="max-width:640px;margin:80px auto;padding:24px;border:1px solid #e2e5ea;' +
          'border-radius:12px;font-family:sans-serif;line-height:1.7">' +
          '<h1 style="font-size:18px;margin:0 0 8px">React CDN 을 불러오지 못했습니다</h1>' +
          '<p style="margin:0;color:#6b7280">standalone.html 은 unpkg.com 에서 React 와 Babel 을 ' +
          '내려받습니다. 인터넷 연결을 확인하거나, 사내망이라면 <code>npm install &amp;&amp; npm run dev</code> ' +
          '로 Vite 버전을 실행해 주세요.</p></div>';
      }
    });
  </script>

  <script type="text/babel" data-presets="react">
    const { forwardRef, useCallback, useEffect, useMemo, useRef, useState } = React;

    /* ───── src/data/animatedIcons.js 대체 — icon/ 폴더 (빌드 시점에 주입) ───── */
    const ANIMATED_ICONS = ${JSON.stringify(assets, null, 6).replace(/\n/g, '\n    ')};

${modules}

    /* ───── src/app/main.jsx 대체 ───── */
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
`;

writeFileSync('standalone.html', html);
console.log(`standalone.html 생성 완료 (${(html.length / 1024).toFixed(1)} KB)`);
