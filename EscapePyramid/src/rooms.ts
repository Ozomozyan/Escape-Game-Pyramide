import { supabase } from './supabaseClient';
import seedrandom from 'seedrandom';

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createRoom() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const code = randomCode();
  const seed = Math.floor(seedrandom(code)() * 1e9);

  const { data: room, error: e1 } = await supabase
    .from('rooms')
    .insert({ code, seed, created_by: user.id })
    .select('*')
    .single();
  if (e1) throw e1;

  const { data: me, error: e2 } = await supabase
    .from('players')
    .insert({ room_id: room.id, user_id: user.id, role: 'P1' })
    .select('*')
    .single();
  if (e2) throw e2;

  return { room, me };
}

export async function joinRoomByCode(code: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase.rpc('join_room_by_code', { p_code: code });
  if (error) {
    const msg = String(error.message);
    if (msg.includes('room_not_found')) throw new Error('Room not found');
    if (msg.includes('room_closed'))    throw new Error('Room is closed');
    if (msg.includes('room_full'))      throw new Error('Room is full');
    throw error;
  }
  if (!data || !data[0]) throw new Error('Room not found');

  const row = data[0]; // { id, room_code, role }
  return {
    room: { id: row.id as string, code: row.room_code as string },
    me:   { room_id: row.id as string, user_id: user.id, role: row.role as 'P1'|'P2' }
  };

}