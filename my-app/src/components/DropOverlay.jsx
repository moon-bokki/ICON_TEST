import Icon from './Icon';

/** 파일을 페이지 위로 끌고 왔을 때 덮이는 안내 */
export default function DropOverlay() {
  return (
    <div className="drop-overlay">
      <Icon name="download" size={30} />
      <div className="big">놓으면 cafe On 에 추가됩니다</div>
      <div>GIF · PNG · SVG · WebP — 브라우저 안에서만 처리되며 업로드되지 않습니다</div>
    </div>
  );
}
