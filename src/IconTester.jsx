import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon, { toSvgString } from './Icon';
import { ICONS } from './icons';
import AnimatedIconLab, {
  useAsset,
  formatBytes,
  renderAtSize,
  downloadBlob,
  SIZE_LADDER,
} from './AnimatedIconLab';
import { ANIMATED_ICONS } from './animatedIcons';

const ALL_NAMES = Object.keys(ICONS).sort();
const CATEGORIES = [...new Set(ALL_NAMES.map((n) => ICONS[n].category))];
/** 사용자가 넣은 이미지 아이콘(icon/ 폴더 + 드래그해 추가한 파일) 묶음 이름 */
const CAFE = 'cafe On';
const IMAGE_EXT = /\.(gif|png|apng|webp|svg|avif|jpe?g)$/i;
const SWATCHES = ['currentColor', '#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626'];
const PREVIEW_SIZES = [12, 16, 20, 24, 32, 48, 64];

/* ── 클립보드 복사 (file:// 환경 대비 폴백 포함) ── */
function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}
function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    ta.remove();
  }
}

export default function IconTester() {
  const [theme, setTheme] = useState(() => localStorage.getItem('icon-tester-theme') || 'light');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [size, setSize] = useState(24);
  const [strokeWidth, setStrokeWidth] = useState(1.75);
  const [color, setColor] = useState('currentColor');
  const [customColor, setCustomColor] = useState('#4f46e5');
  const [pixelGrid, setPixelGrid] = useState(false);
  const [selected, setSelected] = useState(null); // { type: 'icon' | 'asset', ... }
  const [toast, setToast] = useState('');
  const [extraAssets, setExtraAssets] = useState([]);
  const [dragging, setDragging] = useState(false);
  const searchRef = useRef(null);
  const fileRef = useRef(null);
  const dragDepth = useRef(0);

  /* 테마 적용 */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('icon-tester-theme', theme);
  }, [theme]);

  /* 단축키: "/" 검색 포커스, Esc 패널 닫기 (입력 중에는 방해하지 않음) */
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (typing && el !== searchRef.current) el.blur();
        else if (selected) setSelected(null);
        else if (el === searchRef.current) el.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(''), 1600);
  }, []);

  const copy = useCallback(
    (text, label) => {
      copyText(text);
      showToast(`${label} 복사됨`);
    },
    [showToast]
  );

  /* ── 사용자 태그 ──────────────────────────
     ICONS 의 기본 태그에 덧붙이는 태그. localStorage 에 저장된다.
     키: 라인 아이콘은 아이콘 이름, 이미지 아이콘은 "@파일명"          */
  const [customTags, setCustomTags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('icon-tester-tags') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('icon-tester-tags', JSON.stringify(customTags));
  }, [customTags]);

  const addTags = useCallback(
    (key, raw) => {
      const builtin = ICONS[key]?.tags || [];
      const existing = customTags[key] || [];
      const fresh = [];
      for (const part of String(raw).split(/[,\n]+/)) {
        const tag = part.trim();
        if (!tag) continue;
        if (builtin.includes(tag) || existing.includes(tag) || fresh.includes(tag)) continue;
        fresh.push(tag);
      }
      if (!fresh.length) {
        showToast('이미 있는 태그입니다');
        return;
      }
      setCustomTags((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...fresh] }));
      showToast(`태그 ${fresh.length}개 추가됨`);
    },
    [customTags, showToast]
  );

  const removeTag = useCallback((key, tag) => {
    setCustomTags((prev) => {
      const next = (prev[key] || []).filter((t) => t !== tag);
      const copy = { ...prev };
      if (next.length) copy[key] = next;
      else delete copy[key];
      return copy;
    });
  }, []);

  /* ── cafe On : 사용자 이미지 아이콘 ───────── */
  const assets = useMemo(() => [...ANIMATED_ICONS, ...extraAssets], [extraAssets]);

  const addFiles = useCallback(
    (fileList) => {
      const added = [...(fileList || [])]
        .filter((f) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name))
        .map((f) => ({
          name: f.name.replace(/\.[^.]+$/, ''),
          file: f.name,
          url: URL.createObjectURL(f),
          blob: f,
          dropped: true,
        }));
      if (!added.length) {
        showToast('이미지 파일만 추가할 수 있습니다');
        return;
      }
      setExtraAssets((prev) => [...prev, ...added]);
      setCategory(CAFE);
      showToast(`${added.length}개 파일 추가됨`);
    },
    [showToast]
  );

  const removeAsset = useCallback((item) => {
    setExtraAssets((prev) => prev.filter((x) => x !== item));
    if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    setSelected((s) => (s?.type === 'asset' && s.item === item ? null : s));
  }, []);

  /* 페이지 어디에 놓아도 파일이 추가되도록 */
  const dropHandlers = {
    onDragEnter: (e) => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e) => {
      if ([...e.dataTransfer.types].includes('Files')) e.preventDefault();
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
  };

  /* 검색 + 분류 필터 */
  const results = useMemo(() => {
    if (category === CAFE) return [];
    const q = query.trim().toLowerCase();
    return ALL_NAMES.filter((name) => {
      const icon = ICONS[name];
      if (category !== '전체' && icon.category !== category) return false;
      if (!q) return true;
      return (
        name.includes(q) ||
        icon.category.toLowerCase().includes(q) ||
        icon.tags.some((t) => t.toLowerCase().includes(q)) ||
        (customTags[name] || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category, customTags]);

  const assetResults = useMemo(() => {
    if (category !== '전체' && category !== CAFE) return [];
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.file.toLowerCase().includes(q) ||
        (customTags['@' + a.file] || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [query, category, assets, customTags]);

  const total = results.length + assetResults.length;

  const counts = useMemo(() => {
    const map = { 전체: ALL_NAMES.length + assets.length, [CAFE]: assets.length };
    for (const n of ALL_NAMES) map[ICONS[n].category] = (map[ICONS[n].category] || 0) + 1;
    return map;
  }, [assets.length]);

  const iconProps = { size, strokeWidth, color };

  return (
    <div className={`app${dragging ? ' dropping' : ''}`} {...dropHandlers}>
      {dragging && (
        <div className="drop-overlay">
          <Icon name="download" size={30} />
          <div className="big">놓으면 cafe On 에 추가됩니다</div>
          <div>GIF · PNG · SVG · WebP — 브라우저 안에서만 처리되며 업로드되지 않습니다</div>
        </div>
      )}

      <header className="masthead">
        <div className="brand-mark">
          <Icon name="grid" size={22} strokeWidth={1.75} color="#fff" />
        </div>
        <div>
          <h1>아이콘 컴포넌트 테스터</h1>
          <div className="sub">
            {ALL_NAMES.length}개 아이콘 · 24×24 그리드 · 라인 스타일 · React
          </div>
        </div>
        <div className="spacer" />
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          aria-label="테마 전환"
        >
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
        </button>
      </header>

      {/* ── 툴바 ───────────────────────────── */}
      <div className="toolbar">
        <div className="toolbar-row">
          <div className="search">
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 · 태그 · 분류로 검색 (예: 삭제, arrow, 알림)"
              aria-label="아이콘 검색"
            />
            {query ? (
              <button className="clear" onClick={() => setQuery('')} aria-label="검색어 지우기">
                <Icon name="x" size={13} />
              </button>
            ) : (
              <span className="kbd-hint">/</span>
            )}
          </div>

          <div className="control">
            <label htmlFor="size-range">크기</label>
            <input
              id="size-range"
              type="range"
              min="12"
              max="96"
              step="1"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <span className="val">{size}px</span>
          </div>

          <div className="control">
            <label htmlFor="stroke-range">두께</label>
            <input
              id="stroke-range"
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
            />
            <span className="val">{strokeWidth}</span>
          </div>

          <div className="swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                className="swatch"
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                title={c === 'currentColor' ? 'currentColor (글자색 상속)' : c}
                style={
                  c === 'currentColor'
                    ? { background: 'var(--text)' }
                    : { background: c }
                }
              />
            ))}
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setColor(e.target.value);
              }}
              title="직접 선택"
              aria-label="사용자 지정 색상"
            />
          </div>

          <button
            className="icon-btn"
            aria-pressed={pixelGrid}
            onClick={() => setPixelGrid(!pixelGrid)}
            title="8px 그리드 오버레이 — 선이 픽셀에 정렬되는지 확인"
          >
            <Icon name="grid" size={17} />
          </button>

          <button
            className="icon-btn"
            onClick={() => {
              setSize(24);
              setStrokeWidth(1.75);
              setColor('currentColor');
              setPixelGrid(false);
            }}
            title="기본값으로 초기화"
          >
            <Icon name="refresh" size={17} />
          </button>
        </div>

        <div className="toolbar-row">
          <div className="chips">
            <button
              className="chip"
              aria-pressed={category === '전체'}
              onClick={() => setCategory('전체')}
            >
              전체
              <span className="count">{counts['전체']}</span>
            </button>

            <button
              className="chip cafe"
              aria-pressed={category === CAFE}
              onClick={() => setCategory(CAFE)}
              title="내가 넣은 이미지 아이콘 (icon/ 폴더 + 직접 추가한 파일)"
            >
              <Icon name="image" size={13} />
              {CAFE}
              <span className="count">{counts[CAFE]}</span>
            </button>

            <button
              className="chip add"
              onClick={() => fileRef.current?.click()}
              title="GIF · PNG · SVG · WebP 파일을 cafe On 에 추가"
            >
              <Icon name="plus" size={13} />
              파일 추가
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <span className="chip-divider" aria-hidden="true" />

            {CATEGORIES.map((c) => (
              <button
                key={c}
                className="chip"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
                <span className="count">{counts[c] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 결과 ───────────────────────────── */}
      <div className="result-line">
        <b>{total}</b>
        <span>개 표시 중</span>
        {assetResults.length > 0 && <span>· cafe On {assetResults.length}개 포함</span>}
        {query && <span>· 검색어 “{query}”</span>}
        <span style={{ marginLeft: 'auto' }}>아이콘을 클릭하면 코드를 복사할 수 있습니다</span>
      </div>

      {total === 0 ? (
        <div className="empty">
          {category === CAFE && !query ? (
            <>
              <div className="big">cafe On 에 아직 파일이 없습니다</div>
              <div>
                파일을 이 페이지에 끌어다 놓거나 위의 <b>파일 추가</b> 버튼을 누르세요. GIF · PNG ·
                SVG · WebP 를 지원합니다.
              </div>
            </>
          ) : (
            <>
              <div className="big">일치하는 아이콘이 없습니다</div>
              <div>다른 검색어를 입력하거나 분류를 ‘전체’로 바꿔 보세요.</div>
            </>
          )}
        </div>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(104, size + 56)}px, 1fr))` }}
        >
          {assetResults.map((item) => (
            <button
              key={item.url}
              className={`cell asset${pixelGrid ? ' pixelgrid' : ''}`}
              aria-selected={selected?.type === 'asset' && selected.item === item}
              onClick={() => setSelected({ type: 'asset', item })}
              title={`${item.file} — 클릭하면 상세 보기`}
            >
              <span className="glyph">
                <img
                  src={item.url}
                  alt=""
                  width={size}
                  height={size}
                  style={{ width: size, height: size, objectFit: 'contain' }}
                />
              </span>
              <span className="name">{item.name}</span>
            </button>
          ))}

          {results.map((name) => (
            <button
              key={name}
              className={`cell${pixelGrid ? ' pixelgrid' : ''}`}
              aria-selected={selected?.type === 'icon' && selected.name === name}
              onClick={() => setSelected({ type: 'icon', name })}
              title={`${name} — 클릭하면 상세 보기`}
            >
              <span className="glyph">
                <Icon name={name} {...iconProps} spin={name === 'loader'} />
              </span>
              <span className="name">{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 사용성 검증 랩 ─────────────────── */}
      <Lab {...iconProps} />

      {/* ── 컬러 · 애니메이션 아이콘 랩 ────── */}
      <AnimatedIconLab
        strokeWidth={strokeWidth}
        items={assets}
        onAddFiles={addFiles}
        onRemove={removeAsset}
      />

      {/* ── 상세 패널 ──────────────────────── */}
      {selected?.type === 'icon' && (
        <DetailPanel
          name={selected.name}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
          customTags={customTags[selected.name] || []}
          onAddTags={(raw) => addTags(selected.name, raw)}
          onRemoveTag={(tag) => removeTag(selected.name, tag)}
          onClose={() => setSelected(null)}
          onCopy={copy}
        />
      )}
      {selected?.type === 'asset' && (
        <AssetPanel
          item={selected.item}
          size={size}
          strokeWidth={strokeWidth}
          customTags={customTags['@' + selected.item.file] || []}
          onAddTags={(raw) => addTags('@' + selected.item.file, raw)}
          onRemoveTag={(tag) => removeTag('@' + selected.item.file, tag)}
          onClose={() => setSelected(null)}
          onCopy={copy}
          onToast={showToast}
          onRemove={selected.item.dropped ? () => removeAsset(selected.item) : undefined}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check-circle" size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   상세 패널
   ══════════════════════════════════════════ */
function DetailPanel({
  name,
  size,
  strokeWidth,
  color,
  customTags,
  onAddTags,
  onRemoveTag,
  onClose,
  onCopy,
}) {
  const [rotate, setRotate] = useState(0);
  const [flip, setFlip] = useState(null);
  const [spin, setSpin] = useState(false);
  const [checker, setChecker] = useState(true);
  const icon = ICONS[name];

  useEffect(() => {
    setRotate(0);
    setFlip(null);
    setSpin(false);
  }, [name]);

  const jsx = useMemo(() => {
    const p = [`name="${name}"`];
    if (size !== 24) p.push(`size={${size}}`);
    if (strokeWidth !== 1.75) p.push(`strokeWidth={${strokeWidth}}`);
    if (color !== 'currentColor') p.push(`color="${color}"`);
    if (rotate) p.push(`rotate={${rotate}}`);
    if (flip) p.push(`flip="${flip}"`);
    if (spin) p.push('spin');
    return `<Icon ${p.join(' ')} />`;
  }, [name, size, strokeWidth, color, rotate, flip, spin]);

  const svg = useMemo(
    () => toSvgString(name, { size, strokeWidth, color }),
    [name, size, strokeWidth, color]
  );

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={`${name} 아이콘 상세`}>
        <div className="panel-head">
          <Icon name={name} size={20} strokeWidth={strokeWidth} />
          <span className="title">{name}</span>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="panel-body">
          <div className={`stage${checker ? '' : ' plain'}`}>
            <Icon
              name={name}
              size={Math.max(size, 72)}
              strokeWidth={strokeWidth}
              color={color}
              rotate={rotate}
              flip={flip}
              spin={spin}
            />
          </div>

          <div className="demo-row" style={{ marginTop: 10 }}>
            <button className="demo-btn sm" onClick={() => setRotate((r) => (r + 90) % 360)}>
              <Icon name="refresh" size={14} /> 회전 {rotate}°
            </button>
            <button
              className="demo-btn sm"
              onClick={() => setFlip(flip === 'x' ? null : 'x')}
              aria-pressed={flip === 'x'}
            >
              <Icon name="arrow-right" size={14} flip="x" /> 좌우 반전
            </button>
            <button className="demo-btn sm" onClick={() => setSpin(!spin)} aria-pressed={spin}>
              <Icon name="loader" size={14} spin={spin} /> 회전 애니메이션
            </button>
            <button className="demo-btn sm" onClick={() => setChecker(!checker)}>
              <Icon name="image" size={14} /> 배경
            </button>
          </div>

          <dl className="meta">
            <dt>분류</dt>
            <dd>{icon.category}</dd>
            <dt>크기</dt>
            <dd>
              {size}px · 두께 {strokeWidth} · {color}
            </dd>
          </dl>

          <div className="section-label">태그</div>
          <TagEditor
            builtin={icon.tags}
            custom={customTags}
            onAdd={onAddTags}
            onRemove={onRemoveTag}
            onCopy={() => {
              const all = [...icon.tags, ...customTags];
              const code = `tags: [${all.map((t) => `'${t}'`).join(', ')}],`;
              onCopy(code, 'tags 배열');
            }}
          />

          <div className="section-label">크기별 렌더링</div>
          <div className="sizes-strip">
            {PREVIEW_SIZES.map((s) => (
              <figure key={s}>
                <Icon name={name} size={s} strokeWidth={strokeWidth} color={color} />
                <figcaption>{s}</figcaption>
              </figure>
            ))}
          </div>

          <div className="section-label">React</div>
          <CodeBlock code={jsx} onCopy={() => onCopy(jsx, 'JSX')} />
          <CodeBlock
            code={`import Icon from './Icon';`}
            onCopy={() => onCopy(`import Icon from './Icon';`, 'import 문')}
          />

          <div className="section-label">SVG</div>
          <CodeBlock code={svg} onCopy={() => onCopy(svg, 'SVG')} />
        </div>
      </aside>
    </>
  );
}

/* ══════════════════════════════════════════
   크기 변환 · 내보내기
   원본(예: 640px)을 실제 목표 픽셀로 다시 렌더링해 저장한다
   ══════════════════════════════════════════ */
function ExportBox({ item, url, size, onToast }) {
  const [px, setPx] = useState(Math.max(8, Math.round(size)));
  const [scale, setScale] = useState(1);
  const [type, setType] = useState('image/png');
  const [result, setResult] = useState(null); // { url, bytes }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const outPx = Math.min(1024, Math.max(8, Math.round(px * scale)));
  const ext = type === 'image/webp' ? 'webp' : 'png';
  const filename = `${item.name}-${px}${scale > 1 ? `@${scale}x` : ''}.${ext}`;

  /* 설정이 바뀌면 미리보기를 다시 만든다 */
  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setError('');
    setBusy(true);

    const timer = setTimeout(async () => {
      try {
        const blob = await renderAtSize(url, outPx, type);
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ url: objectUrl, bytes: blob.size, blob });
      } catch (e) {
        if (alive) {
          setResult(null);
          setError(e.message);
        }
      } finally {
        if (alive) setBusy(false);
      }
    }, 220);

    return () => {
      alive = false;
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, outPx, type]);

  return (
    <div className="export-box">
      <div className="export-row">
        <label htmlFor="export-px">크기</label>
        <input
          id="export-px"
          type="number"
          min="8"
          max="512"
          value={px}
          onChange={(e) => setPx(Math.max(1, Number(e.target.value) || 1))}
        />
        <span className="unit">px</span>
        <div className="seg sm">
          {[1, 2, 3].map((s) => (
            <button key={s} className="seg-btn" aria-pressed={scale === s} onClick={() => setScale(s)}>
              @{s}x
            </button>
          ))}
        </div>
      </div>

      <div className="export-row">
        <label>형식</label>
        <div className="seg sm">
          <button
            className="seg-btn"
            aria-pressed={type === 'image/png'}
            onClick={() => setType('image/png')}
          >
            PNG
          </button>
          <button
            className="seg-btn"
            aria-pressed={type === 'image/webp'}
            onClick={() => setType('image/webp')}
          >
            WebP
          </button>
        </div>
        <span className="export-out">→ {outPx} × {outPx}px</span>
      </div>

      {error ? (
        <p className="hint export-error">
          {error} — <code>npm run dev</code> 로 실행하거나 파일을 페이지에 드래그해 추가하면
          변환할 수 있습니다.
        </p>
      ) : (
        <div className="export-result">
          <div className="export-preview">
            {result && (
              <img
                src={result.url}
                alt="변환 결과"
                style={{ width: Math.min(outPx, 128), height: Math.min(outPx, 128) }}
              />
            )}
          </div>
          <div className="export-info">
            <div className="export-size">
              {busy ? '변환 중…' : result ? formatBytes(result.bytes) : '—'}
            </div>
            <div className="export-name">{filename}</div>
            <button
              className="demo-btn sm"
              disabled={!result || busy}
              onClick={() => {
                downloadBlob(result.blob, filename);
                onToast(`${filename} 저장됨`);
              }}
            >
              <Icon name="download" size={13} />
              내려받기
            </button>
          </div>
        </div>
      )}

      <p className="hint">
        원본을 목표 픽셀로 다시 그려 저장합니다. <b>애니메이션은 유지되지 않고 정지 이미지 한
        장</b>으로 저장됩니다 — 움직임을 살리려면 원본 툴(AE·Lottie)에서 작은 크기로 다시
        내보내세요.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════
   태그 편집기
   기본 태그(icons.js)는 고정, 사용자가 더한 태그만 삭제 가능
   ══════════════════════════════════════════ */
function TagEditor({ builtin = [], custom = [], onAdd, onRemove, onCopy }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };

  return (
    <div className="tag-editor">
      <div className="tag-row">
        {builtin.map((t) => (
          <span className="tag" key={`b-${t}`}>
            {t}
          </span>
        ))}
        {custom.map((t) => (
          <span className="tag custom" key={`c-${t}`}>
            {t}
            <button type="button" onClick={() => onRemove(t)} aria-label={`${t} 태그 삭제`}>
              <Icon name="x" size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        {builtin.length + custom.length === 0 && <span className="tag-empty">아직 태그가 없습니다</span>}
      </div>

      <form className="tag-form" onSubmit={submit}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="태그 입력 후 Enter · 쉼표로 여러 개"
          aria-label="태그 추가"
        />
        <button type="submit" className="demo-btn sm" disabled={!value.trim()}>
          <Icon name="plus" size={13} />
          추가
        </button>
      </form>

      <div className="tag-foot">
        <span>추가한 태그는 이 브라우저에 저장되며 검색에 바로 반영됩니다.</span>
        <button type="button" className="link-btn" onClick={onCopy}>
          <Icon name="copy" size={12} />
          icons.js 용 tags 복사
        </button>
      </div>
    </div>
  );
}

function CodeBlock({ code, onCopy }) {
  return (
    <div className="code-block">
      <pre>{code}</pre>
      <button className="copy" onClick={onCopy} aria-label="복사">
        <Icon name="copy" size={14} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   cafe On 이미지 아이콘 상세 패널
   ══════════════════════════════════════════ */
function AssetPanel({
  item,
  size,
  strokeWidth,
  customTags,
  onAddTags,
  onRemoveTag,
  onClose,
  onCopy,
  onToast,
  onRemove,
}) {
  const [{ status, url, meta, bytes }, restart] = useAsset(item.url, item.blob);
  const [checker, setChecker] = useState(true);
  const [natural, setNatural] = useState(null);

  const path = `icon/${item.file}`;
  const varName =
    (item.name.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')) || 'my') +
    'Icon';

  const htmlSnippet = `<img src="${path}" alt="${item.name}" width="${size}" height="${size}" />`;
  const jsxSnippet =
    `import ${varName} from '../${path}';\n\n` +
    `<img src={${varName}} alt="${item.name}" width={${size}} height={${size}} />`;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={`${item.file} 상세`}>
        <div className="panel-head">
          <img src={url} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
          <span className="title">{item.file}</span>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="panel-body">
          <div className={`stage${checker ? '' : ' plain'}`}>
            <img
              src={url}
              alt={item.name}
              onLoad={(e) =>
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
              }
              style={{ width: Math.max(size, 72), height: Math.max(size, 72), objectFit: 'contain' }}
            />
          </div>

          <div className="demo-row" style={{ marginTop: 10 }}>
            <button className="demo-btn sm" onClick={restart}>
              <Icon name="play" size={13} strokeWidth={strokeWidth} /> 처음부터
            </button>
            <button className="demo-btn sm" onClick={() => setChecker(!checker)}>
              <Icon name="image" size={13} strokeWidth={strokeWidth} /> 배경
            </button>
            {onRemove && (
              <button className="demo-btn sm ghost" onClick={onRemove}>
                <Icon name="trash" size={13} strokeWidth={strokeWidth} /> 목록에서 제거
              </button>
            )}
          </div>

          <dl className="meta">
            <dt>분류</dt>
            <dd>{CAFE}</dd>
            <dt>원본</dt>
            <dd>{natural ? `${natural.w} × ${natural.h}px` : '…'}</dd>
            <dt>용량</dt>
            <dd>{bytes != null ? formatBytes(bytes) : status === 'limited' ? '측정 불가' : '…'}</dd>
            {meta && (
              <>
                <dt>프레임</dt>
                <dd>
                  {meta.frames}장 · {(meta.durationMs / 1000).toFixed(1)}초
                </dd>
              </>
            )}
            <dt>경로</dt>
            <dd>
              <code>{item.dropped ? '(드래그해 추가한 파일)' : path}</code>
            </dd>
          </dl>

          <div className="section-label">태그</div>
          <TagEditor
            custom={customTags}
            onAdd={onAddTags}
            onRemove={onRemoveTag}
            onCopy={() => {
              const code = `tags: [${customTags.map((t) => `'${t}'`).join(', ')}],`;
              onCopy(code, 'tags 배열');
            }}
          />

          <div className="section-label">크기별 렌더링</div>
          <div className="sizes-strip">
            {SIZE_LADDER.slice(0, 6).map((s) => (
              <figure key={s}>
                <img src={url} alt="" style={{ width: s, height: s, objectFit: 'contain' }} />
                <figcaption>{s}</figcaption>
              </figure>
            ))}
          </div>

          <div className="section-label">크기 변환 · 내보내기</div>
          <ExportBox item={item} url={url} size={size} onToast={onToast} />

          <div className="section-label">HTML</div>
          <CodeBlock code={htmlSnippet} onCopy={() => onCopy(htmlSnippet, 'HTML')} />

          <div className="section-label">React</div>
          <CodeBlock code={jsxSnippet} onCopy={() => onCopy(jsxSnippet, 'JSX')} />

          {item.dropped && (
            <p className="hint">
              드래그해 추가한 파일은 새로고침하면 사라집니다. 계속 쓰려면 <code>icon/</code> 폴더에
              넣어 두세요.
            </p>
          )}

          <p className="hint">
            자세한 진단(프레임·fps·투명도·용량 경고)은 아래 <b>컬러 · 애니메이션 아이콘</b>{' '}
            섹션에서 볼 수 있습니다.
          </p>
        </div>
      </aside>
    </>
  );
}

/* ══════════════════════════════════════════
   사용성 검증 랩
   실제 UI 안에서 정렬·가독성·대비를 확인
   ══════════════════════════════════════════ */
function Lab({ size, strokeWidth, color }) {
  const p = { strokeWidth, color };
  return (
    <section className="lab">
      <h2>사용성 검증</h2>
      <p className="lead">
        실제 UI 맥락에 얹어 정렬·시각 무게·최소 크기 가독성을 확인합니다. 위 툴바의 두께·색상
        설정이 그대로 반영됩니다.
      </p>

      <div className="lab-grid">
        {/* 1. 텍스트 정렬 */}
        <div className="card">
          <h3>텍스트 baseline 정렬</h3>
          {[
            { fs: 12, s: 14 },
            { fs: 14, s: 16 },
            { fs: 16, s: 18 },
            { fs: 20, s: 24 },
          ].map(({ fs, s }) => (
            <div className="align-line" key={fs} style={{ fontSize: fs }}>
              <Icon name="check-circle" size={s} {...p} />
              <span>본문 {fs}px 옆에 {s}px 아이콘</span>
            </div>
          ))}
          <div className="hint">
            아이콘 높이는 보통 글자 크기의 1.15~1.25배일 때 시각적으로 맞습니다.
          </div>
        </div>

        {/* 2. 버튼 */}
        <div className="card">
          <h3>버튼 · 입력창</h3>
          <div className="demo-row" style={{ marginBottom: 12 }}>
            <button className="demo-btn primary">
              <Icon name="plus" size={16} strokeWidth={strokeWidth} color="#fff" />
              새로 만들기
            </button>
            <button className="demo-btn">
              <Icon name="download" size={16} {...p} />
              내려받기
            </button>
            <button className="demo-btn ghost">
              <Icon name="trash" size={16} {...p} />
              삭제
            </button>
            <button className="demo-btn" style={{ width: 36, padding: 0, justifyContent: 'center' }}>
              <Icon name="more-horizontal" size={16} {...p} />
            </button>
          </div>
          <div className="demo-input">
            <span className="lead-icon">
              <Icon name="search" size={16} {...p} />
            </span>
            <input placeholder="입력창 안 아이콘 정렬 확인" />
          </div>
          <div className="hint">아이콘과 라벨의 광학 중심이 어긋나지 않는지 확인하세요.</div>
        </div>

        {/* 3. 리스트 */}
        <div className="card">
          <h3>리스트 행</h3>
          <div className="demo-list">
            {[
              ['folder', '프로젝트 문서', '폴더 · 12개 항목'],
              ['file', '기획안-v3.pdf', '2.4 MB'],
              ['image', '표지-시안.png', '840 KB'],
              ['lock', '계약서.docx', '보호됨'],
            ].map(([icon, title, meta]) => (
              <div className="row" key={title}>
                <Icon name={icon} size={18} {...p} />
                <div className="grow">
                  <div>{title}</div>
                  <div className="muted">{meta}</div>
                </div>
                <Icon name="chevron-right" size={16} strokeWidth={strokeWidth} color="var(--text-faint)" />
              </div>
            ))}
          </div>
        </div>

        {/* 4. 상태 배지 */}
        <div className="card">
          <h3>상태 표시</h3>
          <div className="demo-row" style={{ marginBottom: 14 }}>
            <span className="badge ok">
              <Icon name="check-circle" size={13} strokeWidth={strokeWidth} /> 완료
            </span>
            <span className="badge warn">
              <Icon name="alert-triangle" size={13} strokeWidth={strokeWidth} /> 확인 필요
            </span>
            <span className="badge err">
              <Icon name="x-circle" size={13} strokeWidth={strokeWidth} /> 실패
            </span>
          </div>
          <div className="demo-row">
            <span className="badge ok">
              <Icon name="loader" size={13} strokeWidth={strokeWidth} spin /> 처리 중
            </span>
            <Icon name="loader" size={20} {...p} spin />
            <Icon name="bell" size={20} {...p} pulse />
          </div>
          <div className="hint">13px처럼 작은 크기에서 선이 뭉개지지 않는지 봅니다.</div>
        </div>

        {/* 5. 크기 × 두께 매트릭스 */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>크기 × 두께 매트릭스</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="matrix">
              <thead>
                <tr>
                  <th>두께 \ 크기</th>
                  {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((s) => (
                    <th key={s}>{s}px</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 1.25, 1.5, 1.75, 2, 2.5].map((sw) => (
                  <tr key={sw}>
                    <td>{sw}</td>
                    {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((s) => (
                      <td key={s}>
                        <span style={{ display: 'inline-flex' }}>
                          <Icon name="settings" size={s} strokeWidth={sw} color={color} />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hint">
            작은 크기에서 두께가 굵으면 내부 여백이 막힙니다. 16px 이하에서는 1.5 전후를
            권장합니다.
          </div>
        </div>

        {/* 6. 대비 확인 */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>배경 대비</h3>
          <div className="demo-row">
            {[
              ['#ffffff', '#16191f', '흰 배경'],
              ['#f0f2f5', '#16191f', '회색 배경'],
              ['#16191f', '#ffffff', '검정 배경'],
              ['#4f46e5', '#ffffff', '브랜드 배경'],
              ['#fef3c7', '#92400e', '경고 배경'],
            ].map(([bg, fg, label]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: bg,
                  color: fg,
                  border: '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <Icon name="star" size={Math.min(size, 24)} strokeWidth={strokeWidth} />
                <Icon name="heart" size={Math.min(size, 24)} strokeWidth={strokeWidth} />
                <Icon name="zap" size={Math.min(size, 24)} strokeWidth={strokeWidth} />
                {label}
              </div>
            ))}
          </div>
          <div className="hint">
            색상을 <code>currentColor</code>로 두면 위처럼 배경별 글자색을 그대로 따라갑니다.
          </div>
        </div>
      </div>
    </section>
  );
}
