/**
 * 앱 전용 훅
 * - useTheme      : 라이트/다크 (localStorage 저장)
 * - useToast      : 짧게 떴다 사라지는 알림
 * - useCustomTags : 사용자가 덧붙인 검색 태그 (localStorage 저장)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ICONS } from '../data/icons';

const THEME_KEY = 'icon-tester-theme';
const TAGS_KEY = 'icon-tester-tags';

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

  return { customTags, addTags, removeTag };
}
