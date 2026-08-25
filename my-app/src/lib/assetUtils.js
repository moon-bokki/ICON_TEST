/**
 * 이미지 아이콘(cafe On) 공용 유틸
 * - GIF 헤더 파싱, 에셋 로더, 리사이즈·내보내기, 배경 프리셋
 */
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [state, setState] = useState({
    status: 'loading',
    url: src,
    meta: null,
    bytes: null,
    blob: null,
  });
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
          blob: blobRef.current,
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
        setState({ status: 'ok', url, bytes: buf.byteLength, meta: parseGif(buf), blob });
      } catch {
        // file:// 등 — 이미지 자체는 표시되지만 메타데이터는 못 읽는다
        if (alive) setState({ status: 'limited', url: src, meta: null, bytes: null, blob: null });
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
   포맷
   ══════════════════════════════════════════ */
export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
