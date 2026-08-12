import { useEffect, useState } from 'react';
import Icon from './Icon';
import { downloadBlob, formatBytes, renderAtSize } from '../lib/assetUtils';

/**
 * 크기 변환 · 내보내기
 * 원본(예: 640px)을 실제 목표 픽셀로 다시 렌더링해 저장한다
 */
export default function ExportBox({ item, url, size, onToast }) {
  const [px, setPx] = useState(Math.max(8, Math.round(size)));
  const [scale, setScale] = useState(1);
  const [type, setType] = useState('image/png');
  const [result, setResult] = useState(null); // { url, bytes }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const outPx = Math.min(1024, Math.max(8, Math.round(px * scale)));
  const ext = type === 'image/webp' ? 'webp' : 'png';
  const filename = `${item.name}-${px}${scale > 1 ? `@${scale}x` : ''}.${ext}`;

  /* 설정이 바뀌면 미리보기를 다시 만든다 */
  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setError('');
    setBusy(true);

    const timer = setTimeout(async () => {
      try {
        const blob = await renderAtSize(url, outPx, type);
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ url: objectUrl, bytes: blob.size, blob });
      } catch (e) {
        if (alive) {
          setResult(null);
          setError(e.message);
        }
      } finally {
        if (alive) setBusy(false);
      }
    }, 220);

    return () => {
      alive = false;
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, outPx, type]);

  return (
    <div className="export-box">
      <div className="export-row">
        <label htmlFor="export-px">크기</label>
        <input
          id="export-px"
          type="number"
          min="8"
          max="512"
          value={px}
          onChange={(e) => setPx(Math.max(1, Number(e.target.value) || 1))}
        />
        <span className="unit">px</span>
        <div className="seg sm">
          {[1, 2, 3].map((s) => (
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
      </div>

      <div className="export-row">
        <label>형식</label>
        <div className="seg sm">
          <button
            className="seg-btn"
            aria-pressed={type === 'image/png'}
            onClick={() => setType('image/png')}
          >
            PNG
          </button>
          <button
            className="seg-btn"
            aria-pressed={type === 'image/webp'}
            onClick={() => setType('image/webp')}
          >
            WebP
          </button>
        </div>
        <span className="export-out">
          → {outPx} × {outPx}px
        </span>
      </div>

      {error ? (
        <p className="hint export-error">
          {error} — <code>npm run dev</code> 로 실행하거나 파일을 페이지에 드래그해 추가하면 변환할
          수 있습니다.
        </p>
      ) : (
        <div className="export-result">
          <div className="export-preview">
            {result && (
              <img
                src={result.url}
                alt="변환 결과"
                style={{ width: Math.min(outPx, 128), height: Math.min(outPx, 128) }}
              />
            )}
          </div>
          <div className="export-info">
            <div className="export-size">
              {busy ? '변환 중…' : result ? formatBytes(result.bytes) : '—'}
            </div>
            <div className="export-name">{filename}</div>
            <button
              className="demo-btn sm"
              disabled={!result || busy}
              onClick={() => {
                downloadBlob(result.blob, filename);
                onToast(`${filename} 저장됨`);
              }}
            >
              <Icon name="download" size={13} />
              내려받기
            </button>
          </div>
        </div>
      )}

      <p className="hint">
        원본을 목표 픽셀로 다시 그려 저장합니다. <b>애니메이션은 유지되지 않고 정지 이미지 한 장</b>
        으로 저장됩니다 — 움직임을 살리려면 원본 툴(AE·Lottie)에서 작은 크기로 다시 내보내세요.
      </p>
    </div>
  );
}
