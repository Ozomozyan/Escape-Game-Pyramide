import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { subscribeRoom } from "../realtime";
import { fetchPlayers, fetchProgress, fetchArtifacts } from "../fetchers";
import { supabase } from "../supabaseClient";
import { useAirTimer } from "../hooks/useAirTimer";

type Player = { id: string; room_id: string; user_id: string; role: 'P1'|'P2'; status: 'active'|'down'|'escaped' };
type Artifact = { id: number; room_id: string; key: string; qty: number };
type Door = { id: number; room_id: string; key: string; state: 'locked'|'open' };
type Progress = { id: number; room_id: string; puzzle_key: string; solved: boolean; payload: any; solved_at: string };

type RoomMeta = {
  id: string;
  code: string;
  status: 'waiting'|'active'|'ended';
  phase?: 'intro'|'play'|'ended';
  air_initial?: number;
  air_bonus?: number;
  started_at?: string | null;
  current_step?: number;
};

type Ctx = {
  roomId: string;
  roomCode: string;
  me?: { uid: string; role?: 'P1'|'P2' };
  meta?: RoomMeta;
  players: Player[];
  progress: Progress[];
  artifacts: Artifact[];
  doors: Door[];
  air: number | null;
  refetchAll: () => Promise<void>;
  broadcastRefresh: () => Promise<void>;
};

const RoomContext = createContext<Ctx | null>(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("RoomProvider missing");
  return ctx;
}

async function fetchDoors(roomId: string): Promise<Door[]> {
  const { data, error } = await supabase.from("doors").select("*").eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as any;
}

async function fetchRoomMeta(roomId: string): Promise<RoomMeta | undefined> {
  const { data, error } = await supabase.from("rooms")
    .select("id,code,status,phase,air_initial,air_bonus,started_at,current_step")
    .eq("id", roomId).single();
  if (error) return undefined;
  return data as any;
}

export function RoomProvider({
  roomId, roomCode, children,
}: { roomId: string; roomCode: string; children: React.ReactNode }) {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [meta, setMeta] = useState<RoomMeta | undefined>(undefined);
  const [uid, setUid] = useState<string | undefined>(undefined);

  const air = useAirTimer(roomId); // safe: hook always called

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id));
  }, []);

  const meRole = useMemo(() => {
    if (!uid) return undefined;
    const me = players.find(p => p.user_id === uid);
    return me?.role as ('P1'|'P2'|undefined);
  }, [players, uid]);

  const refetchAll = useCallback(async () => {
    const [p, g, a, d, m] = await Promise.all([
      fetchPlayers(roomId),
      fetchProgress(roomId),
      fetchArtifacts(roomId),
      fetchDoors(roomId),
      fetchRoomMeta(roomId),
    ]);
    setPlayers(p as any);
    setProgress(g as any);
    setArtifacts(a as any);
    setDoors(d as any);
    setMeta(m);
  }, [roomId]);

  // open realtime channel (broadcast-only) and poll as a safety net
  useEffect(() => {
    const sub = subscribeRoom(roomId, {
      onBroadcast: (evt) => { if (evt.type === 'refresh') refetchAll(); }
    });
    sub.announcePresence?.();
    refetchAll();
    const id = setInterval(() => { refetchAll(); }, 4000);
    return () => { clearInterval(id); sub.unsubscribe(); };
  }, [roomId, refetchAll]);

  const broadcastRefresh = useCallback(async () => {
    const channel = subscribeRoom(roomId, {}); // temp channel just to send? we already have one above
    await channel.sendBroadcast('refresh', {});
    supabase.removeChannel((channel as any)); // cleanup
  }, [roomId]);

  const value: Ctx = {
    roomId, roomCode,
    me: uid ? { uid, role: meRole } : undefined,
    meta, players, progress, artifacts, doors,
    air, refetchAll,
    broadcastRefresh,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
