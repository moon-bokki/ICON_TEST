import { useState } from 'react';
import Icon from './Icon';
import { downloadBlob, formatBytes, renderAtSize } from '../lib/assetUtils';

const DOWNLOAD_SCALES = [1, 2, 3];

/**
 * 라인 아이콘 파일 내려받기 (상세 패널)
 *
 * SVG : 벡터라 크기와 무관하다. 툴바에서 고른 두께·색이 그대로 담긴다.
 * PNG : 고른 픽셀 크기로 실제 래스터 이미지를 만들어 저장한다.
 */
export default function DownloadBox({ name, svg, size, color, onToast }) {
  const [px, setPx] = useState(Math.max(8, Math.round(size)));
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const outPx = Math.min(1024, Math.max(8, Math.round(px * scale)));

  const saveSvg = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${name}.svg`);
    onToast(`${name}.svg 저장됨 · ${formatBytes(blob.size)}`);
  };

  const savePng = async () => {
    setBusy(true);
    setError('');
    let url = null;
    try {
      // PNG 는 색을 상속할 수 없으므로 currentColor 를 지금 화면의 글자색으로 바꿔 굽는다
      const solid =
        color === 'currentColor'
          ? getComputedStyle(document.documentElement).getPropertyValue('--text').trim() ||
            '#16191f'
          : color;
      const source = svg.replace(/currentColor/g, solid);

      url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
      const blob = await renderAtSize(url, outPx, 'image/png');
      const filename = `${name}-${px}${scale > 1 ? `@${scale}x` : ''}.png`;
      downloadBlob(blob, filename);
      onToast(`${filename} 저장됨 · ${formatBytes(blob.size)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      if (url) URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  return (
    <div className="export-box">
      <div className="export-row">
        <label htmlFor="download-px">크기</label>
        <input
          id="download-px"
          type="number"
          min="8"
          max="512"
          value={px}
          onChange={(e) => setPx(Math.max(1, Number(e.target.value) || 1))}
        />
        <span className="unit">px</span>
        <div className="seg sm">
          {DOWNLOAD_SCALES.map((s) => (
            <button
              key={s}
              className="seg-btn"
              aria-pressed={scale === s}
              onClick={() => setScale(s)}
            >
              @{s}x
            </button>
          ))}
        </div>
        <span className="export-out">
          → {outPx} × {outPx}px
        </span>
      </div>

      <div className="demo-row">
        <button className="demo-btn sm" onClick={saveSvg}>
          <Icon name="download" size={13} />
          SVG 내려받기
        </button>
        <button className="demo-btn sm" onClick={savePng} disabled={busy}>
          <Icon name="download" size={13} />
          {busy ? '만드는 중…' : 'PNG 내려받기'}
        </button>
      </div>

      {error && (
        <p className="hint import-error">
          <Icon name="alert-triangle" size={13} /> {error}
        </p>
      )}

      <p className="hint">
        SVG 는 벡터라 크기 설정과 무관하며 위 <b>크기·두께·색상</b> 설정이 그대로 담깁니다.
        색이 <code>currentColor</code> 면 쓰는 곳의 글자색을 따라가고, PNG 로 구울 때는 지금
        화면의 글자색으로 고정됩니다.
      </p>
    </div>
  );
}
