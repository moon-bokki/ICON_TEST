/**
 * Supabase 연결 설정 (REST API 직접 호출)
 *
 * @supabase/supabase-js 를 쓰지 않고 fetch 로 PostgREST 를 직접 부른다.
 * 의존성이 늘지 않고, standalone.html 생성기(모듈을 이어붙이는 방식)와도 부딪히지 않는다.
 *
 * 환경변수가 없으면 supabase 는 null 이고, 앱은 localStorage 만 쓰는 기존 동작으로 돌아간다.
 *   .env.local  →  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 */
const env = import.meta.env || {};
const url = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
// Supabase 가 키 이름을 바꿔(anon public → Publishable key) 대시보드가 알려주는 이름이
// 프로젝트 생성 시점에 따라 다르다. 둘 다 같은 공개 키라 어느 쪽이든 받는다.
const anonKey = String(
  env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
).trim();

export const supabase = url && anonKey ? { url, anonKey } : null;

/**
 * PostgREST 요청 한 번
 * @param {string} path   예) '/icons?select=*'
 * @param {object} init   fetch 옵션 (method, body, prefer …)
 */
export async function rest(path, { prefer, ...init } = {}) {
  if (!supabase) throw new Error('Supabase 설정이 없습니다');

  const res = await fetch(`${supabase.url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: supabase.anonKey,
      Authorization: `Bearer ${supabase.anonKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : null),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status} ${detail.slice(0, 160)}`);
  }
  // DELETE 등 본문이 없는 응답
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
