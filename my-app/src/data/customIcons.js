/**
 * 사용자가 화면에서 추가한 아이콘 레지스트리
 *
 * icons.js 는 소스에 박혀 있는 기본 아이콘이고, 여기에는 실행 중 추가한 아이콘이 담긴다.
 * Icon 컴포넌트가 이름을 찾을 때 두 곳을 모두 뒤지도록 lookupIcon 을 쓴다.
 * (내용 자체는 useCustomIcons 훅이 localStorage 와 동기화한다)
 */
import { ICONS } from './icons';

export const CUSTOM_ICONS = {};

/** 레지스트리 내용을 map 으로 교체 — 렌더 도중 호출해도 안전하도록 같은 객체를 유지한다 */
export function registerCustomIcons(map) {
  for (const key of Object.keys(CUSTOM_ICONS)) delete CUSTOM_ICONS[key];
  Object.assign(CUSTOM_ICONS, map || {});
}

/** 기본 아이콘 → 사용자 아이콘 순으로 찾는다 */
export function lookupIcon(name) {
  return ICONS[name] || CUSTOM_ICONS[name];
}
