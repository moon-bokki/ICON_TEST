import Icon from './Icon';

/** 화면 하단에 잠깐 뜨는 알림 */
export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check-circle" size={16} />
      {message}
    </div>
  );
}
