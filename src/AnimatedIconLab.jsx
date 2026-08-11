import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { ICONS } from './icons';

export const SIZE_LADDER = [16, 20, 24, 32, 48, 64, 96, 128];

export const BACKGROUNDS = [
  { id: 'checker', label: '투명(체커)' },
  { id: 'white', label: '흰색' },
  { id: 'gray', label: '회색' },
  { id: 'dark', label: '검정' },
  { id: 'brand', label: '브랜드' },
  { id: 'photo', label: '사진' },
];

/* ══════════════════════════════════════════
   GIF 헤더 파서
   해상도 · 프레임 수 · 재생 시간 · 반복 · 투명도
   ══════════════════════════════════════════ */
function skipSubBlocks(b, p) {
  while (p < b.length && b[p] !== 0) p += b[p] + 1;
  return p + 1;
}

function parseGif(buffer) {
  const b = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  // 헤더(13바이트)조차 없으면 GIF 가 아니거나 잘린 파일
  if (b.length < 13) return null;
  if (String.fromCharCode(b[0], b[1], b[2]) !== 'GIF') return null;

  /** 범위를 벗어난 읽기는 0 으로 (잘린 파일 방어) */
  const u16 = (o) => (o + 1 < b.length ? dv.getUint16(o, true) : 0);

  const width = u16(6);
  const height = u16(8);
  const packed = b[10];

  const hasGlobalPalette = !!(packed & 0x80);
  let p = 13;
  if (hasGlobalPalette) p += 3 * (1 << ((packed & 7) + 1)); // 전역 색상표 건너뛰기

  let frames = 0;
  let durationMs = 0;
  let transparent = false;
  let loops = null;
  let localPalettes = 0;
  let guard = 0;

  while (p < b.length && guard++ < 200000) {
    const marker = b[p];

    if (marker === 0x3b) break; // trailer

    if (marker === 0x21) {
      const label = b[p + 1];
      p += 2;
      if (label === 0xf9) {
        // Graphic Control Extension
        const size = b[p];
        const gce = b[p + 1];
        const delay = u16(p + 2);
        if (gce & 1) transparent = true;
        // 브라우저는 delay < 2 를 10(=100ms)으로 보정한다
        durationMs += (delay < 2 ? 10 : delay) * 10;
        p = skipSubBlocks(b, p + size + 1);
      } else if (label === 0xff) {
        // Application Extension (NETSCAPE 반복 횟수)
        const size = b[p];
        const app = String.fromCharCode(...b.slice(p + 1, p + 12));
        const q = p + 1 + size;
        if (app.startsWith('NETSCAPE') && b[q] >= 3) loops = u16(q + 2);
        p = skipSubBlocks(b, q);
      } else if (label === 0xfe) {
        p = skipSubBlocks(b, p); // Comment
      } else {
        p = skipSubBlocks(b, p + 1 + b[p]); // Plain Text 등
      }
    } else if (marker === 0x2c) {
      // Image Descriptor
      frames++;
      const lpacked = b[p + 9];
      p += 10;
      if (lpacked & 0x80) {
        localPalettes++;
        p += 3 * (1 << ((lpacked & 7) + 1)); // 지역 색상표
      }
      p += 1; // LZW 최소 코드 크기
      p = skipSubBlocks(b, p);
    } else {
      p++;
    }
  }

  return {
    format: 'GIF',
    width,
    height,
    frames,
    durationMs,
    loops, // 0 = 무한
    transparent,
    // 프레임이 지역 팔레트를 쓰면 색상은 프레임마다 따로 정해진다
    localPalettes,
    colors: hasGlobalPalette ? 1 << ((packed & 7) + 1) : null,
  };
}

/* ══════════════════════════════════════════
   에셋 로더
   fetch 로 원본을 읽어 메타데이터 + Blob URL 확보.
   file:// 로 열었을 때는 fetch 가 막히므로 <img> 직접 로드로 폴백.
   ══════════════════════════════════════════ */
export function useAsset(src, initialBlob) {
  const [state, setState] = useState({ status: 'loading', url: src, meta: null, bytes: null });
  const blobRef = useRef(initialBlob || null);
  const urlRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      // 드롭된 파일은 이미 Blob 을 가지고 있다
      if (blobRef.current) {
        const buf = await blobRef.current.arrayBuffer();
        if (!alive) return;
        const url = URL.createObjectURL(blobRef.current);
        urlRef.current = url;
        setState({
          status: 'ok',
          url,
          bytes: blobRef.current.size,
          meta: parseGif(buf),
        });
        return;
      }

      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        if (!alive) return;
        const blob = new Blob([buf]);
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setState({ status: 'ok', url, bytes: buf.byteLength, meta: parseGif(buf) });
      } catch {
        // file:// 등 — 이미지 자체는 표시되지만 메타데이터는 못 읽는다
        if (alive) setState({ status: 'limited', url: src, meta: null, bytes: null });
      }
    }

    load();
    return () => {
      alive = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [src]);

  /** 애니메이션 처음부터 다시 재생 */
  const restart = useCallback(() => {
    setState((s) => {
      if (blobRef.current) {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blobRef.current);
        urlRef.current = url;
        return { ...s, url };
      }
      const base = src.split('?')[0];
      return { ...s, url: `${base}?r=${Date.now()}` };
    });
  }, [src]);

  return [state, restart];
}

/* ══════════════════════════════════════════
   실제 픽셀 크기로 다시 렌더링 (리사이즈 · 내보내기)
   640px 원본을 24px 로 "표시"만 하는 게 아니라
   진짜 24px 이미지로 만들어 준다.
   ══════════════════════════════════════════ */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
    img.src = url;
  });
}

/**
 * @param url   원본 이미지 URL (blob: 권장 — file:// 경로는 캔버스가 오염된다)
 * @param px    출력할 정사각형 픽셀 크기
 * @param type  'image/png' | 'image/webp'
 * @returns {Promise<Blob>}
 */
export async function renderAtSize(url, px, type = 'image/png') {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 비율을 유지한 채 정사각형 캔버스 가운데 배치
  const w = img.naturalWidth || px;
  const h = img.naturalHeight || px;
  const ratio = Math.min(px / w, px / h);
  const dw = Math.max(1, Math.round(w * ratio));
  const dh = Math.max(1, Math.round(h * ratio));
  ctx.drawImage(img, Math.round((px - dw) / 2), Math.round((px - dh) / 2), dw, dh);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다'))),
        type
      );
    } catch {
      // 캔버스 오염(file:// 에서 흔함)
      reject(new Error('보안 정책 때문에 이 이미지를 변환할 수 없습니다'));
    }
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ══════════════════════════════════════════
   메인
   ══════════════════════════════════════════ */
export default function AnimatedIconLab({ strokeWidth = 1.75, items = [], onAddFiles, onRemove }) {
  const [bg, setBg] = useState('checker');
  const [restartSignal, setRestartSignal] = useState(0);
  const inputRef = useRef(null);

  return (
    <section className="lab anim-lab" id="cafe-on-lab">
      <h2>컬러 · 애니메이션 아이콘</h2>
      <p className="lead">
        GIF·APNG·WebP·SVG 같은 컬러 아이콘은 라인 아이콘과 점검 항목이 다릅니다. 축소했을 때의
        가독성, 배경 투명도, 파일 용량, 프레임 수를 함께 확인하세요.
      </p>

      <div className="anim-toolbar">
        <div className="seg" role="group" aria-label="미리보기 배경">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              className="seg-btn"
              aria-pressed={bg === b.id}
              onClick={() => setBg(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="spacer" />

        <button className="demo-btn sm" onClick={() => setRestartSignal((n) => n + 1)}>
          <Icon name="refresh" size={14} strokeWidth={strokeWidth} />
          전체 다시 재생
        </button>
        <button className="demo-btn sm" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={14} strokeWidth={strokeWidth} />
          파일 추가
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onAddFiles?.(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length === 0 ? (
        <div className="dropzone">
          <Icon name="image" size={28} strokeWidth={strokeWidth} />
          <div className="big">테스트할 아이콘 파일을 여기에 끌어다 놓으세요</div>
          <div>GIF · APNG · WebP · SVG · PNG — 또는 icon/ 폴더에 넣으면 자동으로 나타납니다</div>
        </div>
      ) : (
        <div className="anim-grid">
          {items.map((item) => (
            <AssetCard
              key={item.url + item.name}
              item={item}
              bg={bg}
              strokeWidth={strokeWidth}
              restartSignal={restartSignal}
              onRemove={item.dropped ? () => onRemove?.(item) : undefined}
            />
          ))}
        </div>
      )}

      <p className="hint" style={{ marginTop: 14 }}>
        페이지 아무 곳에나 파일을 드래그하면 즉시 추가로 테스트할 수 있습니다. 드롭한 파일은
        브라우저 안에서만 사용되며 어디에도 업로드되지 않습니다.
      </p>
    </section>
  );
}

/* ══════════════════════════════════════════
   에셋 카드
   ══════════════════════════════════════════ */
function AssetCard({ item, bg, strokeWidth, restartSignal, onRemove }) {
  const [{ status, url, meta, bytes }, restart] = useAsset(item.url, item.blob);
  const [natural, setNatural] = useState(null);
  const [alpha, setAlpha] = useState(null); // true = 투명 배경 있음
  const [frameShot, setFrameShot] = useState(null);
  const [captureError, setCaptureError] = useState(false);
  const imgRef = useRef(null);
  const first = useRef(true);

  /* 전체 다시 재생 신호 */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    restart();
  }, [restartSignal, restart]);

  /* 모서리 픽셀의 알파값으로 투명 배경 여부 판정 */
  const onLoad = (e) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    if (alpha !== null) return;
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const { width: w, height: h } = c;
      const pts = [
        [1, 1],
        [w - 2, 1],
        [1, h - 2],
        [w - 2, h - 2],
      ];
      const transparentCorners = pts.filter(
        ([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] < 16
      ).length;
      setAlpha(transparentCorners >= 3);
    } catch {
      setAlpha(meta ? meta.transparent : null); // 캔버스가 오염된 경우 GIF 플래그로 대체
    }
  };

  const capture = () => {
    const img = imgRef.current;
    if (!img) return;
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      setFrameShot(c.toDataURL('image/png'));
      setCaptureError(false);
    } catch {
      setCaptureError(true);
    }
  };

  const ext = (item.file.match(/\.([^.]+)$/)?.[1] || '').toUpperCase();
  const transparent = alpha ?? meta?.transparent ?? null;
  const issues = diagnose({ bytes, meta, natural, transparent, ext });
  const twin = useMemo(() => findLineTwin(item.name), [item.name]);

  return (
    <div className="card anim-card">
      <div className="anim-head">
        <span className="anim-name">{item.file}</span>
        <span className="tag">{ext || '?'}</span>
        {item.dropped && <span className="tag">드롭됨</span>}
        <span className="spacer" />
        {onRemove && (
          <button className="icon-btn sm" onClick={onRemove} aria-label="목록에서 제거">
            <Icon name="x" size={14} strokeWidth={strokeWidth} />
          </button>
        )}
      </div>

      {/* 크기별 렌더링 */}
      <div className={`anim-stage bg-${bg}`}>
        <div className="ladder">
          {SIZE_LADDER.map((s, i) => (
            <figure key={s}>
              <img
                ref={i === SIZE_LADDER.length - 1 ? imgRef : undefined}
                src={url}
                alt={`${item.name} ${s}px`}
                width={s}
                height={s}
                onLoad={i === SIZE_LADDER.length - 1 ? onLoad : undefined}
                style={{ width: s, height: s, objectFit: 'contain' }}
              />
              <figcaption>{s}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="demo-row" style={{ marginTop: 10 }}>
        <button className="demo-btn sm" onClick={restart}>
          <Icon name="play" size={13} strokeWidth={strokeWidth} /> 처음부터
        </button>
        <button className="demo-btn sm" onClick={capture}>
          <Icon name="camera" size={13} strokeWidth={strokeWidth} /> 현재 프레임 캡처
        </button>
        {frameShot && (
          <button className="demo-btn sm ghost" onClick={() => setFrameShot(null)}>
            캡처 지우기
          </button>
        )}
      </div>

      {captureError && (
        <p className="hint">
          캔버스 보안 정책으로 캡처할 수 없습니다. <code>npm run dev</code> 로 실행하거나 파일을
          드래그해서 추가하면 캡처가 가능합니다.
        </p>
      )}

      {frameShot && (
        <div className="frame-shot">
          <div className="section-label">정지 프레임 (애니메이션이 멈췄을 때의 모습)</div>
          <div className={`anim-stage bg-${bg}`} style={{ padding: 12 }}>
            <div className="ladder">
              {[16, 24, 32, 48].map((s) => (
                <figure key={s}>
                  <img src={frameShot} alt="정지 프레임" style={{ width: s, height: s }} />
                  <figcaption>{s}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 메타데이터 */}
      <dl className="meta anim-meta">
        <dt>원본 해상도</dt>
        <dd>{natural ? `${natural.w} × ${natural.h}px` : '…'}</dd>
        <dt>파일 용량</dt>
        <dd>{bytes != null ? formatBytes(bytes) : status === 'limited' ? '측정 불가' : '…'}</dd>
        {meta && (
          <>
            <dt>프레임</dt>
            <dd>
              {meta.frames}장 · {(meta.durationMs / 1000).toFixed(1)}초 ·{' '}
              {meta.loops === 0 || meta.loops == null ? '무한 반복' : `${meta.loops}회 반복`}
            </dd>
            <dt>재생 속도</dt>
            <dd>
              평균 {meta.durationMs > 0 ? Math.round(meta.frames / (meta.durationMs / 1000)) : 0}
              fps
            </dd>
            <dt>색상 팔레트</dt>
            <dd>
              {meta.localPalettes > 0
                ? `프레임별 지역 팔레트 ${meta.localPalettes}개 (프레임당 최대 256색)`
                : meta.colors
                  ? `전역 팔레트 최대 ${meta.colors}색`
                  : '팔레트 정보 없음'}
            </dd>
          </>
        )}
        <dt>배경</dt>
        <dd>
          {transparent === null
            ? '확인 불가'
            : transparent
              ? '투명 (모서리 알파 확인됨)'
              : '불투명 — 어두운 배경에서 사각형이 보입니다'}
        </dd>
      </dl>

      {/* 진단 */}
      {issues.length > 0 && (
        <div className="diagnostics">
          {issues.map((it) => (
            <div className={`diag ${it.level}`} key={it.text}>
              <Icon
                name={it.level === 'err' ? 'x-circle' : it.level === 'warn' ? 'alert-triangle' : 'info'}
                size={14}
                strokeWidth={strokeWidth}
              />
              <span>{it.text}</span>
            </div>
          ))}
        </div>
      )}

      {status === 'limited' && (
        <p className="hint">
          <code>file://</code> 로 열어 메타데이터를 읽지 못했습니다. 파일 용량·프레임 정보를
          보려면 이 카드에 파일을 드래그해 넣거나 <code>npm run dev</code> 로 실행하세요.
        </p>
      )}

      {/* 실제 UI 안에서 */}
      <div className="section-label">실제 UI 안에서</div>
      <div className="demo-row" style={{ marginBottom: 10 }}>
        <button className="demo-btn">
          <img src={url} alt="" width={18} height={18} style={{ objectFit: 'contain' }} />
          {item.name}
        </button>
        <button className="demo-btn primary">
          <img src={url} alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
          버튼 안 16px
        </button>
        <span className="badge ok">
          <img src={url} alt="" width={13} height={13} style={{ objectFit: 'contain' }} />
          배지 13px
        </span>
      </div>

      {/* 라인 아이콘과 비교 */}
      {twin && (
        <>
          <div className="section-label">같은 뜻의 라인 아이콘과 비교</div>
          <div className="twin-row">
            {[16, 24, 32, 48].map((s) => (
              <div className="twin" key={s}>
                <div className="twin-pair">
                  <img src={url} alt="" width={s} height={s} style={{ objectFit: 'contain' }} />
                  <Icon name={twin} size={s} strokeWidth={strokeWidth} />
                </div>
                <span className="twin-cap">{s}px</span>
              </div>
            ))}
            <div className="twin-note">
              왼쪽 컬러 · 오른쪽 <code>{twin}</code> — 작은 크기에서 어느 쪽이 더 빨리 읽히는지
              비교해 보세요.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   유틸
   ══════════════════════════════════════════ */
export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function diagnose({ bytes, meta, natural, transparent, ext }) {
  const out = [];

  if (bytes != null) {
    if (bytes > 500 * 1024)
      out.push({
        level: 'err',
        text: `${formatBytes(bytes)} — 아이콘 하나 용량으로 매우 큽니다. Lottie(JSON) 또는 애니메이션 WebP 로 바꾸면 보통 20~50배 줄어듭니다.`,
      });
    else if (bytes > 100 * 1024)
      out.push({ level: 'warn', text: `${formatBytes(bytes)} — 아이콘치고 큰 편입니다.` });
  }

  if (natural && natural.w > 256)
    out.push({
      level: 'warn',
      text: `원본이 ${natural.w}px인데 실제로는 16~48px로 쓰입니다. 표시 크기의 2배(최대 96px)로 다시 내보내면 용량이 크게 줄어듭니다.`,
    });

  if (meta && meta.frames > 100)
    out.push({
      level: 'warn',
      text: `${meta.frames}프레임 — 프레임을 줄이거나(12~24fps) 재생 길이를 짧게 하면 가벼워집니다.`,
    });

  if (meta && meta.durationMs > 0) {
    const fps = meta.frames / (meta.durationMs / 1000);
    if (fps > 30)
      out.push({
        level: 'warn',
        text: `약 ${Math.round(fps)}fps — 작은 아이콘에서는 24fps 이하로도 차이를 느끼기 어렵습니다. 프레임을 절반으로 줄이면 용량도 대략 절반이 됩니다.`,
      });
  }

  if (transparent === false)
    out.push({
      level: 'err',
      text: '투명 배경이 아닙니다. 다크 모드나 색 배경 위에서 흰 사각형이 그대로 보입니다.',
    });

  if (ext === 'GIF')
    out.push({
      level: 'info',
      text: 'GIF는 256색 · 알파 1비트라 가장자리가 계단처럼 보일 수 있습니다. 부드러운 경계가 필요하면 WebP/Lottie 를 권장합니다.',
    });

  return out;
}

/** 이름이 비슷한 라인 아이콘 찾기 (serch → search 처럼 오타도 허용) */
function findLineTwin(name) {
  const key = name.toLowerCase().replace(/[-_\s]/g, '');
  let best = null;
  let bestScore = 3; // 편집 거리 2 이하만 채택
  for (const n of Object.keys(ICONS)) {
    const d = editDistance(key, n.replace(/-/g, ''));
    if (d < bestScore) {
      bestScore = d;
      best = n;
    }
  }
  return best;
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}
