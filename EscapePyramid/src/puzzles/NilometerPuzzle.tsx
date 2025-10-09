// src/puzzles/NilometerPuzzle.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRoom } from "../state/RoomProvider";

export default function NilometerPuzzle({
  embedded = false,
  targetCubits,
  targetPalms,
}: {
  embedded?: boolean;
  targetCubits: number;
  targetPalms: number;
}) {
  const { roomId, refetchAll, broadcastRefresh, progress, doors, me } = useRoom();

  const already = useMemo(
    () => !!progress.find((p) => p.puzzle_key === "nilometer" && p.solved),
    [progress]
  );

  const [cubits, setCubits] = useState(10);
  const [palms, setPalms] = useState(0);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(already);
  const [shake, setShake] = useState(false);

  useEffect(() => setDone(already), [already]);

  const totalPalms = (c: number, p: number) => c * 7 + p;
  const targetTotal = totalPalms(targetCubits, targetPalms);
  const currentTotal = totalPalms(cubits, palms);
  const pct = Math.min(1, Math.max(0, currentTotal / (22 * 7))); // gauge render

  const commitSuccess = async () => {
    try {
      await supabase.from("progress").insert({
        room_id: roomId,
        puzzle_key: "nilometer",
        solved: true,
        payload: { cubits: targetCubits, palms: targetPalms },
      });
    } catch (_) {
      await supabase.from("progress").upsert(
        { room_id: roomId, puzzle_key: "nilometer", solved: true, payload: { cubits: targetCubits, palms: targetPalms } },
        { onConflict: "room_id,puzzle_key" }
      );
    }
    // door + air + (optional read)
    try {
      await supabase.from("doors").update({ state: "open" }).eq("room_id", roomId).eq("key", "vent_grate");
    } catch {}
    try {
      await supabase.rpc("increment_air_bonus", { p_room_id: roomId, p_delta: 90 });
    } catch {}
    // we could log lesson_reads if you want:
    // await supabase.from("lesson_reads").insert({ room_id: roomId, puzzle_key: "nilometer", user_id: me?.user_id }).catch(()=>{});
    await refetchAll();
    await broadcastRefresh();
  };

  const onCheck = async () => {
    setChecking(true);
    if (currentTotal === targetTotal) {
      setDone(true);
      await commitSuccess();
      setTimeout(() => setChecking(false), 400);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setChecking(false);
    }
  };

  const ventOpen = doors.find((d) => d.key === "vent_grate")?.state === "open";

  return (
    <div className={`rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white ${embedded ? "" : "p-5"} shadow-xl`}>
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/70">
          <div className="font-semibold tracking-wide text-amber-300">Nilometer</div>
          <div className="text-xs text-zinc-300">
            Vent: <span className={`font-semibold ${ventOpen ? "text-sky-300" : "text-zinc-200"}`}>{ventOpen ? "OPEN" : "LOCKED"}</span>
          </div>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-5 pt-6"}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Gauge */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-64 h-[420px] rounded-xl border-2 ${done ? "border-emerald-400" : shake ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]" : "border-amber-500"}`}
              style={{
                background:
                  "linear-gradient(180deg, #24242a 0%, #1a1a1f 60%), radial-gradient(circle at 50% 0%, rgba(120,170,255,0.14), rgba(20,30,60,0.10) 70%)",
              }}
              aria-label="nilometer gauge"
            >
              {/* tick marks (cubits) */}
              {Array.from({ length: 23 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-2 right-2 h-px bg-white/15"
                  style={{ bottom: `${(i / 22) * 100}%` }}
                />
              ))}

              {/* water level */}
              <div
                className="absolute left-0 right-0 rounded-b-xl bg-gradient-to-b from-sky-400/40 to-sky-600/35 border-t border-sky-300/20"
                style={{ height: `${pct * 100}%`, bottom: 0 }}
              >
                {/* little froth */}
                <div className="absolute inset-x-0 top-0 h-2 bg-white/30 blur-sm opacity-60" />
              </div>

              {/* label */}
              <div className="absolute right-3 top-3 text-xs text-zinc-300/90">
                Target: <span className="font-semibold">{targetCubits}c {targetPalms}p</span>
              </div>
              <div className="absolute right-3 top-7 text-xs text-zinc-300/90">
                Set: <span className="font-semibold">{cubits}c {palms}p</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div>
            <div className="text-sm text-zinc-300 mb-3">
              Adjust the <strong>cubits</strong> and <strong>palms</strong> until the water reads the requested height.
              (1 cubit = 7 palms)
            </div>

            <Dial label="Cubits" min={0} max={22} value={cubits} onChange={setCubits} />
            <Dial label="Palms"  min={0} max={6}  value={palms}  onChange={setPalms}  />

            <div className="mt-4 flex items-center gap-2">
              {!done ? (
                <>
                  <button
                    onClick={() => { setCubits(10); setPalms(0); }}
                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                  >Reset</button>
                  <button
                    onClick={onCheck}
                    disabled={checking}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500"
                  >Check</button>
                </>
              ) : (
                <span className="text-emerald-300 text-sm">Solved ✓ (Vent opens, +90s Air)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* shake keyframes */}
      <style>{`
        @keyframes wiggle {
          0% { transform: rotate(0deg) translateX(0); }
          20% { transform: rotate(-1.2deg) translateX(-2px); }
          40% { transform: rotate(1.2deg) translateX(2px); }
          60% { transform: rotate(-1.0deg) translateX(-1px); }
          80% { transform: rotate(1.0deg) translateX(1px); }
          100% { transform: rotate(0deg) translateX(0); }
        }
      `}</style>
    </div>
  );
}

function Dial({
  label, min, max, value, onChange,
}: {
  label: string; min: number; max: number; value: number; onChange: (v:number)=>void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-amber-300">{label}</div>
        <div className="text-sm text-zinc-200">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-amber-400"
      />
      <div className="mt-1 text-xs text-zinc-400">Drag to set {label.toLowerCase()}.</div>
    </div>
  );
}
