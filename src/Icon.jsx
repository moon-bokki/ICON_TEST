import { forwardRef, useMemo } from 'react';
import { ICONS } from './icons';

/**
 * 아이콘 컴포넌트
 *
 * @example
 * <Icon name="search" />
 * <Icon name="loader" size={20} spin />
 * <Icon name="trash" color="#dc2626" strokeWidth={2} title="삭제" />
 *
 * props
 *  - name        : 아이콘 이름 (필수)
 *  - size        : px 크기 (기본 24). CSS 로 제어하려면 size="1em"
 *  - strokeWidth : 선 두께 (기본 1.75)
 *  - color       : 색상 (기본 currentColor — 부모 글자색을 따라감)
 *  - title       : 지정하면 의미 있는 이미지(role="img")로, 없으면 장식용(aria-hidden)
 *  - spin        : 회전 애니메이션
 *  - pulse       : 깜빡임 애니메이션
 *  - rotate      : 회전 각도 (deg)
 *  - flip        : 'x' | 'y' | 'xy'
 *  - absoluteStrokeWidth : true 면 크기가 변해도 선 두께를 24px 기준으로 고정
 */
const Icon = forwardRef(function Icon(
  {
    name,
    size = 24,
    strokeWidth = 1.75,
    color = 'currentColor',
    title,
    spin = false,
    pulse = false,
    rotate = 0,
    flip,
    absoluteStrokeWidth = false,
    className = '',
    style,
    ...rest
  },
  ref
) {
  const icon = ICONS[name];

  const transform = useMemo(() => {
    const t = [];
    if (rotate) t.push(`rotate(${rotate}deg)`);
    if (flip === 'x' || flip === 'xy') t.push('scaleX(-1)');
    if (flip === 'y' || flip === 'xy') t.push('scaleY(-1)');
    return t.length ? t.join(' ') : undefined;
  }, [rotate, flip]);

  if (!icon) {
    console.warn(`[Icon] "${name}" 아이콘을 찾을 수 없습니다.`);
    return null;
  }

  const numeric = typeof size === 'number' || /^\d+(\.\d+)?$/.test(String(size));
  const px = numeric ? Number(size) : null;
  const sw = absoluteStrokeWidth && px ? (strokeWidth * 24) / px : strokeWidth;

  const cls = ['ui-icon', spin && 'ui-icon-spin', pulse && 'ui-icon-pulse', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      ref={ref}
      className={cls}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px ?? size}
      height={px ?? size}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ display: 'block', flex: 'none', transform, ...style }}
      dangerouslySetInnerHTML={{
        __html: (title ? `<title>${escapeXml(title)}</title>` : '') + icon.body,
      }}
      {...rest}
    />
  );
});

function escapeXml(s) {
  return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

/** 아이콘 하나를 독립 실행 가능한 SVG 문자열로 반환 */
export function toSvgString(name, { size = 24, strokeWidth = 1.75, color = 'currentColor' } = {}) {
  const icon = ICONS[name];
  if (!icon) return '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="${strokeWidth}" ` +
    `stroke-linecap="round" stroke-linejoin="round">` +
    icon.body.replace(/\/><path/g, '/>\n  <path').replace(/^</, '\n  <') +
    `\n</svg>`
  );
}

export default Icon;
