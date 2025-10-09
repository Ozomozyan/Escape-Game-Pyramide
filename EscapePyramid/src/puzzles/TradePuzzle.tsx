// src/puzzles/TradeRoutesPuzzle.tsx
import React, { useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { supabase } from "../supabaseClient";
import { useRoom } from "../state/RoomProvider";

type Place = "Byblos" | "Punt" | "Nubia" | "Sinai";
type Good = "cedar" | "incense" | "gold" | "copper";

const CORRECT: Record<Good, Place> = {
  cedar: "Byblos",
  incense: "Punt",
  gold: "Nubia",
  copper: "Sinai",
};
const PLACES: Place[] = ["Byblos", "Punt", "Nubia", "Sinai"];

export default function TradeRoutesPuzzle({ embedded = false }: { embedded?: boolean }) {
  const { roomId, roomCode, refetchAll, broadcastRefresh, progress, doors } = useRoom();

  const already = useMemo(
    () => progress.some(p => p.puzzle_key === "trade" && p.solved),
    [progress]
  );
  const [done, setDone] = useState(already);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const finalOpen = doors.find(d => d.key === "final_door")?.state === "open";

  // Stable but varied order using the room seed
  const goods: Good[] = useMemo(() => {
    const rng = seedrandom((roomId || roomCode || "seed") + ":trade");
    const arr: Good[] = ["cedar", "incense", "gold", "copper"];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [roomId, roomCode]);

  // Player mapping
  const [guess, setGuess] = useState<Record<Good, Place>>({
    cedar: "Byblos",
    incense: "Punt",
    gold: "Nubia",
    copper: "Sinai",
  });

  const setPick = (g: Good, place: Place) =>
    setGuess(m => ({ ...m, [g]: place }));

  const allCorrect = () => goods.every(g => guess[g] === CORRECT[g]);

  const commitSuccess = async () => {
    // 1) Mark progress
    const { error: progErr } = await supabase.from("progress").upsert(
      {
        room_id: roomId,
        puzzle_key: "trade",
        solved: true,
        payload: { mapping: guess },
      },
      { onConflict: "room_id,puzzle_key" }
    );
    if (progErr) throw progErr;

    // 2) Reward: counterweight stones
    const { error: artErr } = await supabase
      .from("artifacts")
      .insert({ room_id: roomId, key: "counterweight_stones", qty: 1 });
    if (artErr) throw artErr;

    // 3) Open final door (progression)
    const { data: upd, error: doorErr } = await supabase
      .from("doors")
      .update({ state: "open" })
      .eq("room_id", roomId)
      .eq("key", "final_door")
      .select("id");
    if (doorErr) throw doorErr;

    if (!upd || upd.length === 0) {
      // ensure row exists
      const { error: upsertErr } = await supabase
        .from("doors")
        .upsert(
          { room_id: roomId, key: "final_door", state: "open" },
          { onConflict: "room_id,key" }
        )
        .select("id")
        .single();
      if (upsertErr) throw upsertErr;
    }

    // 4) Refresh with small retry to beat lag
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 6; i++) {
      await refetchAll();
      const { data } = await supabase
        .from("doors")
        .select("state")
        .eq("room_id", roomId)
        .eq("key", "final_door")
        .single();
      if (data?.state === "open") break;
      await sleep(120);
    }

    await broadcastRefresh();
  };

  const onCheck = async () => {
    setChecking(true);
    if (allCorrect()) {
      setDone(true);
      try {
        await commitSuccess();
      } finally {
        setChecking(false);
      }
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setChecking(false);
    }
  };

  const PlaceBtn = ({ p, active, onClick }: { p: Place; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded border text-xs ${
        active
          ? "bg-amber-600 text-white border-amber-500"
          : "bg-zinc-900/50 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
      }`}
    >
      {p}
    </button>
  );

  return (
    <div className={`rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white ${embedded ? "" : "p-5"} shadow-xl`}>
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/70">
          <div className="font-semibold tracking-wide text-amber-300">Trade Routes</div>
          <div className="text-xs text-zinc-300">
            Final Door:{" "}
            <span className={`font-semibold ${finalOpen ? "text-emerald-300" : "text-zinc-200"}`}>
              {finalOpen ? "OPEN" : "LOCKED"}
            </span>
          </div>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-5 pt-6"}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Map card */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-72 h-[420px] rounded-xl border-2 ${done ? "border-emerald-400" : shake ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]" : "border-amber-500"}`}
              style={{ background: "linear-gradient(180deg,#3b332a,#2a241f)" }}
              aria-label="trade map"
            >
              <div className="absolute inset-4 rounded-xl border border-white/10" />
              {/* simple labeled regions */}
              <div className="absolute left-6 top-10 text-xs text-amber-200">Byblos (Levant)</div>
              <div className="absolute right-6 top-20 text-xs text-amber-200">Sinai</div>
              <div className="absolute left-6 bottom-20 text-xs text-amber-200">Nubia (South)</div>
              <div className="absolute right-6 bottom-10 text-xs text-amber-200">Punt (Red Sea)</div>
              {/* decorative lines */}
              <div className="absolute left-10 top-16 right-10 h-px bg-amber-400/30" />
              <div className="absolute left-10 bottom-24 right-10 h-px bg-amber-400/20" />
            </div>
          </div>

          {/* Controls */}
          <div>
            <p className="text-sm text-zinc-300 mb-4">
              Match each <strong>good</strong> to its <strong>origin</strong>.
              (No penalties; hints appear after incorrect checks.)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goods.map((g) => (
                <div key={g} className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
                  <div className="text-amber-300 font-semibold capitalize">
                    {g} {g === "cedar" && "🌲"}{g === "incense" && "🌿"}{g === "gold" && "🪙"}{g === "copper" && "⛏️"}
                  </div>
                  <div className="text-xs opacity-80 mb-2">
                    {g === "cedar" && "Cedar timber prized for shipbuilding and temples."}
                    {g === "incense" && "Frankincense & myrrh for ritual and perfume."}
                    {g === "gold" && "Gold from mines and trade upriver along the Nile."}
                    {g === "copper" && "Copper for tools and ornaments from Sinai."}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PLACES.map((p) => (
                      <PlaceBtn
                        key={p}
                        p={p}
                        active={guess[g] === p}
                        onClick={() => setPick(g, p)}
                      />
                    ))}
                  </div>

                  {/* contextual tip after a wrong selection once they press Check */}
                  {!done && checking && guess[g] !== CORRECT[g] && (
                    <div className="mt-2 text-xs text-amber-200/90">
                      {g === "cedar" && "Tip: Byblos (Levant) shipped cedar to Egypt across the Mediterranean."}
                      {g === "incense" && "Tip: Punt, likely on/near the Red Sea coast, famous for incense trees."}
                      {g === "gold" && "Tip: Nubia to the south was Egypt’s main gold source."}
                      {g === "copper" && "Tip: Sinai’s mines supplied copper since early dynasties."}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {!done ? (
                <>
                  <button
                    onClick={() =>
                      setGuess({ cedar: "Byblos", incense: "Punt", gold: "Nubia", copper: "Sinai" })
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
                <span className="text-emerald-300 text-sm">
                  Solved ✓ (+ counterweight stones, final door opens)
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
