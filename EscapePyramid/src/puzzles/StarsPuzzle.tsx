import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRoom } from "../state/RoomProvider";

type Dir = "NORTH" | "EAST" | "SOUTH" | "WEST";

export default function StarsPuzzle({
  embedded = false,
  requiredDirection,
  mirrorA,
  mirrorB,
}: {
  embedded?: boolean;
  requiredDirection: Dir;
  mirrorA: Dir;
  mirrorB: Dir;
}) {
  const { roomId, refetchAll, broadcastRefresh, progress, doors } = useRoom();

  const already = useMemo(
    () => !!progress.find((p) => p.puzzle_key === "stars" && p.solved),
    [progress]
  );

  // Controls state (init with sensible defaults; you can seed from props if preferred)
  const [shaft, setShaft] = useState<Dir>("EAST");
  const [a, setA] = useState<Dir>("NORTH");
  const [b, setB] = useState<Dir>("WEST");

  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(already);
  const [shake, setShake] = useState(false);

  useEffect(() => setDone(already), [already]);

  const solvedNow = () =>
    shaft === requiredDirection && a === mirrorA && b === mirrorB;

  const commitSuccess = async () => {
    // 1) Save progress (idempotent)
    const { error: progErr } = await supabase.from("progress").upsert(
      {
        room_id: roomId,
        puzzle_key: "stars",
        solved: true,
        payload: { shaft, mirrorA: a, mirrorB: b },
      },
      { onConflict: "room_id,puzzle_key" }
    );
    if (progErr) {
      console.error("progress upsert failed", progErr);
      throw progErr;
    }

    // 2) Ensure the door row is OPEN (handles missing row)
    const { data: upd, error: doorErr } = await supabase
      .from("doors")
      .update({ state: "open" })
      .eq("room_id", roomId)
      .eq("key", "light_shaft")
      .select("id");
    if (doorErr) {
      console.error("door update failed", doorErr);
      throw doorErr;
    }
    if (!upd || upd.length === 0) {
      const { error: upsertErr } = await supabase
        .from("doors")
        .upsert(
          { room_id: roomId, key: "light_shaft", state: "open" },
          { onConflict: "room_id,key" }
        )
        .select("id")
        .single();
      if (upsertErr) {
        console.error("door upsert failed", upsertErr);
        throw upsertErr;
      }
    }

    // 3) Make sure UI sees it (retry to beat any lag)
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let tries = 0; tries < 6; tries++) {
      await refetchAll();
      const { data: doorRow } = await supabase
        .from("doors")
        .select("state")
        .eq("room_id", roomId)
        .eq("key", "light_shaft")
        .single();
      if (doorRow?.state === "open") break;
      await sleep(120);
    }

    await broadcastRefresh();
  };

  const onCheck = async () => {
    setChecking(true);
    if (solvedNow()) {
      setDone(true);
      await commitSuccess();
      setTimeout(() => setChecking(false), 300);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setChecking(false);
    }
  };

  const shaftOpen = doors.find((d) => d.key === "light_shaft")?.state === "open";

  const DirButton = ({
    d,
    value,
    onChange,
  }: {
    d: Dir;
    value: Dir;
    onChange: (d: Dir) => void;
  }) => (
    <button
      onClick={() => onChange(d)}
      className={`px-2.5 py-1.5 rounded border text-xs ${
        value === d
          ? "bg-amber-600 text-white border-amber-500"
          : "bg-zinc-800/60 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
      }`}
    >
      {d}
    </button>
  );

  return (
    <div
      className={`rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white ${
        embedded ? "" : "p-5"
      } shadow-xl`}
    >
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/70">
          <div className="font-semibold tracking-wide text-amber-300">
            Star Alignment
          </div>
          <div className="text-xs text-zinc-300">
            Sun Shaft:{" "}
            <span
              className={`font-semibold ${
                shaftOpen ? "text-emerald-300" : "text-zinc-200"
              }`}
            >
              {shaftOpen ? "OPEN" : "LOCKED"}
            </span>
          </div>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-5 pt-6"}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diagram */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-64 h-[420px] rounded-xl border-2 ${
                done
                  ? "border-emerald-400"
                  : shake
                  ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]"
                  : "border-amber-500"
              }`}
              style={{ background: "linear-gradient(180deg,#3b332a,#2a241f)" }}
              aria-label="mirror diagram"
            >
              {/* shaft arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 top-6 text-xs text-zinc-300">
                Shaft
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-9 w-1 h-28 bg-amber-400/70" />
              {/* Mirror A / B boxes */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-10 rounded bg-black/40 border border-white/10 grid place-items-center">
                <span className="text-xs">A:{a[0]}</span>
              </div>
              <div className="absolute right-6 bottom-6 w-14 h-10 rounded bg-black/40 border border-white/10 grid place-items-center">
                <span className="text-xs">B:{b[0]}</span>
              </div>
              {/* target ring */}
              <div className="absolute right-6 top-16 w-8 h-8 rounded-full border-2 border-amber-500/70" />
            </div>
          </div>

          {/* Controls */}
          <div>
            <div className="text-sm text-zinc-300 mb-3">
              Set the shaft to <strong>{requiredDirection}</strong> and angle
              the mirrors.
            </div>

            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-2 font-semibold text-amber-300">
                Shaft Direction
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["NORTH", "EAST", "SOUTH", "WEST"] as Dir[]).map((d) => (
                  <DirButton key={d} d={d} value={shaft} onChange={setShaft} />
                ))}
              </div>
            </section>

            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-2 font-semibold text-amber-300">Mirror A</div>
              <div className="flex gap-2 flex-wrap">
                {(["NORTH", "EAST", "SOUTH", "WEST"] as Dir[]).map((d) => (
                  <DirButton key={d} d={d} value={a} onChange={setA} />
                ))}
              </div>
            </section>

            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-2 font-semibold text-amber-300">Mirror B</div>
              <div className="flex gap-2 flex-wrap">
                {(["NORTH", "EAST", "SOUTH", "WEST"] as Dir[]).map((d) => (
                  <DirButton key={d} d={d} value={b} onChange={setB} />
                ))}
              </div>
            </section>

            <div className="mt-2 flex items-center gap-2">
              {!done ? (
                <>
                  <button
                    onClick={() => {
                      setShaft("EAST");
                      setA("NORTH");
                      setB("WEST");
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                  >
                    Reset
                  </button>
                  <button
                    onClick={onCheck}
                    disabled={checking}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500"
                  >
                    Check
                  </button>
                </>
              ) : (
                <span className="text-emerald-300 text-sm">
                  Solved ✓ (Sun shaft opens)
                </span>
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
