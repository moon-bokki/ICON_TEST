/**
 * localStorage 저장소
 * 원격을 쓰든 안 쓰든 항상 여기에 먼저 써 둔다 — 즉시 반영되고, 오프라인·미설정 시 폴백이 된다.
 */
export function readLocal(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 용량 초과 등 — 화면 동작은 계속되어야 하므로 무시 */
  }
}
