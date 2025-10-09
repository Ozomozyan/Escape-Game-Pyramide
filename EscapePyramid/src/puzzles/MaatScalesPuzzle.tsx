// src/puzzles/MaatScalesPuzzle.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRoom } from "../state/RoomProvider";

type Ending = "coop" | "solo";
type SoloItem = "counterweight_stones" | "bronze_khopesh";

export default function MaatScalesPuzzle({ embedded = false }: { embedded?: boolean }) {
  const { roomId, me, players, artifacts, progress, refetchAll, broadcastRefresh } = useRoom();

  // ✅ find my *players* row (has .id), not just the auth identity
  const myPlayerRow = useMemo(
    () => players.find(p => p.user_id === me?.uid) || null,
    [players, me?.uid]
  );
  const partner = useMemo(
    () => players.find(p => p.id !== myPlayerRow?.id) || null,
    [players, myPlayerRow?.id]
  );

  const already = useMemo(
    () => progress.some(p => p.puzzle_key === "maat" && p.solved),
    [progress]
  );

  const [done, setDone] = useState(already);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ending, setEnding] = useState<Ending | null>(null);

  const qty = (k: string) =>
    artifacts.filter(a => a.key === k).reduce((s, i) => s + (i.qty ?? 0), 0);

  const hasShabti = qty("shabti") > 0;
  const hasStones = qty("counterweight_stones") > 0;
  const hasKhopesh = qty("bronze_khopesh") > 0;

  const twoPlayersActive = players.filter(p => p.status !== "down").length >= 2;
  const myRoleLabel = myPlayerRow?.role ?? me?.role ?? "P1";

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async function markBothEscaped() {
    const ids = players.map(p => p.id);
    const { error: upErr } = await supabase
      .from("players")
      .update({ status: "escaped" })
      .in("id", ids);
    if (upErr) throw upErr;

    await supabase.from("progress").upsert(
      {
        room_id: roomId,
        puzzle_key: "maat",
        solved: true,
        payload: { ending: "coop" as Ending },
      },
      { onConflict: "room_id,puzzle_key" }
    );

    // retry to see new state
    for (let i = 0; i < 6; i++) {
      await refetchAll();
      // (optional) sanity check via DB if you want:
      // const { data } = await supabase.from("players").select("status").in("id", ids);
      // if (data?.every(x => x.status === "escaped")) break;
      await sleep(120);
    }
    await broadcastRefresh();
  }

  async function coopReadyPress() {
    if (!myPlayerRow) return;
    setChecking(true);
    setWaiting(true);
    try {
      await supabase.from("progress").upsert(
        {
          room_id: roomId,
          puzzle_key: `maat_ready_${myRoleLabel}`,
          solved: true,
        },
        { onConflict: "room_id,puzzle_key" }
      );

      // poll for partner's ready
      for (let i = 0; i < 12; i++) {
        const { data } = await supabase
          .from("progress")
          .select("puzzle_key")
          .eq("room_id", roomId)
          .in("puzzle_key", ["maat_ready_P1", "maat_ready_P2"]);
        const readyCount = (data ?? []).length;
        if (readyCount >= 2 || !twoPlayersActive) break;
        await sleep(250);
      }

      await markBothEscaped();
      setEnding("coop");
      setDone(true);
    } finally {
      setChecking(false);
      setWaiting(false);
    }
  }

  async function soloEscape(useItem: SoloItem) {
    if (!myPlayerRow) return;
    setChecking(true);
    try {
      // me -> escaped
      await supabase.from("players").update({ status: "escaped" }).eq("id", myPlayerRow.id);

      // partner -> down (if present and not already escaped)
      if (partner && partner.status !== "escaped") {
        await supabase.from("players").update({ status: "down" }).eq("id", partner.id);
      }

      // log progress
      await supabase.from("progress").upsert(
        {
          room_id: roomId,
          puzzle_key: "maat",
          solved: true,
          payload: { ending: "solo" as Ending, used: useItem },
        },
        { onConflict: "room_id,puzzle_key" }
      );

      // light refresh loop — verify my status flipped
      for (let i = 0; i < 6; i++) {
        const { data } = await supabase
          .from("players")
          .select("status")
          .eq("id", myPlayerRow.id)
          .single();
        if (data?.status === "escaped") break;
        await sleep(120);
      }
      await refetchAll();
      await broadcastRefresh();

      setEnding("solo");
      setDone(true);
    } catch (e) {
      console.error(e);
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white ${embedded ? "" : "p-5"} shadow-xl`}>
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/70">
          <div className="font-semibold tracking-wide text-amber-300">The Scales of Ma’at</div>
          <div className="text-xs text-zinc-300">
            You: <span className="font-semibold">{myRoleLabel}</span> — Partner:{" "}
            <span className="font-semibold">{partner?.role ?? "—"}</span>
          </div>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-5 pt-6"}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diagram */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-72 h-[420px] rounded-xl border-2 ${done ? "border-emerald-400" : shake ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]" : "border-amber-500"}`}
              style={{ background: "linear-gradient(180deg,#3b332a,#2a241f)" }}
              aria-label="ma'at scales"
            >
              <div className="absolute inset-4">
                <div className="absolute left-1/2 -translate-x-1/2 top-6 w-1 h-24 bg-amber-600/60" />
                <div className="absolute left-1/2 -translate-x-1/2 top-6 w-24 h-1 bg-amber-600/60" />
                <div className="absolute left-10 top-20 w-16 h-1 bg-amber-500/60" />
                <div className="absolute right-10 top-20 w-16 h-1 bg-amber-500/60" />
                <div className="absolute left-8 top-20 w-20 h-20 rounded-full border border-amber-400/50" />
                <div className="absolute right-8 top-20 w-20 h-20 rounded-full border border-amber-400/50" />
              </div>
              <div className="absolute left-9 top-40 text-xs text-amber-200/90">Plate A</div>
              <div className="absolute right-9 top-40 text-xs text-amber-200/90">Plate B</div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-6 text-amber-300 text-sm">
                {done
                  ? ending === "coop"
                    ? "Balance Achieved — Both Escape"
                    : "A Heart Proved Heavy — You Alone Escape"
                  : "Balance the Scales"}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="text-sm text-zinc-300 mb-4">
              The inscription reads: <em>“Two hearts must balance before Ma’at.”</em>
            </div>

            {/* Co-op path */}
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-1 font-semibold text-emerald-300">Co-op Balance (best ending)</div>
              <div className="text-xs opacity-80 mb-3">
                Requires a <strong>Shabti</strong>: place the shabti on one plate, both step on the other.
              </div>
              <button
                disabled={!hasShabti || !twoPlayersActive || checking || done || !myPlayerRow}
                onClick={coopReadyPress}
                className={`text-xs px-3 py-1.5 rounded border ${
                  (!hasShabti || !twoPlayersActive || done || !myPlayerRow)
                    ? "bg-zinc-900/60 text-zinc-400 border-zinc-700 cursor-not-allowed"
                    : "bg-emerald-700 border-emerald-600 text-white hover:bg-emerald-600"
                }`}
              >
                {waiting ? "Waiting for partner…" : "Step on Plate (Both Escape)"}
              </button>
              {!hasShabti && <div className="mt-2 text-xs text-amber-200/90">Hint: solve the Canopic puzzle to earn a Shabti.</div>}
              {!twoPlayersActive && <div className="mt-1 text-xs text-amber-200/90">Only one player present — co-op unavailable.</div>}
            </section>

            {/* Solo path */}
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
              <div className="mb-1 font-semibold text-amber-300">Solo Escape (alternate ending)</div>
              <div className="text-xs opacity-80 mb-3">
                Use <strong>Counterweight Stones</strong> or a <strong>Bronze Khopesh</strong> to tilt fate.
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  disabled={!hasStones || checking || done || !myPlayerRow}
                  onClick={() => soloEscape("counterweight_stones")}
                  className={`text-xs px-3 py-1.5 rounded border ${
                    (!hasStones || done || !myPlayerRow)
                      ? "bg-zinc-900/60 text-zinc-400 border-zinc-700 cursor-not-allowed"
                      : "bg-amber-700 border-amber-600 text-white hover:bg-amber-600"
                  }`}
                >
                  Use Counterweight Stones
                </button>
                <button
                  disabled={!hasKhopesh || checking || done || !myPlayerRow}
                  onClick={() => soloEscape("bronze_khopesh")}
                  className={`text-xs px-3 py-1.5 rounded border ${
                    (!hasKhopesh || done || !myPlayerRow)
                      ? "bg-zinc-900/60 text-zinc-400 border-zinc-700 cursor-not-allowed"
                      : "bg-red-700 border-red-600 text-white hover:bg-red-600"
                  }`}
                >
                  Wield Bronze Khopesh
                </button>
              </div>
            </section>

            {done && (
              <div className="text-emerald-300 text-sm">
                Ending locked: {ending === "coop" ? "Co-op (Ma’at preserved)" : "Solo (balance broken)"} ✓
              </div>
            )}
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
