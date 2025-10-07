import { supabase } from './supabaseClient';

export async function fetchRoom(roomId: string) {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (error) throw error;
  return data;
}
export async function fetchPlayers(roomId: string) {
  const { data, error } = await supabase.from('players').select('*').eq('room_id', roomId);
  if (error) throw error;
  return data || [];
}
export async function fetchProgress(roomId: string) {
  const { data, error } = await supabase.from('progress').select('*').eq('room_id', roomId);
  if (error) throw error;
  return data || [];
}
export async function fetchArtifacts(roomId: string) {
  const { data, error } = await supabase.from('artifacts').select('*').eq('room_id', roomId);
  if (error) throw error;
  return data || [];
}
