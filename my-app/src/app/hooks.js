/**
 * 앱 전용 훅
 * - useTheme            : 라이트/다크 (localStorage 저장)
 * - useToast            : 짧게 떴다 사라지는 알림
 * - useCustomTags       : 사용자가 덧붙인 검색 태그 (localStorage 저장)
 * - useCustomCategories : 사용자가 옮긴 분류 (localStorage 저장)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lookupIcon, registerCustomIcons } from '../data/customIcons';

const THEME_KEY = 'icon-tester-theme';
const TAGS_KEY = 'icon-tester-tags';
const CATEGORY_KEY = 'icon-tester-categories';
const CUSTOM_ICON_KEY = 'icon-tester-custom-icons';
const HIDDEN_KEY = 'icon-tester-hidden';

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
  const [customTags, setCustomTags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(TAGS_KEY) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(TAGS_KEY, JSON.stringify(customTags));
  }, [customTags]);

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

  return { customTags, addTags, removeTag };
}

/**
 * 삭제(숨김)한 아이콘.
 *
 * icons.js 와 icon/ 폴더는 실행 중에 고칠 수 없으므로, 기본 아이콘의 '삭제'는
 * 목록에서 감추는 방식으로 처리하고 언제든 복원할 수 있게 한다.
 * 키 규칙은 태그·분류와 같다 — 라인 아이콘은 이름, 이미지 아이콘은 "@파일명".
 */
export function useHiddenIcons(showToast) {
  const [hidden, setHidden] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  }, [hidden]);

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

  return { hidden, hide, restore, restoreAll };
}

/**
 * 화면에서 추가한 SVG 아이콘.
 * localStorage 에 저장하고, Icon 컴포넌트가 찾을 수 있도록 레지스트리에 등록한다.
 */
export function useCustomIcons(showToast) {
  const [customIcons, setCustomIcons] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_ICON_KEY) || '{}');
    } catch {
      return {};
    }
  });

  // 렌더 도중 등록해야 이번 렌더에서 바로 그릴 수 있다
  useMemo(() => registerCustomIcons(customIcons), [customIcons]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_ICON_KEY, JSON.stringify(customIcons));
  }, [customIcons]);

  const addIcon = useCallback(
    (name, def) => {
      setCustomIcons((prev) => ({ ...prev, [name]: def }));
      showToast(`‘${name}’ 아이콘을 추가했습니다`);
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
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CATEGORY_KEY) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(customCategories));
  }, [customCategories]);

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

  return { customCategories, moveCategory, resetCategory };
}
