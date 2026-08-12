/**
 * 미리보기 배경(stage) 계산
 * 상세 패널의 BgPicker 가 고른 값을 실제 className/style 로 바꾼다.
 */

/** 배경 밝기에 맞춰 글자색(= currentColor 아이콘 색)을 고른다 */
export function contrastText(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#16191f';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#16191f' : '#ffffff';
}

/** 선택한 배경을 stage 에 입히는 className/style */
export function stageProps(bg, customBg) {
  if (bg === 'custom') {
    return { className: 'stage', style: { background: customBg, color: contrastText(customBg) } };
  }
  return { className: `stage bg-${bg}` };
}
