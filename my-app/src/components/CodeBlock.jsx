import Icon from './Icon';

/** 복사 버튼이 달린 코드 블록 */
export default function CodeBlock({ code, onCopy }) {
  return (
    <div className="code-block">
      <pre>{code}</pre>
      <button className="copy" onClick={onCopy} aria-label="복사">
        <Icon name="copy" size={14} />
      </button>
    </div>
  );
}
