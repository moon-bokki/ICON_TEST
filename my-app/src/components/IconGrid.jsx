import Icon from './Icon';
import { CAFE, HIDDEN } from '../app/constants';

/**
 * 아이콘 그리드
 * 라인 아이콘(names)과 cafe On 이미지 아이콘(assets)을 한 그리드에 함께 보여준다.
 */
export default function IconGrid({
  names,
  assets,
  size,
  iconProps,
  pixelGrid,
  dimmed,
  selected,
  onSelect,
}) {
  if (names.length + assets.length === 0) return null;

  /** 삭제한 아이콘 목록(숨김)을 볼 때는 흐리게 보여 준다 */
  const extra = `${pixelGrid ? ' pixelgrid' : ''}${dimmed ? ' dimmed' : ''}`;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(104, size + 56)}px, 1fr))`,
      }}
    >
      {assets.map((item) => (
        <button
          key={item.url}
          className={`cell asset${extra}`}
          aria-selected={selected?.type === 'asset' && selected.item.url === item.url}
          onClick={() => onSelect({ type: 'asset', item })}
          title={`${item.file} — 클릭하면 상세 보기`}
        >
          <span className="glyph">
            <img
              src={item.url}
              alt=""
              width={size}
              height={size}
              style={{ width: size, height: size, objectFit: 'contain' }}
            />
          </span>
          <span className="name">{item.name}</span>
        </button>
      ))}

      {names.map((name) => (
        <button
          key={name}
          className={`cell${extra}`}
          aria-selected={selected?.type === 'icon' && selected.name === name}
          onClick={() => onSelect({ type: 'icon', name })}
          title={`${name} — 클릭하면 상세 보기`}
        >
          <span className="glyph">
            <Icon name={name} {...iconProps} spin={name === 'loader'} />
          </span>
          <span className="name">{name}</span>
        </button>
      ))}
    </div>
  );
}

/** 검색 결과가 없을 때 */
export function EmptyState({ category, query }) {
  if (category === HIDDEN) {
    return (
      <div className="empty">
        <div className="big">삭제한 아이콘이 없습니다</div>
        <div>상세 패널의 삭제 버튼으로 목록에서 감춘 아이콘이 여기 모입니다.</div>
      </div>
    );
  }
  if (category === CAFE && !query) {
    return (
      <div className="empty">
        <div className="big">cafe On 에 아직 파일이 없습니다</div>
        <div>
          파일을 이 페이지에 끌어다 놓거나 위의 <b>파일 추가</b> 버튼을 누르세요. GIF · PNG · SVG ·
          WebP 를 지원합니다.
        </div>
      </div>
    );
  }
  return (
    <div className="empty">
      <div className="big">일치하는 아이콘이 없습니다</div>
      <div>다른 검색어를 입력하거나 분류를 ‘전체’로 바꿔 보세요.</div>
    </div>
  );
}
