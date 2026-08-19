import { useRef } from 'react';
import Icon from './Icon';
import { CAFE, FALLBACK_CATEGORY, HIDDEN, SWATCHES } from '../app/constants';

/**
 * 검색 · 크기/두께/색상 조절 · 분류 필터
 * 상태는 App 이 들고 있고 여기서는 표시와 입력만 담당한다.
 */
export default function Toolbar({
  searchRef,
  query,
  onQuery,
  size,
  onSize,
  strokeWidth,
  onStrokeWidth,
  color,
  onColor,
  customColor,
  onCustomColor,
  pixelGrid,
  onPixelGrid,
  onReset,
  category,
  onCategory,
  categories,
  counts,
  onAddFiles,
  onAddSvg,
  hiddenCount,
  onDeleteCategory,
  hasHiddenCategories,
  onRestoreCategories,
}) {
  const fileRef = useRef(null);

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="search">
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="이름 · 태그 · 분류로 검색 (예: 삭제, arrow, 알림)"
            aria-label="아이콘 검색"
          />
          {query ? (
            <button className="clear" onClick={() => onQuery('')} aria-label="검색어 지우기">
              <Icon name="x" size={13} />
            </button>
          ) : (
            <span className="kbd-hint">/</span>
          )}
        </div>

        <div className="control">
          <label htmlFor="size-range">크기</label>
          <input
            id="size-range"
            type="range"
            min="12"
            max="96"
            step="1"
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
          />
          <span className="val">{size}px</span>
        </div>

        <div className="control">
          <label htmlFor="stroke-range">두께</label>
          <input
            id="stroke-range"
            type="range"
            min="0.5"
            max="3"
            step="0.25"
            value={strokeWidth}
            onChange={(e) => onStrokeWidth(Number(e.target.value))}
          />
          <span className="val">{strokeWidth}</span>
        </div>

        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className="swatch"
              aria-pressed={color === c}
              onClick={() => onColor(c)}
              title={c === 'currentColor' ? 'currentColor (글자색 상속)' : c}
              style={c === 'currentColor' ? { background: 'var(--text)' } : { background: c }}
            />
          ))}
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              onCustomColor(e.target.value);
              onColor(e.target.value);
            }}
            title="직접 선택"
            aria-label="사용자 지정 색상"
          />
        </div>

        <button
          className="icon-btn"
          aria-pressed={pixelGrid}
          onClick={() => onPixelGrid(!pixelGrid)}
          title="8px 그리드 오버레이 — 선이 픽셀에 정렬되는지 확인"
        >
          <Icon name="grid" size={17} />
        </button>

        <button className="icon-btn" onClick={onReset} title="기본값으로 초기화">
          <Icon name="refresh" size={17} />
        </button>
      </div>

      <div className="toolbar-row">
        <div className="chips">
          <button
            className="chip"
            aria-pressed={category === '전체'}
            onClick={() => onCategory('전체')}
          >
            전체
            <span className="count">{counts['전체']}</span>
          </button>

          <button
            className="chip cafe"
            aria-pressed={category === CAFE}
            onClick={() => onCategory(CAFE)}
            title="내가 넣은 이미지 아이콘 (icon/ 폴더 + 직접 추가한 파일)"
          >
            <Icon name="image" size={13} />
            {CAFE}
            <span className="count">{counts[CAFE]}</span>
          </button>

          <button
            className="chip add"
            onClick={() => fileRef.current?.click()}
            title="GIF · PNG · SVG · WebP 파일을 cafe On 에 추가"
          >
            <Icon name="plus" size={13} />
            파일 추가
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onAddFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <button
            className="chip add"
            onClick={onAddSvg}
            title="SVG 코드를 붙여넣어 라인 아이콘으로 추가 — 색·두께 조절이 적용됩니다"
          >
            <Icon name="plus" size={13} />
            SVG 아이콘 추가
          </button>

          {hiddenCount > 0 && (
            <button
              className="chip hidden-chip"
              aria-pressed={category === HIDDEN}
              onClick={() => onCategory(HIDDEN)}
              title="삭제한 아이콘 — 여기서 복원할 수 있습니다"
            >
              <Icon name="trash" size={13} />
              {HIDDEN}
              <span className="count">{hiddenCount}</span>
            </button>
          )}

          <span className="chip-divider" aria-hidden="true" />

          {categories.map((c) => (
            <span className="chip-wrap" key={c}>
              <button
                className="chip"
                aria-pressed={category === c}
                onClick={() => onCategory(c)}
              >
                {c}
                <span className="count">{counts[c] ?? 0}</span>
              </button>
              {c !== FALLBACK_CATEGORY && (
                <button
                  className="chip-del"
                  onClick={() => onDeleteCategory(c)}
                  title={`‘${c}’ 분류 지우기 — 아이콘은 그대로 남습니다`}
                  aria-label={`${c} 분류 지우기`}
                >
                  <Icon name="x" size={10} strokeWidth={2.5} />
                </button>
              )}
            </span>
          ))}

          {hasHiddenCategories && (
            <button
              className="chip add"
              onClick={onRestoreCategories}
              title="지운 분류를 모두 되살립니다"
            >
              <Icon name="refresh" size={13} />
              분류 되살리기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
