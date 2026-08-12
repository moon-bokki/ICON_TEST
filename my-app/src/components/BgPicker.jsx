import { BACKGROUNDS } from '../lib/assetUtils';

/**
 * 미리보기 배경 선택기 (상세 패널 안)
 * 프리셋 6종 + 직접 고른 색.
 * currentColor 아이콘은 배경의 글자색을 따라가므로
 * 어두운 배경에서도 그대로 보인다.
 */
export default function BgPicker({ value, custom, onChange, onCustom }) {
  return (
    <div className="bg-picker">
      <div className="seg sm" role="group" aria-label="미리보기 배경">
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            className="seg-btn"
            aria-pressed={value === b.id}
            onClick={() => onChange(b.id)}
          >
            {b.label}
          </button>
        ))}
        <button
          className="seg-btn"
          aria-pressed={value === 'custom'}
          onClick={() => onChange('custom')}
        >
          직접
        </button>
      </div>
      <input
        type="color"
        value={custom}
        onChange={(e) => {
          onCustom(e.target.value);
          onChange('custom');
        }}
        title="배경색 직접 선택"
        aria-label="배경색 직접 선택"
      />
    </div>
  );
}
