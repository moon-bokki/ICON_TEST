import { useState } from 'react';
import Icon from './Icon';

/**
 * 상세 패널의 삭제 · 복원 버튼
 *
 * - permanent=false : 기본 아이콘 — 목록에서 감추고 언제든 복원할 수 있다
 * - permanent=true  : 화면에서 추가한 아이콘 · 드래그해 넣은 파일 — 되돌릴 수 없으므로 한 번 확인한다
 */
export default function DeleteButton({ hidden, permanent, onDelete, onRestore }) {
  const [confirming, setConfirming] = useState(false);

  if (hidden) {
    return (
      <button className="demo-btn sm" onClick={onRestore}>
        <Icon name="refresh" size={14} />
        복원
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="confirm-row">
        되돌릴 수 없습니다. 삭제할까요?
        <button className="demo-btn sm danger" onClick={onDelete}>
          <Icon name="trash" size={13} />
          삭제
        </button>
        <button className="demo-btn sm ghost" onClick={() => setConfirming(false)}>
          취소
        </button>
      </span>
    );
  }

  return (
    <button
      className="demo-btn sm ghost danger"
      onClick={() => (permanent ? setConfirming(true) : onDelete())}
      title={permanent ? '완전히 삭제합니다' : '목록에서 삭제합니다 (숨김에서 복원 가능)'}
    >
      <Icon name="trash" size={14} />
      삭제
    </button>
  );
}
