// src/App.tsx
import { useEffect, useState } from "react";
import { ensureSignedIn } from "./auth";
import { createRoom, joinRoomByCode } from "./rooms";
import { RoomProvider } from "./state/RoomProvider";
import GameScreen from "./GameScreen";

type View = "home" | "room";

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  // sign in anon
  useEffect(() => {
    ensureSignedIn()
      .then((u) => setUid(u.id))
      .catch((e) => setErr(e.message || String(e)));
  }, []);

  async function handleCreate() {
    setErr(null);
    try {
      const { room } = await createRoom();
      setRoomId(room.id);
      setRoomCode(room.code);
      setView("room");
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function handleJoin() {
    setErr(null);
    try {
      const { room } = await joinRoomByCode(joinCode.trim().toUpperCase());
      setRoomId(room.id);
      setRoomCode(room.code);
      setView("room");
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  if (view === "home") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="p-6 rounded-xl shadow w-[420px] space-y-4 bg-white">
          <h1 className="text-2xl font-bold">Breath of Ma’at</h1>
          <p className="text-sm opacity-70">
            Signed in: <code>{uid ?? "..."}</code>
          </p>
          {err && <p className="text-red-600">{err}</p>}

          <button
            onClick={handleCreate}
            className="w-full py-2 rounded bg-black text-white hover:opacity-90"
          >
            Create Room
          </button>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={6}
              placeholder="Enter 6-char code"
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={handleJoin}
              className="px-4 rounded bg-gray-900 text-white"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Room view (provider owns realtime, polling, timer, etc.)
  return (
    <div className="min-h-screen bg-zinc-950">
      {roomId && roomCode && (
        <RoomProvider roomId={roomId} roomCode={roomCode}>
          <GameScreen />
        </RoomProvider>
      )}
    </div>
  );
}
