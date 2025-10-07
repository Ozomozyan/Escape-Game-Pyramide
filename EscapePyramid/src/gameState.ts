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
