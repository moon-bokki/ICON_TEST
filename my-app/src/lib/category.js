/**
 * 아이콘 분류 계산
 *
 * 사용자가 분류를 옮기면 override 맵에 저장되고, 원래 분류 대신 그 값을 쓴다.
 * 키 규칙은 사용자 태그와 동일하다 — 라인 아이콘은 아이콘 이름, 이미지 아이콘은 "@파일명".
 */
import { lookupIcon } from '../data/customIcons';

/** 이미지 아이콘의 저장 키 */
export function assetKey(item) {
  return '@' + item.file;
}

/** 라인 아이콘의 현재 분류 (옮긴 적 없으면 icons.js 의 기본 분류) */
export function iconCategory(name, overrides = {}) {
  return overrides[name] || lookupIcon(name)?.category;
}

/** 이미지 아이콘의 현재 분류 (옮긴 적 없으면 fallback — 보통 'cafe On') */
export function assetCategory(item, overrides = {}, fallback) {
  return overrides[assetKey(item)] || fallback;
}
