/**
 * 붙여넣은 SVG 코드를 icons.js 의 body 형식으로 변환
 *
 * - <svg> 껍데기를 벗기고 안쪽 도형만 남긴다
 * - fill/stroke 계열 속성을 걷어내 컴포넌트의 색·두께 조절이 먹도록 한다
 * - viewBox 가 24×24 가 아니면 transform 으로 자동 보정한다
 * - 붙여넣은 코드는 dangerouslySetInnerHTML 로 그려지므로 스크립트·이벤트 핸들러를 제거한다
 */

/** 렌더링에 넣으면 안 되는 요소 */
const UNSAFE_TAGS = 'script|foreignObject|iframe|style|animate|set|handler';
/** 의미 없는 메타 요소 */
const META_TAGS = 'title|desc|metadata';
/** 컴포넌트가 직접 지정하므로 지워야 하는 속성 */
const DROP_ATTRS =
  'fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-dasharray|' +
  'stroke-dashoffset|stroke-opacity|fill-opacity|opacity|class|id|style|xmlns(?::\\w+)?|' +
  'xml:\\w+|data-[\\w-]+|on\\w+';
/** 최소한 하나는 있어야 하는 도형 요소 */
const SHAPE_TAGS = /<\s*(path|circle|rect|line|polyline|polygon|ellipse|g|use|text)\b/i;

const readAttr = (attrs, name) => {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1].trim() : null;
};

/** 소수점 4자리까지만 — 문자열이 불필요하게 길어지는 것을 막는다 */
const round = (n) => Number(n.toFixed(4));

/**
 * @param {string} input  <svg> 전체 코드 또는 도형 마크업만
 * @returns {{ body: string, mode: 'line'|'fill', size: string, warnings: string[] }}
 * @throws {Error} 사람이 읽을 수 있는 한국어 메시지
 */
export function parseSvgSource(input) {
  let src = String(input || '').trim();
  if (!src) throw new Error('SVG 코드를 붙여넣거나 파일을 선택해 주세요.');

  const warnings = [];

  /* 1. 선언 · 주석 · 위험 요소 제거 */
  src = src
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const before = src;
  src = src
    .replace(new RegExp(`<\\s*(${UNSAFE_TAGS})\\b[\\s\\S]*?<\\s*/\\s*\\1\\s*>`, 'gi'), '')
    .replace(new RegExp(`<\\s*(${UNSAFE_TAGS})\\b[^>]*/?>`, 'gi'), '');
  if (src !== before) warnings.push('스크립트·애니메이션 요소는 안전을 위해 제거했습니다.');

  src = src
    .replace(new RegExp(`<\\s*(${META_TAGS})\\b[\\s\\S]*?<\\s*/\\s*\\1\\s*>`, 'gi'), '')
    .replace(new RegExp(`<\\s*(${META_TAGS})\\b[^>]*/?>`, 'gi'), '');

  /* 2. <svg> 껍데기 분리 */
  const open = src.match(/<svg\b([^>]*)>/i);
  let attrs = '';
  let body = src;
  if (open) {
    attrs = open[1];
    const close = src.lastIndexOf('</svg>');
    body = src.slice(open.index + open[0].length, close === -1 ? undefined : close);
  } else {
    warnings.push('<svg> 태그가 없어 도형 마크업으로 처리했습니다.');
  }

  /* 3. 원본 크기 파악 → 24×24 로 보정 */
  const viewBox = readAttr(attrs, 'viewBox');
  let minX = 0;
  let minY = 0;
  let w = 24;
  let h = 24;

  if (viewBox) {
    const n = viewBox.split(/[\s,]+/).map(Number);
    if (n.length === 4 && n.every((v) => Number.isFinite(v))) [minX, minY, w, h] = n;
  } else {
    const aw = parseFloat(readAttr(attrs, 'width') || '');
    const ah = parseFloat(readAttr(attrs, 'height') || '');
    if (Number.isFinite(aw) && Number.isFinite(ah)) {
      w = aw;
      h = ah;
      warnings.push('viewBox 가 없어 width·height 값을 기준으로 맞췄습니다.');
    } else {
      warnings.push('크기 정보를 찾지 못해 24×24 로 가정했습니다.');
    }
  }

  if (w <= 0 || h <= 0) throw new Error('SVG 크기(viewBox)를 읽을 수 없습니다.');

  const scale = round(24 / Math.max(w, h));
  const transform = [];
  if (scale !== 1) transform.push(`scale(${scale})`);
  if (minX || minY) transform.push(`translate(${round(-minX)} ${round(-minY)})`);
  if (scale !== 1) {
    warnings.push(
      `원본이 ${round(w)}×${round(h)} 라 ${scale}배로 맞췄습니다. (선 두께는 자동 보정됩니다)`
    );
  }
  if (Math.abs(w - h) > 0.01) {
    warnings.push('가로세로 비율이 정사각형이 아닙니다. 위치가 치우쳐 보일 수 있습니다.');
  }

  /* 4. 선(line) 아이콘인지 채움(fill) 아이콘인지 판별 */
  const rootFill = (readAttr(attrs, 'fill') || '').toLowerCase();
  const rootStroke = (readAttr(attrs, 'stroke') || '').toLowerCase();
  const hasStroke =
    (rootStroke && rootStroke !== 'none') || /\sstroke\s*=\s*["'](?!none)/i.test(body);
  const hasFill =
    (rootFill && rootFill !== 'none') ||
    [...body.matchAll(/\sfill\s*=\s*["']([^"']*)["']/gi)].some(
      (m) => m[1].toLowerCase() !== 'none'
    );
  const mode = hasStroke || !hasFill ? 'line' : 'fill';
  if (mode === 'fill') {
    warnings.push('채움(fill) 아이콘으로 인식해 currentColor 로 칠하도록 처리했습니다.');
  }

  /* 5. 속성 정리 · 한 줄로 압축 */
  body = body
    .replace(new RegExp(`\\s(?:${DROP_ATTRS})\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, 'gi'), '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/<(path|circle|rect|line|polyline|polygon|ellipse)([^>]*?)><\/\1>/gi, '<$1$2/>')
    .replace(/\s+\/>/g, '/>')
    .trim();

  if (!SHAPE_TAGS.test(body)) {
    throw new Error('그릴 수 있는 도형(path·circle·rect 등)을 찾지 못했습니다.');
  }

  /* 6. 감싸기 — 채움 모드와 크기 보정 */
  if (mode === 'fill') body = `<g fill="currentColor" stroke="none">${body}</g>`;
  if (transform.length) body = `<g transform="${transform.join(' ')}">${body}</g>`;

  // scale 은 Icon 이 선 두께를 되돌리는 데 쓴다 (scale() 은 두께까지 줄이므로)
  return { body, mode, scale, size: `${round(w)}×${round(h)}`, warnings };
}

/** icons.js 에 그대로 붙여넣을 수 있는 코드 조각 */
export function toIconsJsSnippet(name, { category, tags = [], body, scale }) {
  const tagList = tags.map((t) => `'${t.replace(/'/g, "\\'")}'`).join(', ');
  return (
    `  '${name}': {\n` +
    `    category: '${category}',\n` +
    `    tags: [${tagList}],\n` +
    (scale && scale !== 1 ? `    scale: ${scale}, // 선 두께 보정\n` : '') +
    `    body: '${body.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',\n` +
    `  },`
  );
}

/** 파일명 → 아이콘 이름 (영문 소문자 + 하이픈) */
export function toIconName(filename) {
  return String(filename)
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
