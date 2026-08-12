import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AssetPanel from '../components/AssetPanel';
import DetailPanel from '../components/DetailPanel';
import DropOverlay from '../components/DropOverlay';
import IconGrid, { EmptyState } from '../components/IconGrid';
import Masthead from '../components/Masthead';
import Toast from '../components/Toast';
import Toolbar from '../components/Toolbar';
import { ANIMATED_ICONS } from '../data/animatedIcons';
import { ICONS } from '../data/icons';
import { copyText } from '../lib/clipboard';
import { ALL_NAMES, CAFE, DEFAULTS, IMAGE_EXT } from './constants';
import { useCustomTags, useTheme, useToast } from './hooks';

/**
 * 아이콘 컴포넌트 테스터 — 앱 셸
 * 상태(검색·툴바·선택·에셋)를 들고 components/ 의 조각들을 조립한다.
 */
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [toast, showToast] = useToast();
  const { customTags, addTags, removeTag } = useCustomTags(showToast);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [size, setSize] = useState(DEFAULTS.size);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULTS.strokeWidth);
  const [color, setColor] = useState(DEFAULTS.color);
  const [customColor, setCustomColor] = useState('#4f46e5');
  const [pixelGrid, setPixelGrid] = useState(false);
  const [selected, setSelected] = useState(null); // { type: 'icon' | 'asset', ... }
  const [extraAssets, setExtraAssets] = useState([]);
  const [dragging, setDragging] = useState(false);

  const searchRef = useRef(null);
  const dragDepth = useRef(0);

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

  const copy = useCallback(
    (text, label) => {
      copyText(text);
      showToast(`${label} 복사됨`);
    },
    [showToast]
  );

  const resetControls = useCallback(() => {
    setSize(DEFAULTS.size);
    setStrokeWidth(DEFAULTS.strokeWidth);
    setColor(DEFAULTS.color);
    setPixelGrid(false);
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

  return (
    <div className={`app${dragging ? ' dropping' : ''}`} {...dropHandlers}>
      {dragging && <DropOverlay />}

      <Masthead count={ALL_NAMES.length} theme={theme} onToggleTheme={toggleTheme} />

      <Toolbar
        searchRef={searchRef}
        query={query}
        onQuery={setQuery}
        size={size}
        onSize={setSize}
        strokeWidth={strokeWidth}
        onStrokeWidth={setStrokeWidth}
        color={color}
        onColor={setColor}
        customColor={customColor}
        onCustomColor={setCustomColor}
        pixelGrid={pixelGrid}
        onPixelGrid={setPixelGrid}
        onReset={resetControls}
        category={category}
        onCategory={setCategory}
        counts={counts}
        onAddFiles={addFiles}
      />

      <div className="result-line">
        <b>{total}</b>
        <span>개 표시 중</span>
        {assetResults.length > 0 && <span>· cafe On {assetResults.length}개 포함</span>}
        {query && <span>· 검색어 “{query}”</span>}
        <span style={{ marginLeft: 'auto' }}>아이콘을 클릭하면 코드를 복사할 수 있습니다</span>
      </div>

      {total === 0 ? (
        <EmptyState category={category} query={query} />
      ) : (
        <IconGrid
          names={results}
          assets={assetResults}
          size={size}
          iconProps={{ size, strokeWidth, color }}
          pixelGrid={pixelGrid}
          selected={selected}
          onSelect={setSelected}
        />
      )}

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

      <Toast message={toast} />
    </div>
  );
}
