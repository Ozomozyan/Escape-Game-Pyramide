import React, { useMemo, useState } from "react";
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
  const { roomId, refetchAll, broadcastRefresh, progress, doors } = useRoom();

  // already solved?
  const already = useMemo(
    () => !!progress.find((p) => p.puzzle_key === "nilometer" && p.solved),
    [progress]
  );

  // current reading (what player sets)
  const [c, setC] = useState(10);
  const [p, setP] = useState(0);
  const [done, setDone] = useState(already);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ventOpen = doors.find((d) => d.key === "vent_grate")?.state === "open";

  // teaching helpers
  const toFloat = (cubits: number, palms: number) => cubits + palms / 7;
  const targetFloat = toFloat(targetCubits, targetPalms);
  const currentFloat = toFloat(c, p);

  const delta = currentFloat - targetFloat;

  function incCubit() {
    setC((x) => Math.min(20, x + 1));
  }
  function incPalm() {
    setP((x) => {
      if (x < 6) return x + 1;
      // carry to a cubit
      setC((cc) => Math.min(20, cc + 1));
      return 0;
    });
  }
  function decPalms(n: number) {
    // spillway lowers by n palms total (with borrow)
    let total = c * 7 + p;
    total = Math.max(0, total - n);
    setC(Math.floor(total / 7));
    setP(total % 7);
  }
  function reset() {
    setC(10);
    setP(0);
    setMsg(null);
  }

  function feedbackText() {
    // Gentle learning feedback based on how off they are
    const offPalms = Math.round(Math.abs(delta) * 7);
    if (Math.abs(delta) < 1e-6) {
      return "Exact reading achieved — stable inundation expected. Vents should open.";
    }
    if (delta < 0) {
      // too low
      if (offPalms <= 2) {
        return "Slightly under target — fields risk under-irrigation. Add a little more water.";
      }
      return "Too low — in ancient Egypt, poor floods meant famine and lower taxes. Raise the sluice.";
    }
    // too high
    if (offPalms <= 2) {
      return "Slightly over target — storage pits may flood. Reduce the level a bit.";
    }
    return "Too high — over-inundation damages canals and villages. Spill some water via the spillway.";
  }

  async function commitSuccess() {
    // 1) persist progress
    await supabase.from("progress").upsert(
      {
        room_id: roomId,
        puzzle_key: "nilometer",
        solved: true,
        payload: { reading: { cubits: c, palms: p }, target: { cubits: targetCubits, palms: targetPalms } },
      },
      { onConflict: "room_id,puzzle_key" }
    );

    // 2) open vent
    const { error: doorErr } = await supabase
      .from("doors")
      .update({ state: "open" })
      .eq("room_id", roomId)
      .eq("key", "vent_grate");
    if (doorErr) console.error("vent door update failed", doorErr);

    // 3) add shared air bonus (+90s)
    const { error: airErr } = await supabase.rpc("increment_air_bonus", {
      p_room_id: roomId,
      p_delta: 90,
    });
    if (airErr) console.error("air bonus RPC failed", airErr);

    // 4) refetch with retry (realtime lag)
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 6; i++) {
      await refetchAll();
      const { data } = await supabase
        .from("doors")
        .select("state")
        .eq("room_id", roomId)
        .eq("key", "vent_grate")
        .single();
      if (data?.state === "open") break;
      await sleep(120);
    }
    await broadcastRefresh();
  }

  async function onCheck() {
    setChecking(true);
    try {
      if (Math.abs(delta) < 1e-6) {
        setMsg("Exact reading achieved — stable inundation expected. Vents should open.");
        setDone(true);
        await commitSuccess();
      } else {
        setMsg(feedbackText());
        setShake(true);
        setTimeout(() => setShake(false), 450);
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white ${
        embedded ? "" : "p-5"
      } shadow-xl`}
    >
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/70">
          <div className="font-semibold tracking-wide text-amber-300">Nilometer Control</div>
          <div className="text-xs text-zinc-300">
            Vent:{" "}
            <span className={`font-semibold ${ventOpen ? "text-sky-300" : "text-zinc-200"}`}>
              {ventOpen ? "OPEN" : "LOCKED"}
            </span>
          </div>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-5 pt-6"}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diagram / Gauge */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-64 h-[420px] rounded-xl border-2 ${
                done ? "border-sky-400" : shake ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]" : "border-amber-500"
              }`}
              style={{ background: "linear-gradient(180deg,#2b2b33,#21212a)" }}
              aria-label="nilometer gauge"
            >
              {/* gauge column */}
              <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-12 rounded bg-black/50 border border-white/10 overflow-hidden">
                {/* Marks every cubit */}
                {Array.from({ length: 21 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 h-px bg-white/20"
                    style={{
                      // top from bottom: distribute 0..20 cubits into the height
                      bottom: `${(i / 20) * 100}%`,
                    }}
                  />
                ))}
                {/* Water fill based on current reading */}
                <div
                  className="absolute left-0 right-0 bottom-0 bg-sky-500/35"
                  style={{
                    height: `${Math.min(100, (currentFloat / 20) * 100)}%`,
                    boxShadow: "inset 0 6px 16px rgba(255,255,255,0.08)",
                  }}
                />
                {/* Target marker */}
                <div
                  className="absolute left-0 right-0 h-[2px] bg-amber-300/80"
                  style={{ bottom: `${(targetFloat / 20) * 100}%` }}
                />
              </div>

              {/* Labels */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2 text-xs text-zinc-300">
                Set flood reading
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-4 text-amber-200 text-sm">
                {c} cubits {p} palms
              </div>
            </div>
          </div>

          {/* Controls & Learning */}
          <div>
            <div className="text-sm text-zinc-300 mb-4">
              A nilometer measures the **Nile’s flood height**. Readings use{" "}
              <strong>cubits</strong> (big units) and <strong>palms</strong> (7 per cubit). Set the water to the
              scribe’s required reading:
              <div className="mt-2 rounded bg-amber-100/80 text-amber-900 border border-amber-300 px-3 py-2 inline-block">
                Target: <strong>{targetCubits} cubits {targetPalms} palms</strong>
              </div>
            </div>

            {/* Valve controls */}
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-2 font-semibold text-amber-300">Sluice Controls</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={incCubit}
                  disabled={done}
                  className="px-3 py-1.5 text-xs rounded bg-amber-700 border border-amber-600 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Open Main Sluice (+1 cubit)
                </button>
                <button
                  onClick={incPalm}
                  disabled={done}
                  className="px-3 py-1.5 text-xs rounded bg-amber-700 border border-amber-600 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Lift Feeder Gate (+1 palm)
                </button>
                <button
                  onClick={() => decPalms(3)}
                  disabled={done || (c === 0 && p === 0)}
                  className="px-3 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Spillway (−3 palms)
                </button>
                <button
                  onClick={reset}
                  disabled={done}
                  className="px-3 py-1.5 text-xs rounded bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 text-xs text-zinc-300/90">
                Tip: <strong>1 cubit = 7 palms</strong>. If palms go past 6, they carry into a cubit; if you spill below 0 palms,
                a cubit is borrowed.
              </div>
            </section>

            {/* Explain consequences */}
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-2 font-semibold text-amber-300">Why it matters</div>
              <ul className="list-disc pl-5 text-xs text-zinc-300/90 space-y-1">
                <li>**Under-inundation** → poor harvests, grain shortages, lower tax intake.</li>
                <li>**Ideal flood** → fertile silt across fields, strong yields, stable taxes.</li>
                <li>**Over-inundation** → canal damage, storage flooding, settlement risk.</li>
              </ul>
            </section>

            <div className="mt-2 flex items-center gap-2">
              {!done ? (
                <>
                  <button
                    onClick={onCheck}
                    disabled={checking}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Check Reading
                  </button>
                  {msg && <span className="text-xs text-zinc-200">{msg}</span>}
                </>
              ) : (
                <span className="text-sky-300 text-sm">Correct — Vent opens and cool air rushes in (+90s)</span>
              )}
            </div>
          </div>
        </div>
      </div>

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
