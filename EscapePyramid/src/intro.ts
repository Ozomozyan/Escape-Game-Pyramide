// src/intro.ts
import { supabase } from './supabaseClient';

export async function getIntroScript(roomId: string, role: 'P1'|'P2') {
  const { data, error } = await supabase.rpc('get_intro_script', { p_room_id: roomId, p_role: role });
  if (error) throw error;
  return data as any[];
}
export async function introAction(roomId: string, action: string) {
  const { data, error } = await supabase.rpc('intro_action', { p_room_id: roomId, p_action: action });
  if (error) throw error;
  return data;
}
export async function introReady(roomId: string, stepKey: string) {
  const { data, error } = await supabase.rpc('intro_mark_ready', { p_room_id: roomId, p_step: stepKey });
  if (error) throw error;
  return data as { ready:number; total:number; allReady:boolean };
}

export async function getBarrierStatus(roomId: string, stepKey: string) {
  const { data, error } = await supabase.rpc('get_barrier_status', { p_room_id: roomId, p_step: stepKey });
  if (error) throw error;
  return data as { ready:number; total:number; allReady:boolean };
}

export async function setRequiredReady(roomId: string, count: 1|2) {
  const { error } = await supabase.rpc('set_required_ready', { p_room_id: roomId, p_count: count });
  if (error) throw error;
}