/**
 * Supabase 저장소
 *
 * 앱은 데이터를 "이름 → 값" 맵으로 다루므로, 여기서 테이블 행과 맵을 서로 옮긴다.
 *  - kind 'icons'  →  icons 테이블 (아이콘 한 줄이 한 행)
 *  - 그 밖의 kind   →  icon_overrides 테이블 (tag · category · hidden · label)
 */
import { rest } from '../../lib/supabase';

const enc = encodeURIComponent;

/* ── 원격 → 맵 ─────────────────────────────── */
export async function supabaseFetch(kind) {
  if (kind === 'icons') {
    const rows = await rest('/icons?select=name,category,tags,body,scale');
    const map = {};
    for (const r of rows || []) {
      map[r.name] = {
        category: r.category,
        tags: r.tags || [],
        body: r.body,
        ...(r.scale ? { scale: r.scale } : null),
        custom: true,
      };
    }
    return map;
  }

  const rows = await rest(`/icon_overrides?select=key,value&kind=eq.${enc(kind)}`);
  const map = {};
  for (const r of rows || []) map[r.key] = r.value;
  return map;
}

/* ── 맵 → 원격 (있는 것은 갱신, 사라진 것은 삭제) ── */
export async function supabaseSave(kind, map) {
  const keys = Object.keys(map);

  if (kind === 'icons') {
    if (keys.length) {
      const rows = keys.map((name) => ({
        name,
        category: map[name].category || '기타',
        tags: map[name].tags || [],
        body: map[name].body,
        scale: map[name].scale ?? null,
        updated_at: new Date().toISOString(),
      }));
      await rest('/icons', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(rows),
      });
    }
    await pruneRows('/icons', 'name', keys);
    return;
  }

  if (keys.length) {
    const rows = keys.map((key) => ({
      kind,
      key,
      value: map[key],
      updated_at: new Date().toISOString(),
    }));
    await rest('/icon_overrides', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(rows),
    });
  }
  await pruneRows(`/icon_overrides?kind=eq.${enc(kind)}`, 'key', keys);
}

/** 로컬에서 지워진 행을 원격에서도 지운다 */
async function pruneRows(base, column, keep) {
  const sep = base.includes('?') ? '&' : '?';
  if (!keep.length) {
    await rest(`${base}${sep}${column}=not.is.null`, { method: 'DELETE' });
    return;
  }
  // PostgREST in.() 목록 — 쉼표·괄호가 든 값을 위해 각 항목을 큰따옴표로 감싼다
  const list = keep.map((k) => `"${String(k).replace(/"/g, '\\"')}"`).join(',');
  await rest(`${base}${sep}${column}=not.in.(${enc(list)})`, { method: 'DELETE' });
}
