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

/**
 * 아이콘에 걸린 크기 보정 배율.
 *
 * viewBox 가 24×24 가 아닌 SVG 는 <g transform="scale(k)"> 로 감싸 맞추는데,
 * scale() 은 선 두께까지 k 배로 줄인다. Icon 이 두께를 1/k 로 키워 되돌리도록
 * 그 배율을 알려 준다. scale 값이 없는 예전 데이터는 body 에서 직접 읽는다.
 */
export function iconScale(icon) {
  if (!icon) return 1;
  if (icon.scale) return icon.scale;
  const m = /^<g transform="scale\(([0-9.]+)\)/.exec(icon.body || '');
  return m ? Number(m[1]) || 1 : 1;
}
