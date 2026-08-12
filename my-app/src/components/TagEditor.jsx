import { useState } from 'react';
import Icon from './Icon';

/**
 * 태그 편집기
 * 기본 태그(data/icons.js)는 고정, 사용자가 더한 태그만 삭제 가능
 */
export default function TagEditor({ builtin = [], custom = [], onAdd, onRemove, onCopy }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };

  return (
    <div className="tag-editor">
      <div className="tag-row">
        {builtin.map((t) => (
          <span className="tag" key={`b-${t}`}>
            {t}
          </span>
        ))}
        {custom.map((t) => (
          <span className="tag custom" key={`c-${t}`}>
            {t}
            <button type="button" onClick={() => onRemove(t)} aria-label={`${t} 태그 삭제`}>
              <Icon name="x" size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        {builtin.length + custom.length === 0 && (
          <span className="tag-empty">아직 태그가 없습니다</span>
        )}
      </div>

      <form className="tag-form" onSubmit={submit}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="태그 입력 후 Enter · 쉼표로 여러 개"
          aria-label="태그 추가"
        />
        <button type="submit" className="demo-btn sm" disabled={!value.trim()}>
          <Icon name="plus" size={13} />
          추가
        </button>
      </form>

      <div className="tag-foot">
        <span>추가한 태그는 이 브라우저에 저장되며 검색에 바로 반영됩니다.</span>
        <button type="button" className="link-btn" onClick={onCopy}>
          <Icon name="copy" size={12} />
          icons.js 용 tags 복사
        </button>
      </div>
    </div>
  );
}
