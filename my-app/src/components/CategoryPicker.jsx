import { useState } from 'react';
import Icon from './Icon';

const NEW_CATEGORY = '__new__';

/**
 * 분류 이동 선택기 (상세 패널 안)
 * 기존 분류 중에서 고르거나, 새 분류를 만들어 옮긴다.
 * 기본 분류(icons.js)와 달라지면 '되돌리기' 버튼이 나타난다.
 */
export default function CategoryPicker({
  value,
  builtin,
  categories,
  onChange,
  onReset,
  onCopy,
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  // 목록에 없는 분류(직접 만든 것)로 옮겨둔 상태라면 그 값도 보여준다
  const options = categories.includes(value) ? categories : [...categories, value];
  const moved = value !== builtin;

  const submit = (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onChange(name);
    setDraft('');
    setCreating(false);
  };

  return (
    <div className="category-picker">
      <div className="category-row">
        <select
          className="category-select"
          value={creating ? NEW_CATEGORY : value}
          onChange={(e) => {
            if (e.target.value === NEW_CATEGORY) {
              setCreating(true);
              return;
            }
            setCreating(false);
            onChange(e.target.value);
          }}
          aria-label="분류 이동"
        >
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={NEW_CATEGORY}>+ 새 분류 만들기…</option>
        </select>

        {moved && (
          <button
            type="button"
            className="demo-btn sm ghost"
            onClick={onReset}
            title={`기본 분류 ‘${builtin}’ 로 되돌리기`}
          >
            <Icon name="refresh" size={13} />
            되돌리기
          </button>
        )}
      </div>

      {creating && (
        <form className="tag-form" onSubmit={submit}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="새 분류 이름 입력 후 Enter"
            aria-label="새 분류 이름"
          />
          <button type="submit" className="demo-btn sm" disabled={!draft.trim()}>
            <Icon name="plus" size={13} />
            만들기
          </button>
          <button
            type="button"
            className="demo-btn sm ghost"
            onClick={() => {
              setCreating(false);
              setDraft('');
            }}
          >
            취소
          </button>
        </form>
      )}

      <div className="tag-foot">
        <span>
          {moved
            ? `기본 분류는 ‘${builtin}’ 입니다. 옮긴 기록은 이 브라우저에 저장됩니다.`
            : '옮기면 분류 필터에 바로 반영되고 이 브라우저에 저장됩니다.'}
        </span>
        <button type="button" className="link-btn" onClick={onCopy}>
          <Icon name="copy" size={12} />
          icons.js 용 category 복사
        </button>
      </div>
    </div>
  );
}
