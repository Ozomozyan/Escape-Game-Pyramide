// src/puzzles/CanopicPuzzle.tsx
import React, { useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { supabase } from "../supabaseClient";
import { useRoom } from "../state/RoomProvider";

type Organ = "liver" | "lungs" | "stomach" | "intestines";
type GodKey = "Imsety" | "Hapi" | "Duamutef" | "Qebehsenuef";

const CANON: Record<GodKey, { organ: Organ; head: string; blurb: string }> = {
  Imsety: { organ: "liver", head: "Human", blurb: "Imsety protects the liver." },
  Hapi: { organ: "lungs", head: "Baboon", blurb: "Hapi guards the lungs." },
  Duamutef: { organ: "stomach", head: "Jackal", blurb: "Duamutef keeps the stomach safe." },
  Qebehsenuef: { organ: "intestines", head: "Falcon", blurb: "Qebehsenuef protects the intestines." },
};

const ORGANS: Organ[] = ["liver", "lungs", "stomach", "intestines"];

export default function CanopicPuzzle({ embedded = false }: { embedded?: boolean }) {
  const { roomId, roomCode, refetchAll, broadcastRefresh, progress, doors } = useRoom();

  // Already solved?
  const already = useMemo(
    () => progress.some((p) => p.puzzle_key === "canopic" && p.solved),
    [progress]
  );
  const [done, setDone] = useState(already);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  // Stable variant: shuffle jar order by room seed
  const jars = useMemo(() => {
    const rng = seedrandom((roomId || roomCode || "seed") + ":canopic");
    const order: GodKey[] = ["Imsety", "Hapi", "Duamutef", "Qebehsenuef"];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }, [roomId, roomCode]);

  // Player picks
  const [guess, setGuess] = useState<Record<GodKey, Organ>>({
    Imsety: "liver",
    Hapi: "lungs",
    Duamutef: "stomach",
    Qebehsenuef: "intestines",
  });

  const isCorrect = () =>
    Object.entries(CANON).every(([g, v]) => guess[g as GodKey] === v.organ);

  const shaftOpen = doors.find((d) => d.key === "sarcophagus_gate")?.state === "open";

  const setPick = (g: GodKey, organ: Organ) =>
    setGuess((m) => ({ ...m, [g]: organ }));

  const commitSuccess = async () => {
    // Save progress
    await supabase.from("progress").upsert(
      {
        room_id: roomId,
        puzzle_key: "canopic",
        solved: true,
        payload: { guess },
      },
      { onConflict: "room_id,puzzle_key" }
    );

    // Reward: shabti helper
    await supabase.from("artifacts").insert({ room_id: roomId, key: "shabti", qty: 1 });

    // Open sarcophagus gate (to next area)
    await supabase.from("doors").update({ state: "open" })
      .eq("room_id", roomId).eq("key", "sarcophagus_gate");

    await refetchAll();
    await broadcastRefresh();
  };

  const onCheck = async () => {
    setChecking(true);
    if (isCorrect()) {
      setDone(true);
      await commitSuccess();
      setChecking(false);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setChecking(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white ${embedded ? "" : "p-5"} shadow-xl`}>
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/70">
          <div className="font-semibold tracking-wide text-amber-300">Canopic Jars</div>
          <div className="text-xs text-zinc-300">
            Sarcophagus Gate:{" "}
            <span className={`font-semibold ${shaftOpen ? "text-emerald-300" : "text-zinc-200"}`}>
              {shaftOpen ? "OPEN" : "LOCKED"}
            </span>
          </div>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-5 pt-6"}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diagram / Sarcophagus board */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-72 h-[420px] rounded-xl border-2 ${done ? "border-emerald-400" : shake ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]" : "border-amber-500"}`}
              style={{ background: "linear-gradient(180deg,#3b332a,#2a241f)" }}
              aria-label="canopic diagram"
            >
              {/* silhouette mummy + four recesses */}
              <div className="absolute inset-4 rounded-xl border border-white/10" />
              <div className="absolute left-1/2 -translate-x-1/2 top-6 w-24 h-40 rounded-xl bg-black/40 border border-white/10" />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-12 rounded bg-black/40 border border-white/10 grid place-items-center text-xs">Liver</div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-12 rounded bg-black/40 border border-white/10 grid place-items-center text-xs">Lungs</div>
              <div className="absolute left-6 bottom-8 w-16 h-12 rounded bg-black/40 border border-white/10 grid place-items-center text-xs">Stomach</div>
              <div className="absolute right-6 bottom-8 w-16 h-12 rounded bg-black/40 border border-white/10 grid place-items-center text-xs">Intest.</div>
            </div>
          </div>

          {/* Controls: the four jars */}
          <div>
            <p className="text-sm text-zinc-300 mb-4">
              Match each <strong>canopic jar</strong> (deity head) to the organ it protects.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jars.map((g) => (
                <div key={g} className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
                  <div className="text-amber-300 font-semibold">{g}</div>
                  <div className="text-xs opacity-80 mb-2">{CANON[g].head} head — {CANON[g].blurb}</div>
                  <div className="flex flex-wrap gap-2">
                    {ORGANS.map((o) => (
                      <button
                        key={o}
                        onClick={() => setPick(g, o)}
                        className={`px-2.5 py-1.5 rounded border text-xs ${
                          guess[g] === o
                            ? "bg-amber-600 text-white border-amber-500"
                            : "bg-zinc-900/50 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {!done ? (
                <>
                  <button
                    onClick={() =>
                      setGuess({
                        Imsety: "liver",
                        Hapi: "lungs",
                        Duamutef: "stomach",
                        Qebehsenuef: "intestines",
                      })
                    }
                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                  >
                    Reset
                  </button>
                  <button
                    onClick={onCheck}
                    disabled={checking}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500"
                  >
                    Validate
                  </button>
                </>
              ) : (
                <span className="text-emerald-300 text-sm">Solved ✓ (Sarcophagus gate opens, +1 shabti)</span>
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
