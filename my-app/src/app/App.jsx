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
  useAssetLabels,
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
  const { customTags, addTags, removeTag, dropTags } = useCustomTags(showToast);
  const { customCategories, moveCategory, resetCategory, dropCategory } =
    useCustomCategories(showToast);
  const { customIcons, addIcon, removeIcon } = useCustomIcons(showToast);
  const { hidden, hide, restore, restoreAll } = useHiddenIcons(showToast);
  const { labels, setLabel } = useAssetLabels(showToast);

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

  /**
   * 아이콘 이름 바꾸기
   *
   * 이름은 곧 아이콘을 찾는 키라서, 새 이름으로 등록한 뒤 옛 이름을 정리하는 방식으로 처리한다.
   * - 화면에서 추가한 아이콘 : 옛 항목을 지운다
   * - 기본 아이콘           : icons.js 는 고칠 수 없으므로 원본을 숨기고 새 이름으로 등록한다
   *                          (숨김에서 언제든 원래 아이콘을 되살릴 수 있다)
   * 붙여 둔 태그와 옮겨 둔 분류도 새 이름으로 따라간다.
   */
  const renameIcon = useCallback(
    (oldName, newName) => {
      const def = lookupIcon(oldName);
      if (!def || oldName === newName) return;

      const wasCustom = !!customIcons[oldName];
      const tags = [...new Set([...(def.tags || []), ...(customTags[oldName] || [])])];

      const category = iconCategory(oldName, customCategories);

      // 옛 이름 정리를 먼저 — 알림이 이름 변경 메시지로 끝나도록
      dropTags(oldName);
      dropCategory(oldName);
      if (wasCustom) removeIcon(oldName);
      else hide(oldName, oldName);

      addIcon(
        newName,
        { category, tags, body: def.body, scale: def.scale, custom: true },
        `이름을 ‘${newName}’ 로 바꿨습니다`
      );

      setSelected({ type: 'icon', name: newName });
    },
    [customIcons, customTags, customCategories, addIcon, removeIcon, hide, dropTags, dropCategory]
  );

  const resetControls = useCallback(() => {
    setSize(DEFAULTS.size);
    setStrokeWidth(DEFAULTS.strokeWidth);
    setColor(DEFAULTS.color);
    setPixelGrid(false);
  }, []);

  /* ── cafe On : 사용자 이미지 아이콘 ───────── */
  /** 바꾼 라벨을 입혀 둔다 — 목록·검색·코드 조각·내보내기 파일명이 모두 이 이름을 쓴다 */
  const assets = useMemo(() => {
    const all = [...ANIMATED_ICONS, ...extraAssets];
    return all.map((a) => {
      const label = labels[assetKey(a)];
      return label ? { ...a, name: label } : a;
    });
  }, [extraAssets, labels]);

  /** 라벨을 바꾸면 객체가 새로 만들어지므로, 열려 있는 패널은 최신 것을 다시 찾아 쓴다 */
  const selectedAsset = useMemo(
    () =>
      selected?.type === 'asset'
        ? assets.find((a) => a.url === selected.item.url) || selected.item
        : null,
    [selected, assets]
  );

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

  /* url 은 에셋마다 고유하다 — 라벨을 바꾸면 객체가 새로 생기므로 참조 대신 url 로 비교한다 */
  const removeAsset = useCallback((item) => {
    setExtraAssets((prev) => prev.filter((x) => x.url !== item.url));
    if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    setSelected((s) => (s?.type === 'asset' && s.item.url === item.url ? null : s));
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
          existingNames={allNames}
          onRename={(next) => renameIcon(selected.name, next)}
        />
      )}
      {selected?.type === 'asset' && (
        <AssetPanel
          item={selectedAsset}
          size={size}
          strokeWidth={strokeWidth}
          category={assetCategory(selectedAsset, customCategories, CAFE)}
          categories={pickerCategories}
          onMoveCategory={(c) => moveCategory(assetKey(selectedAsset), c, CAFE)}
          onResetCategory={() => resetCategory(assetKey(selectedAsset), CAFE)}
          customTags={customTags[assetKey(selectedAsset)] || []}
          onAddTags={(raw) => addTags(assetKey(selectedAsset), raw)}
          onRemoveTag={(tag) => removeTag(assetKey(selectedAsset), tag)}
          onClose={() => setSelected(null)}
          onCopy={copy}
          onToast={showToast}
          hidden={!!hidden[assetKey(selectedAsset)]}
          onDelete={() => {
            if (selectedAsset.dropped) removeAsset(selectedAsset);
            else hide(assetKey(selectedAsset), selectedAsset.file);
            setSelected(null);
          }}
          onRestore={() => {
            restore(assetKey(selectedAsset), selectedAsset.file);
            setSelected(null);
          }}
          existingNames={assets.filter((a) => a.url !== selectedAsset.url).map((a) => a.name)}
          onRename={(next) =>
            setLabel(assetKey(selectedAsset), next, selectedAsset.file.replace(/\.[^.]+$/, ''))
          }
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
