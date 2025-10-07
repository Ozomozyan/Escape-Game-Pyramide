// src/realtime.ts
import { supabase } from './supabaseClient';

export function subscribeRoom(roomId: string, handlers: {
  onRoom?: (payload:any)=>void,
  onPlayers?: (payload:any)=>void,
  onProgress?: (payload:any)=>void,
  onArtifact?: (payload:any)=>void,
  onBroadcast?: (evt:any)=>void,
}) {
  // These postgres_changes listeners only work if Replication is enabled.
  // It's fine to keep them; they just won't fire right now.
  const roomsSub = supabase.channel(`rooms:${roomId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (p) => handlers.onRoom?.((p as any).new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      (p) => handlers.onPlayers?.(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'progress', filter: `room_id=eq.${roomId}` },
      (p) => handlers.onProgress?.(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'artifacts', filter: `room_id=eq.${roomId}` },
      (p) => handlers.onArtifact?.(p))
    .subscribe();

  // Broadcast-only channel (works without Replication)
  const signal = supabase.channel(`signal:${roomId}`, {
    config: { broadcast: { ack: true }, presence: { key: roomId } }
  })
    .on('broadcast', { event: 'hint' }, (payload) =>
      handlers.onBroadcast?.({ type:'hint', payload }))
    .on('broadcast', { event: 'puzzle_event' }, (payload) =>
      handlers.onBroadcast?.({ type:'puzzle_event', payload }))
    // NEW: refresh signal so peers can refetch from DB
    .on('broadcast', { event: 'refresh' }, () =>
      handlers.onBroadcast?.({ type:'refresh' }))
    .subscribe();

  return {
    async sendBroadcast(event: 'hint'|'puzzle_event'|'refresh', payload:any = {}) {
      await signal.send({ type: 'broadcast', event, payload });
    },
    async announcePresence() {
      await signal.track({ connectedAt: Date.now() });
    },
    unsubscribe() {
      supabase.removeChannel(roomsSub);
      supabase.removeChannel(signal);
    }
  };
}
