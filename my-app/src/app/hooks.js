/**
 * 앱 전용 훅
 * - useTheme            : 라이트/다크 (이 기기 설정이라 항상 localStorage)
 * - useToast            : 짧게 떴다 사라지는 알림
 * - useSyncedMap        : 아래 훅들이 공유하는 저장 계층 (localStorage + Supabase)
 * - useCustomTags       : 사용자가 덧붙인 검색 태그
 * - useCustomCategories : 사용자가 옮긴 분류
 * - useCustomIcons      : 화면에서 추가한 SVG 아이콘
 * - useHiddenIcons      : 삭제(숨김)한 아이콘
 * - useAssetLabels      : 이미지 아이콘의 표시 이름
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lookupIcon, registerCustomIcons } from '../data/customIcons';
import { categoryKey } from '../lib/category';
import { readLocal, writeLocal } from '../data/store/localStore';
import { isRemote, pullRemote, pushRemote } from '../data/store';

const THEME_KEY = 'icon-tester-theme';
const TAGS_KEY = 'icon-tester-tags';
const CATEGORY_KEY = 'icon-tester-categories';
const CUSTOM_ICON_KEY = 'icon-tester-custom-icons';
const HIDDEN_KEY = 'icon-tester-hidden';
const LABEL_KEY = 'icon-tester-labels';

/** 맵에서 키 하나를 지운 새 객체 (없으면 원본 그대로) */
function withoutKey(map, key) {
  if (!(key in map)) return map;
  const copy = { ...map };
  delete copy[key];
  return copy;
}

/**
 * 저장되는 맵 하나를 관리한다.
 *
 * 1. 첫 렌더는 localStorage 값으로 즉시 그린다 (기다리지 않는다)
 * 2. Supabase 가 설정돼 있으면 원격 값을 받아 덮어쓴다
 * 3. 값이 바뀌면 localStorage 에 쓰고 원격에도 반영한다
 *
 * 원격을 받아오기 전에 밀어 올리면 남의 데이터를 지울 수 있으므로,
 * 처음 불러오기가 끝나기 전에는 push 하지 않는다.
 */
export function useSyncedMap(kind, cacheKey, showToast) {
  const [map, setMap] = useState(() => readLocal(cacheKey, {}));
  const loaded = useRef(!isRemote);

  useEffect(() => {
    if (!isRemote) return;
    let alive = true;
    pullRemote(kind)
      .then((remote) => {
        if (!alive || !remote) return;
        setMap(remote);
        writeLocal(cacheKey, remote);
      })
      .catch((e) => showToast?.(`동기화 실패 — ${e.message}`))
      .finally(() => {
        if (alive) loaded.current = true;
      });
    return () => {
      alive = false;
    };
  }, [kind, cacheKey, showToast]);

  useEffect(() => {
    writeLocal(cacheKey, map);
    if (!isRemote || !loaded.current) return;
    pushRemote(kind, map).catch((e) => showToast?.(`저장 실패 — ${e.message}`));
  }, [kind, cacheKey, map, showToast]);

  return [map, setMap];
}

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);

  return [theme, toggleTheme];
}

export function useToast() {
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 1600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [toast, showToast];
}

/**
 * ICONS 의 기본 태그에 덧붙이는 사용자 태그.
 * 키: 라인 아이콘은 아이콘 이름, 이미지 아이콘은 "@파일명"
 */
export function useCustomTags(showToast) {
  const [customTags, setCustomTags] = useSyncedMap('tag', TAGS_KEY, showToast);

  const addTags = useCallback(
    (key, raw) => {
      const builtin = lookupIcon(key)?.tags || [];
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

  /** 이름을 바꾼 뒤 남은 옛 키를 정리한다 */
  const dropTags = useCallback((key) => setCustomTags((prev) => withoutKey(prev, key)), []);

  return { customTags, addTags, removeTag, dropTags };
}

/**
 * 이미지 아이콘(cafe On)의 표시 이름.
 *
 * 이미지 아이콘은 파일명이 곧 정체라서 이름을 진짜로 바꿀 수는 없다.
 * 대신 목록·검색·코드 조각·내보내기 파일명에 쓰이는 '라벨'만 갈아 끼운다.
 * 원래 파일명과 같아지면 항목을 지워 저장소를 깨끗하게 유지한다.
 */
export function useAssetLabels(showToast) {
  const [labels, setLabels] = useSyncedMap('label', LABEL_KEY, showToast);

  const setLabel = useCallback(
    (key, next, original) => {
      const name = String(next).trim();
      if (!name) return;
      setLabels((prev) => (name === original ? withoutKey(prev, key) : { ...prev, [key]: name }));
      showToast(
        name === original ? `원래 이름 ‘${original}’ 로 되돌렸습니다` : `이름을 ‘${name}’ 로 바꿨습니다`
      );
    },
    [showToast]
  );

  /** 아이콘을 완전히 지운 뒤 남은 라벨을 치운다 */
  const dropLabel = useCallback((key) => setLabels((prev) => withoutKey(prev, key)), []);

  return { labels, setLabel, dropLabel };
}

/**
 * 삭제(숨김)한 아이콘.
 *
 * icons.js 와 icon/ 폴더는 실행 중에 고칠 수 없으므로, 기본 아이콘의 '삭제'는
 * 목록에서 감추는 방식으로 처리하고 언제든 복원할 수 있게 한다.
 * 키 규칙은 태그·분류와 같다 — 라인 아이콘은 이름, 이미지 아이콘은 "@파일명".
 */
export function useHiddenIcons(showToast) {
  const [hidden, setHidden] = useSyncedMap('hidden', HIDDEN_KEY, showToast);

  const hide = useCallback(
    (key, label) => {
      setHidden((prev) => ({ ...prev, [key]: true }));
      showToast(`‘${label}’ 삭제됨 · 숨김에서 되돌릴 수 있습니다`);
    },
    [showToast]
  );

  const restore = useCallback(
    (key, label) => {
      setHidden((prev) => {
        if (!(key in prev)) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      showToast(`‘${label}’ 복원됨`);
    },
    [showToast]
  );

  const restoreAll = useCallback(() => {
    setHidden({});
    showToast('삭제한 아이콘을 모두 복원했습니다');
  }, [showToast]);

  /**
   * 분류 칩 숨기기 — 아이콘은 그대로 두고 상단 필터에서만 감춘다.
   * 소속 아이콘을 건드리지 않으므로 복원하면 원래대로 완전히 돌아온다.
   */
  const hideCategory = useCallback(
    (name) => {
      setHidden((prev) => ({ ...prev, [categoryKey(name)]: true }));
      showToast(`‘${name}’ 분류를 지웠습니다 · 아이콘은 그대로 있습니다`);
    },
    [showToast]
  );

  /** 지운 분류를 모두 되살린다 (아이콘 숨김 기록은 건드리지 않음) */
  const restoreCategories = useCallback(() => {
    setHidden((prev) => {
      const next = {};
      for (const k of Object.keys(prev)) if (!k.startsWith('#')) next[k] = prev[k];
      return next;
    });
    showToast('지운 분류를 모두 되살렸습니다');
  }, [showToast]);

  return { hidden, hide, restore, restoreAll, hideCategory, restoreCategories };
}

/**
 * 화면에서 추가한 SVG 아이콘.
 * localStorage 에 저장하고, Icon 컴포넌트가 찾을 수 있도록 레지스트리에 등록한다.
 */
export function useCustomIcons(showToast) {
  const [customIcons, setCustomIcons] = useSyncedMap('icons', CUSTOM_ICON_KEY, showToast);

  // 렌더 도중 등록해야 이번 렌더에서 바로 그릴 수 있다
  useMemo(() => registerCustomIcons(customIcons), [customIcons]);

  const addIcon = useCallback(
    (name, def, message) => {
      setCustomIcons((prev) => ({ ...prev, [name]: def }));
      showToast(message || `‘${name}’ 아이콘을 추가했습니다`);
    },
    [showToast]
  );

  const removeIcon = useCallback(
    (name) => {
      setCustomIcons((prev) => {
        if (!(name in prev)) return prev;
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      showToast(`‘${name}’ 아이콘을 삭제했습니다`);
    },
    [showToast]
  );

  return { customIcons, addIcon, removeIcon };
}

/**
 * 아이콘을 다른 분류로 옮긴 기록.
 * 키 규칙은 사용자 태그와 같고, 값은 옮겨간 분류 이름이다.
 * 기본 분류로 되돌아가면 항목을 지워 저장소를 깨끗하게 유지한다.
 */
export function useCustomCategories(showToast) {
  const [customCategories, setCustomCategories] = useSyncedMap('category', CATEGORY_KEY, showToast);

  const moveCategory = useCallback(
    (key, next, builtin) => {
      const name = String(next).trim();
      if (!name) return;
      if (name === builtin) {
        setCustomCategories((prev) => {
          if (!(key in prev)) return prev;
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      } else {
        setCustomCategories((prev) => ({ ...prev, [key]: name }));
      }
      showToast(`‘${name}’ 분류로 옮겼습니다`);
    },
    [showToast]
  );

  const resetCategory = useCallback(
    (key, builtin) => {
      setCustomCategories((prev) => {
        if (!(key in prev)) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      showToast(`‘${builtin}’ 분류로 되돌렸습니다`);
    },
    [showToast]
  );

  /** 이름을 바꾼 뒤 남은 옛 키를 정리한다 */
  const dropCategory = useCallback(
    (key) => setCustomCategories((prev) => withoutKey(prev, key)),
    []
  );

  return { customCategories, moveCategory, resetCategory, dropCategory };
}
