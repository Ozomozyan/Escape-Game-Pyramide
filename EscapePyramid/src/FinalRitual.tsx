import React, { useState } from "react";
import { useRoom } from "./state/RoomProvider";
import { performFinal } from "./gameState";

export default function FinalRitual() {
  const { roomId, artifacts, refetchAll, broadcastRefresh, meta } = useRoom();
  const [msg, setMsg] = useState<string | null>(null);

  const has = (k: string) => artifacts.some(a => a.key === k && a.qty > 0);

  async function doFinal(mode: 'cooperate'|'solo') {
    setMsg(null);
    const res = await performFinal(roomId, mode);
    setMsg(res.message ?? `${res.ending} ending`);
    await refetchAll(); await broadcastRefresh();
  }

  if (meta?.status === 'ended') {
    return <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/40 text-emerald-200">Run completed — final door is open.</div>;
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/60 text-white">
      <h3 className="font-semibold mb-2">The Scales of Ma’at</h3>
      <div className="text-sm opacity-80 mb-3">Balance the plates (cooperate) or wield the khopesh (solo).</div>
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded bg-sky-700 text-white disabled:opacity-40"
          disabled={!has('shabti') || !has('counterweight_stones')}
          onClick={() => doFinal('cooperate')}
        >
          Cooperate (needs shabti + stones)
        </button>
        <button
          className="px-3 py-2 rounded bg-red-700 text-white disabled:opacity-40"
          disabled={!has('bronze_khopesh') || !has('counterweight_stones')}
          onClick={() => doFinal('solo')}
        >
          Solo (needs khopesh + stones)
        </button>
      </div>
      {msg && <div className="mt-2 text-xs opacity-80">{msg}</div>}
    </div>
  );
}
