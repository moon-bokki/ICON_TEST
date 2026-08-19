import { useState } from 'react';
import Icon from './Icon';
import { ICON_NAME_RULE } from '../app/constants';

/**
 * 상세 패널 머리말의 이름 편집기
 * 평소에는 이름만 보여 주고, 연필 버튼을 누르면 입력칸으로 바뀐다.
 */
export default function NameEditor({ name, existingNames, onRename, freeform }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  // 이미지 아이콘의 라벨은 코드 키가 아니라 표시용이라 한글·대문자도 허용한다
  const value = freeform ? draft.trim() : draft.trim().toLowerCase();
  const unchanged = value === name;
  const duplicate = !unchanged && existingNames.includes(value);
  const invalid = !freeform && !!value && !ICON_NAME_RULE.test(value);
  const ready = !!value && !duplicate && !invalid;

  const open = () => {
    setDraft(name);
    setEditing(true);
  };

  const close = () => {
    setEditing(false);
    setDraft(name);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    if (!unchanged) onRename(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <>
        <span className="title">{name}</span>
        <button className="icon-btn" onClick={open} title="이름 수정" aria-label="이름 수정">
          <Icon name="edit" size={15} />
        </button>
      </>
    );
  }

  return (
    <form className="name-editor" onSubmit={submit}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        aria-label="아이콘 이름"
        aria-invalid={duplicate || invalid}
      />
      <button type="submit" className="icon-btn" disabled={!ready} title="확인" aria-label="확인">
        <Icon name="check" size={16} />
      </button>
      <button type="button" className="icon-btn" onClick={close} title="취소" aria-label="취소">
        <Icon name="x" size={16} />
      </button>
      {(duplicate || invalid) && (
        <span className="name-error">
          {duplicate ? '이미 있는 이름입니다' : '영문 소문자·숫자·하이픈(-)만 쓸 수 있습니다'}
        </span>
      )}
    </form>
  );
}
