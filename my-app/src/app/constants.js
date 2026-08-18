/**
 * 테스트 페이지 전역 상수
 */
import { ICONS } from '../data/icons';

export const ALL_NAMES = Object.keys(ICONS).sort();
export const CATEGORIES = [...new Set(ALL_NAMES.map((n) => ICONS[n].category))];

/** 사용자가 넣은 이미지 아이콘(icon/ 폴더 + 드래그해 추가한 파일) 묶음 이름 */
export const CAFE = 'cafe On';

/** 삭제(숨김)한 아이콘만 모아 보는 가상 분류 */
export const HIDDEN = '숨김';

export const IMAGE_EXT = /\.(gif|png|apng|webp|svg|avif|jpe?g)$/i;
export const SWATCHES = ['currentColor', '#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626'];
export const PREVIEW_SIZES = [12, 16, 20, 24, 32, 48, 64];

/** 툴바 초기값 — "기본값으로 초기화" 버튼이 이 값으로 되돌린다 */
export const DEFAULTS = { size: 24, strokeWidth: 1.75, color: 'currentColor' };
