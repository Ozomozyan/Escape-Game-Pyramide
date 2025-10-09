import React, { useMemo } from "react";
import { useRoom } from "../state/RoomProvider";

export default function HUD() {
  const { roomCode, air, artifacts, players, doors, meta } = useRoom();

  // Build counts like { ankh_key: 1, shabti: 2, ... }
  const invCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of artifacts) {
      out[a.key] = (out[a.key] ?? 0) + (a.qty ?? 0);
    }
    return out;
  }, [artifacts]);

  const doorState = (k: string) => doors.find(d => d.key === k)?.state ?? "locked";

  return (
    <div className="w-full flex items-center justify-between py-3 px-4 bg-zinc-900 text-white rounded-xl">
      <div className="flex items-center gap-3">
        <div className="text-sm opacity-80">Room</div>
        <div className="px-2 py-1 rounded bg-zinc-800 font-mono">{roomCode}</div>
        <div className="ml-4 text-sm opacity-80">Phase</div>
        <div className="px-2 py-1 rounded bg-zinc-800">{meta?.phase ?? meta?.status}</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-lg font-mono">Air: {air ?? "…"}s</div>
        <div className="h-6 w-px bg-zinc-700" />
        <div className="flex items-center gap-2 text-sm">
          {Object.keys(invCounts).length > 0 ? (
            Object.entries(invCounts).map(([k, count]) => (
              <span
                key={k}
                className="px-2 py-1 rounded bg-emerald-700/30 border border-emerald-600/50"
              >
                {k} ×{count}
              </span>
            ))
          ) : (
            <span className="opacity-60">no artifacts</span>
          )}
        </div>
        <div className="h-6 w-px bg-zinc-700" />
        <div className="flex items-center gap-2 text-xs">
          {players.map((p) => (
            <span
              key={p.id}
              className={`px-2 py-1 rounded border ${
                p.status === "escaped"
                  ? "border-emerald-500 text-emerald-300"
                  : p.status === "down"
                  ? "border-red-500 text-red-300"
                  : "border-zinc-600 text-zinc-300"
              }`}
            >
              {p.role}: {p.status}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 text-xs">
        {["ankh_door", "vent_grate", "light_shaft", "sarcophagus_gate", "final_door"].map((k) => (
          <span
            key={k}
            className={`px-2 py-1 rounded ${
              doorState(k) === "open"
                ? "bg-sky-700/30 border border-sky-600/50"
                : "bg-zinc-700/30 border border-zinc-600/50"
            }`}
          >
            {k}:{doorState(k)}
          </span>
        ))}
      </div>
    </div>
  );
}
