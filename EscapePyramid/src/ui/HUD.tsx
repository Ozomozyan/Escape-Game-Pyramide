import React, { useMemo } from "react";
import { useRoom } from "../state/RoomProvider";

export default function HUD() {
  const { roomCode, air, artifacts, players, meta, progress } = useRoom();

  // Inventory counts like { ankh_key: 1, shabti: 2, ... }
  const invCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of artifacts) {
      out[a.key] = (out[a.key] ?? 0) + (a.qty ?? 0);
    }
    return out;
  }, [artifacts]);

  // Progress (puzzles solved / total)
  // Progress (puzzles solved / total)
  const solvedCount = useMemo(
    () =>
      new Set(
        (progress ?? [])
          .filter((p: any) => p.solved)
          .map((p: any) => p.puzzle_key ?? p.id ?? p.key)
      ).size,
    [progress]
  );
  const recordedTotal = useMemo(
    () =>
      new Set(
        (progress ?? []).map((p: any) => p.puzzle_key ?? p.id ?? p.key)
      ).size,
    [progress]
  );

  // Always show at least 6 total (prevents 1/1 after first solve)
  const BASELINE_TOTAL = 6;
  const displayTotal = Math.max(recordedTotal, BASELINE_TOTAL);
  const clampedSolved = Math.min(solvedCount, displayTotal);
  const pct = displayTotal ? Math.round((clampedSolved / displayTotal) * 100) : 0;

  return (
    <div className="w-full flex items-center justify-between py-3 px-4 rounded-xl
                    bg-amber-950/90 text-amber-100 border border-yellow-800/30 shadow-lg shadow-black/30">
      {/* Room + Phase */}
      <div className="flex items-center gap-3">
        <div className="text-sm/none opacity-80">Room</div>
        <div className="px-2 py-1 rounded bg-amber-900/60 border border-yellow-800/40 font-mono">{roomCode}</div>
        <div className="ml-4 text-sm/none opacity-80">Phase</div>
        <div className="px-2 py-1 rounded bg-amber-900/60 border border-yellow-800/40">
          {meta?.phase ?? meta?.status}
        </div>
      </div>

      {/* Air + Inventory + Players + Progress */}
      <div className="flex items-center gap-4">
        {/* Air */}
        <div className="text-lg font-mono">Air: {air ?? "…"}s</div>

        <div className="h-6 w-px bg-yellow-900/60" />

        {/* Inventory */}
        <div className="flex items-center gap-2 text-sm">
          {Object.keys(invCounts).length > 0 ? (
            Object.entries(invCounts).map(([k, count]) => (
              <span
                key={k}
                className="px-2 py-1 rounded border border-yellow-800/40 bg-amber-900/40"
                title={k.replace(/_/g, " ")}
              >
                {k.replace(/_/g, " ")} ×{count}
              </span>
            ))
          ) : (
            <span className="text-xs opacity-70">Empty satchel</span>
          )}
        </div>

        <div className="h-6 w-px bg-yellow-900/60" />

        {/* Party status */}
        <div className="flex items-center gap-2 text-xs">
          {players.map((p: any) => (
            <span
              key={p.id}
              className={`px-2 py-1 rounded border ${
                p.status === "escaped"
                  ? "border-emerald-500 text-emerald-300 bg-emerald-900/20"
                  : p.status === "down"
                  ? "border-red-500 text-red-300 bg-red-900/20"
                  : "border-yellow-800/40 text-amber-100 bg-amber-900/30"
              }`}
              title={p.user_id}
            >
              {p.role}: {p.status}
            </span>
          ))}
        </div>

        <div className="h-6 w-px bg-yellow-900/60" />

        {/* Progress (replaces door lock debug) */}
        <div className="hidden md:flex items-center gap-2 min-w-[160px]">
          <span className="text-xs opacity-80">Progress</span>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2 rounded bg-amber-900/40 overflow-hidden border border-yellow-800/40">
              <div
                className="h-2 bg-yellow-500/80"
                style={{ width: `${pct}%` }}
                aria-label={`Solved ${clampedSolved} of ${displayTotal}`}
              />
            </div>
            <span className="text-xs tabular-nums">
              {clampedSolved}/{displayTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}