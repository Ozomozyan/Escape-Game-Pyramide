import { useEffect, useMemo, useState } from "react";
import { ensureSignedIn } from "./auth";
import { createRoom, joinRoomByCode } from "./rooms";
import { startRoom, upsertProgress, grantArtifact, incrementAir, initRoomEntities } from "./gameState";
import { useAirTimer } from "./hooks/useAirTimer";
import { subscribeRoom } from "./realtime";
import { fetchPlayers, fetchProgress, fetchArtifacts } from "./fetchers";
import DevPuzzleTester from "./dev/DevPuzzleTester";

type View = 'home' | 'room';

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');

  // ✅ Always call the hook (it no-ops if roomId is null)
  const air = useAirTimer(roomId);

  // Debug UI state from DB
  const [players, setPlayers] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);

  useEffect(() => {
    ensureSignedIn()
      .then(u => setUid(u.id))
      .catch(e => setErr(e.message));
  }, []);

  const sub = useMemo(() => {
    if (!roomId) return null;
    return subscribeRoom(roomId, {
      onBroadcast: (evt) => {
        if (evt.type === 'refresh') {
          refetchAll();
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!sub) return;
    sub.announcePresence?.();
    refetchAll();
    return () => sub.unsubscribe();
  }, [sub]);

  async function refetchAll() {
    if (!roomId) return;
    try {
      const [p, g, a] = await Promise.all([
        fetchPlayers(roomId),
        fetchProgress(roomId),
        fetchArtifacts(roomId),
      ]);
      setPlayers(p); setProgress(g); setArtifacts(a);
    } catch { /* ignore */ }
  }

  async function handleCreate() {
    setErr(null);
    try {
      const { room } = await createRoom();
      setRoomId(room.id);
      setRoomCode(room.code);
      setView('room');
      await refetchAll();               // ✅ initial load for creator
    } catch (e:any) { setErr(e.message || String(e)); }
  }

  async function handleJoin() {
    setErr(null);
    try {
      const { room } = await joinRoomByCode(joinCode.trim().toUpperCase());
      setRoomId(room.id);
      setRoomCode(room.code);
      setView('room');
      await refetchAll();               // ✅ initial load for joiner
    } catch (e:any) { setErr(e.message || String(e)); }
  }

  async function handleStart() {
    if (!roomId) return;
    await startRoom(roomId);
    await initRoomEntities(roomId);  // Test only: init entities
    await refetchAll();                 // ✅ refresh self
    await sub?.sendBroadcast('refresh', {});
  }

  async function handleSampleSolve() {
    if (!roomId) return;
    await upsertProgress(roomId, 'cartouche', { attempt: 'demo' }, true);
    await grantArtifact(roomId, 'ankh_key', 1);
    await incrementAir(roomId, 60);
    await refetchAll();                 // ✅ refresh self
    await sub?.sendBroadcast('refresh', {}); // refresh peer
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 rounded-xl shadow w-[420px] space-y-4">
          <h1 className="text-2xl font-bold">Vite + Supabase</h1>
          <p className="text-sm opacity-70">Signed in: <code>{uid ?? '...'}</code></p>
          {err && <p className="text-red-600">{err}</p>}

          <button onClick={handleCreate}
                  className="w-full py-2 rounded bg-black text-white hover:opacity-90">
            Create Room
          </button>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Enter 6-char code"
              className="flex-1 border rounded px-3 py-2"
            />
            <button onClick={handleJoin} className="px-4 rounded bg-gray-900 text-white">
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  // room view
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-xl shadow w-[560px] space-y-4">
        <h2 className="text-xl font-bold">Room: <code>{roomCode}</code></h2>
        <div className="text-lg">
          Air left: <span className="font-mono">{air ?? '...'}</span>s
        </div>
        <div className="flex gap-2">
          <button onClick={handleStart} className="px-4 py-2 rounded bg-indigo-600 text-white">
            Start Run
          </button>
          <button onClick={handleSampleSolve} className="px-4 py-2 rounded bg-emerald-600 text-white">
            Solve “Cartouche” (+60s)
          </button>
        </div>

        {/* debug panels */}
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
Players: {JSON.stringify(players, null, 2)}
        </pre>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
Progress: {JSON.stringify(progress, null, 2)}
        </pre>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
Artifacts: {JSON.stringify(artifacts, null, 2)}
        </pre>
        {/* dev tester panel */}
        {roomId && (
          <DevPuzzleTester
            roomId={roomId}
            onRefetch={refetchAll}
            sub={sub}
          />
        )}
      </div>
    </div>
  );
}
