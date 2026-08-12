import Icon from './Icon';

/** 페이지 상단 헤더 + 테마 전환 */
export default function Masthead({ count, theme, onToggleTheme }) {
  return (
    <header className="masthead">
      <div className="brand-mark">
        <Icon name="grid" size={22} strokeWidth={1.75} color="#fff" />
      </div>
      <div>
        <h1>아이콘 컴포넌트 테스터</h1>
        <div className="sub">{count}개 아이콘 · 24×24 그리드 · 라인 스타일 · React</div>
      </div>
      <div className="spacer" />
      <button
        className="icon-btn"
        onClick={onToggleTheme}
        title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
        aria-label="테마 전환"
      >
        <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
      </button>
    </header>
  );
}
