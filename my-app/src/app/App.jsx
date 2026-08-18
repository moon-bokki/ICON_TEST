import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AddIconDialog from '../components/AddIconDialog';
import AssetPanel from '../components/AssetPanel';
import DetailPanel from '../components/DetailPanel';
import DropOverlay from '../components/DropOverlay';
import Icon from '../components/Icon';
import IconGrid, { EmptyState } from '../components/IconGrid';
import Masthead from '../components/Masthead';
import Toast from '../components/Toast';
import Toolbar from '../components/Toolbar';
import { ANIMATED_ICONS } from '../data/animatedIcons';
import { lookupIcon } from '../data/customIcons';
import { assetCategory, assetKey, iconCategory } from '../lib/category';
import { copyText } from '../lib/clipboard';
import { ALL_NAMES, CAFE, CATEGORIES, DEFAULTS, HIDDEN, IMAGE_EXT } from './constants';
import {
  useCustomCategories,
  useCustomIcons,
  useCustomTags,
  useHiddenIcons,
  useTheme,
  useToast,
} from './hooks';

/**
 * 아이콘 컴포넌트 테스터 — 앱 셸
 * 상태(검색·툴바·선택·에셋)를 들고 components/ 의 조각들을 조립한다.
 */
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [toast, showToast] = useToast();
  const { customTags, addTags, removeTag } = useCustomTags(showToast);
  const { customCategories, moveCategory, resetCategory } = useCustomCategories(showToast);
  const { customIcons, addIcon, removeIcon } = useCustomIcons(showToast);
  const { hidden, hide, restore, restoreAll } = useHiddenIcons(showToast);

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
  const [adding, setAdding] = useState(false);

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
        else if (adding) setAdding(false);
        else if (selected) setSelected(null);
        else if (el === searchRef.current) el.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, adding]);

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

  /**
   * 기본 아이콘 + 화면에서 추가한 아이콘.
   * 추가 대화상자가 중복 이름을 막지만, 저장된 값이 기본 아이콘과 겹칠 수도 있으므로
   * 한 번 더 걸러 같은 이름이 두 칸 나오지 않게 한다 (기본 아이콘이 우선).
   */
  const allNames = useMemo(
    () => [...new Set([...ALL_NAMES, ...Object.keys(customIcons)])].sort(),
    [customIcons]
  );

  /**
   * 검색 + 분류 필터
   * 분류는 사용자가 옮긴 값을 우선 적용하고, 삭제한 아이콘은 '숨김' 에서만 보인다.
   */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNames.filter((name) => {
      const icon = lookupIcon(name);
      const cat = iconCategory(name, customCategories);
      if (category === HIDDEN) {
        if (!hidden[name]) return false;
      } else if (hidden[name]) return false;
      else if (category !== '전체' && cat !== category) return false;
      if (!q) return true;
      return (
        name.includes(q) ||
        cat.toLowerCase().includes(q) ||
        icon.tags.some((t) => t.toLowerCase().includes(q)) ||
        (customTags[name] || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category, allNames, customTags, customCategories, hidden]);

  const assetResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      const key = assetKey(a);
      const cat = assetCategory(a, customCategories, CAFE);
      if (category === HIDDEN) {
        if (!hidden[key]) return false;
      } else if (hidden[key]) return false;
      else if (category !== '전체' && cat !== category) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.file.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        (customTags[key] || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category, assets, customTags, customCategories, hidden]);

  const total = results.length + assetResults.length;

  /* 개수 집계 — 삭제한 아이콘은 빼고 센다 */
  const counts = useMemo(() => {
    const visibleNames = allNames.filter((n) => !hidden[n]);
    const visibleAssets = assets.filter((a) => !hidden[assetKey(a)]);
    const map = { 전체: visibleNames.length + visibleAssets.length, [CAFE]: 0 };
    const bump = (c) => {
      map[c] = (map[c] || 0) + 1;
    };
    for (const n of visibleNames) bump(iconCategory(n, customCategories));
    for (const a of visibleAssets) bump(assetCategory(a, customCategories, CAFE));
    return map;
  }, [allNames, assets, customCategories, hidden]);

  /** 삭제한 아이콘 수 — 지금 목록에 실제로 존재하는 것만 센다 */
  const hiddenCount = useMemo(
    () =>
      allNames.filter((n) => hidden[n]).length +
      assets.filter((a) => hidden[assetKey(a)]).length,
    [allNames, assets, hidden]
  );

  /**
   * 기본 분류 + 사용자가 새로 만든 분류.
   * 소속된 아이콘이 하나도 없는 분류는 빼서 빈 칩이 남지 않게 한다
   * (마지막 아이콘을 다른 곳으로 옮기면 그 분류는 자동으로 사라진다)
   */
  const categoryList = useMemo(() => {
    const extra = Object.keys(counts).filter(
      (c) => c !== '전체' && c !== CAFE && !CATEGORIES.includes(c) && counts[c] > 0
    );
    return [...CATEGORIES, ...extra];
  }, [counts]);

  /* 상세 패널의 분류 선택 목록 — cafe On 도 이동 대상에 포함 */
  const pickerCategories = useMemo(() => [...categoryList, CAFE], [categoryList]);

  /* 삭제한 아이콘을 모두 복원하면 '숨김' 화면에 머물 이유가 없다 */
  useEffect(() => {
    if (category === HIDDEN && hiddenCount === 0) setCategory('전체');
  }, [category, hiddenCount]);

  return (
    <div className={`app${dragging ? ' dropping' : ''}`} {...dropHandlers}>
      {dragging && <DropOverlay />}

      <Masthead
        count={allNames.filter((n) => !hidden[n]).length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

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
        categories={categoryList}
        counts={counts}
        onAddFiles={addFiles}
        onAddSvg={() => setAdding(true)}
        hiddenCount={hiddenCount}
      />

      <div className="result-line">
        <b>{total}</b>
        <span>개 표시 중</span>
        {assetResults.length > 0 && <span>· 이미지 아이콘 {assetResults.length}개 포함</span>}
        {query && <span>· 검색어 “{query}”</span>}
        {category === HIDDEN ? (
          <>
            <button className="link-btn" onClick={restoreAll}>
              <Icon name="refresh" size={12} />
              모두 복원
            </button>
            <span style={{ marginLeft: 'auto' }}>
              아이콘을 클릭하면 하나씩 복원할 수 있습니다
            </span>
          </>
        ) : (
          <span style={{ marginLeft: 'auto' }}>아이콘을 클릭하면 코드를 복사할 수 있습니다</span>
        )}
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
          dimmed={category === HIDDEN}
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
          category={iconCategory(selected.name, customCategories)}
          categories={pickerCategories}
          onMoveCategory={(c) => moveCategory(selected.name, c, lookupIcon(selected.name).category)}
          onResetCategory={() => resetCategory(selected.name, lookupIcon(selected.name).category)}
          customTags={customTags[selected.name] || []}
          onAddTags={(raw) => addTags(selected.name, raw)}
          onRemoveTag={(tag) => removeTag(selected.name, tag)}
          onClose={() => setSelected(null)}
          onCopy={copy}
          hidden={!!hidden[selected.name]}
          permanent={!!customIcons[selected.name]}
          onDelete={() => {
            if (customIcons[selected.name]) removeIcon(selected.name);
            else hide(selected.name, selected.name);
            setSelected(null);
          }}
          onRestore={() => {
            restore(selected.name, selected.name);
            setSelected(null);
          }}
        />
      )}
      {selected?.type === 'asset' && (
        <AssetPanel
          item={selected.item}
          size={size}
          strokeWidth={strokeWidth}
          category={assetCategory(selected.item, customCategories, CAFE)}
          categories={pickerCategories}
          onMoveCategory={(c) => moveCategory(assetKey(selected.item), c, CAFE)}
          onResetCategory={() => resetCategory(assetKey(selected.item), CAFE)}
          customTags={customTags[assetKey(selected.item)] || []}
          onAddTags={(raw) => addTags(assetKey(selected.item), raw)}
          onRemoveTag={(tag) => removeTag(assetKey(selected.item), tag)}
          onClose={() => setSelected(null)}
          onCopy={copy}
          onToast={showToast}
          hidden={!!hidden[assetKey(selected.item)]}
          onDelete={() => {
            if (selected.item.dropped) removeAsset(selected.item);
            else hide(assetKey(selected.item), selected.item.file);
            setSelected(null);
          }}
          onRestore={() => {
            restore(assetKey(selected.item), selected.item.file);
            setSelected(null);
          }}
        />
      )}

      {adding && (
        <AddIconDialog
          categories={categoryList}
          strokeWidth={strokeWidth}
          color={color}
          existingNames={allNames}
          onAdd={addIcon}
          onClose={() => setAdding(false)}
          onCopy={copy}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
