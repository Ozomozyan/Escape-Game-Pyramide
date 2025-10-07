import { supabase } from './supabaseClient';

export async function startRoom(roomId: string) {
  await supabase
    .from('rooms')
    .update({ started_at: new Date().toISOString(), status: 'active' })
    .eq('id', roomId)
    .is('started_at', null);
}

export async function getAirSeconds(roomId: string) {
  const { data, error } = await supabase
    .from('room_air')
    .select('air_seconds')
    .eq('id', roomId)
    .single();
  if (error) throw error;
  return data.air_seconds as number;
}

export async function incrementAir(roomId: string, seconds: number) {
  const { error } = await supabase.rpc('increment_air_bonus', {
    p_room_id: roomId,
    p_delta: seconds,
  });
  if (error) throw error;
}

export async function upsertProgress(roomId: string, puzzleKey: string, payload: any, solved: boolean) {
  const { error } = await supabase.from('progress').upsert({
    room_id: roomId,
    puzzle_key: puzzleKey,
    payload,
    solved,
    solved_at: solved ? new Date().toISOString() : null,
  }, { onConflict: 'room_id,puzzle_key' });
  if (error) throw error;
}

export async function grantArtifact(roomId: string, key: string, qty = 1) {
  const { error } = await supabase.from('artifacts').upsert(
    { room_id: roomId, key, qty },
    { onConflict: 'room_id,key' }
  );
  if (error) throw error;
}

export async function initRoomEntities(roomId: string) {
  const { error } = await supabase.rpc('init_room_entities', { p_room_id: roomId });
  if (error) throw error;
}

export async function getVariant(roomId: string, key: string) {
  const { data, error } = await supabase.rpc('get_puzzle_variant', { p_room_id: roomId, p_key: key });
  if (error) throw error;
  return data as any; // JSON
}

export async function markLessonRead(roomId: string, key: string) {
  const { error } = await supabase.rpc('mark_lesson_read', { p_room_id: roomId, p_key: key });
  if (error) throw error;
}

export async function solvePuzzle(roomId: string, key: string, answer: any) {
  const { data, error } = await supabase.rpc('solve_puzzle', { p_room_id: roomId, p_key: key, p_answer: answer });
  if (error) throw error;
  return data as { correct: boolean; airAward: number; artifactsAwarded: string[]; doorsOpened: string[] };
}

export async function performFinal(roomId: string, mode: 'cooperate'|'solo') {
  const { data, error } = await supabase.rpc('perform_final_ritual', { p_room_id: roomId, p_mode: mode });
  if (error) throw error;
  return data as any;
}