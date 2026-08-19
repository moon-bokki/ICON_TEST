/**
 * 저장소 선택
 *
 * Supabase 설정(.env.local)이 있으면 원격과 동기화하고, 없으면 localStorage 만 쓴다.
 * standalone.html 에는 Supabase 파일이 포함되지 않으므로 supabase 심볼 자체가 없다.
 * 그래서 typeof 로 확인해 항상 로컬 모드로 떨어지게 한다.
 */
import { supabase } from '../../lib/supabase';
import { supabaseFetch, supabaseSave } from './supabaseStore';

export const isRemote = typeof supabase !== 'undefined' && !!supabase;

/** 원격에서 맵을 읽어온다 (로컬 모드면 null) */
export async function pullRemote(kind) {
  if (!isRemote) return null;
  return supabaseFetch(kind);
}

/** 맵을 원격에 반영한다 (로컬 모드면 아무것도 하지 않음) */
export async function pushRemote(kind, map) {
  if (!isRemote) return;
  await supabaseSave(kind, map);
}
