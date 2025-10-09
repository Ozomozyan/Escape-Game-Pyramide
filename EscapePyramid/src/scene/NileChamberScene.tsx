// src/scene/NileChamberScene.tsx
import React, { useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { useRoom } from "../state/RoomProvider";
import HUD from "../ui/HUD";
import NilometerPuzzle from "../puzzles/NilometerPuzzle";

type Facing = "front" | "left" | "right";
type Panel = "none" | "puzzle" | "indices";

function useNilVariant(roomId?: string, roomCode?: string) {
  const key = (roomId || roomCode || "seed") + ":nilometer";
  const rng = seedrandom(key);
  // target 12–18 cubits, plus 0–6 palms
  const cubits = 12 + Math.floor(rng() * 7);
  const palms = Math.floor(rng() * 7);
  return {
    cubits,
    palms,
    seasonNote:
      "Seasons: Akhet (Inundation), Peret (Emergence), Shemu (Harvest). Safe floods meant prosperity; over/under-flood harmed crops.",
    fact:
      "Nilometers measured flood height in cubits (7 palms per cubit). Taxes and rations depended on these readings.",
    hint:
      "Your goal is a precise height in cubits and palms. Recall: 1 cubit = 7 palms.",
  };
}

export default function NileChamberScene({ onProceed }: { onProceed: () => void }) {
  const { roomId, roomCode, doors, progress } = useRoom();
  const [facing, setFacing] = useState<Facing>("front");
  const [panel, setPanel] = useState<Panel>("none");
  const variant = useNilVariant(roomId, roomCode);

  const ventOpen = doors.find(d => d.key === "vent_grate")?.state === "open";
  const nilometerSolved = progress.some(p => p.puzzle_key === "nilometer" && p.solved);
  // proceed as soon as either door shows open OR progress is solved
  const canProceed = ventOpen || nilometerSolved;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== "none") {
        if (e.key === "Escape") setPanel("none");
        if (e.key.toLowerCase() === "i") setPanel("indices");
        if (e.key.toLowerCase() === "p") setPanel("puzzle");
        return;
      }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") setFacing(p => (p === "front" ? "left" : "front"));
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") setFacing(p => (p === "front" ? "right" : "front"));
      if (e.key === " " || e.key.toLowerCase() === "e" || e.key === "Enter") {
        if (facing === "front") setPanel("puzzle");
        else setPanel("indices");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [facing, panel]);

  const caption = useMemo(() => {
    if (facing === "front") return ventOpen ? "Nilometer Vent — OPEN" : "Nilometer Shaft";
    if (facing === "left") return "Season Tablet (Indices)";
    return "Gauge Marks (Indices)";
  }, [facing, ventOpen]);

  return (
    <div className="relative min-h-[calc(100vh-2rem)] max-w-6xl mx-auto my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 p-3 z-20"><HUD /></div>

      <NileBackground facing={facing} ventOpen={ventOpen} />

      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
        <div className="px-3 py-1.5 rounded-lg text-amber-200 bg-black/60 border border-amber-500/30 backdrop-blur-sm text-sm">
          {caption}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3">
        <button
          onClick={() => setFacing(f => (f === "front" ? "left" : "front"))}
          className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-black/70"
        >
          {facing === "front" ? "◀︎ Look Left" : "◀︎ Face Forward"}
        </button>

        {!canProceed ? (
          <button
            onClick={() => setPanel(facing === "front" ? "puzzle" : "indices")}
            className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition"
          >
            {facing === "front" ? (ventOpen ? "Inspect Vent (complete)" : "Inspect Nilometer (puzzle)") : "Read Tablet (indices)"}
          </button>
        ) : (
          <button
            onClick={onProceed}
            className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-emerald-300 to-emerald-500 border border-emerald-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition"
          >
            Proceed through Vent
          </button>
        )}

        <button
          onClick={() => setFacing(f => (f === "front" ? "right" : "front"))}
          className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-black/70"
        >
          {facing === "front" ? "Look Right ▶︎" : "Face Forward ▶︎"}
        </button>
      </div>

      {panel !== "none" && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <div className="absolute -top-10 right-0 flex gap-2">
              <button
                onClick={() => setPanel("puzzle")}
                className={`px-3 py-1.5 rounded-lg border text-sm ${panel === "puzzle" ? "bg-amber-600 text-white border-amber-500" : "bg-black/60 border-white/10 text-white"}`}
              >
                Puzzle
              </button>
              <button
                onClick={() => setPanel("indices")}
                className={`px-3 py-1.5 rounded-lg border text-sm ${panel === "indices" ? "bg-amber-600 text-white border-amber-500" : "bg-black/60 border-white/10 text-white"}`}
              >
                Indices
              </button>
              <button
                onClick={() => setPanel("none")}
                className="px-3 py-1.5 rounded-lg bg-black/70 border border-white/10 text-white"
              >
                Close (Esc)
              </button>
            </div>

            {panel === "puzzle" ? (
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <NilometerPuzzle
                  embedded
                  targetCubits={variant.cubits}
                  targetPalms={variant.palms}
                />
              </div>
            ) : (
              <IndicesPanel variant={variant} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NileBackground({ facing, ventOpen }: { facing: Facing; ventOpen: boolean }) {
  const base = "absolute inset-0 transition-all duration-500 will-change-transform";
  const leftSkew = facing === "left" ? "translate-x-0" : "translate-x-[-8%]";
  const rightSkew = facing === "right" ? "translate-x-0" : "translate-x-[8%]";

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

      {/* chamber tone */}
      <div className={`${base} bg-[radial-gradient(80%_60%_at_50%_50%,_#332a23,_#1f1a16_70%)]`} />

      {/* left wall tablet silhouette */}
      <div className={`${base} ${leftSkew}`}>
        <div className="absolute left-6 top-1/4 w-[28%] h-[52%] rounded-lg border border-amber-900/30 bg-amber-50/5 backdrop-blur-[1px]" />
      </div>

      {/* right wall marks */}
      <div className={`${base} ${rightSkew}`}>
        <div className="absolute right-8 top-1/5 w-[22%] h-[60%] rounded-lg border border-amber-900/20 bg-amber-50/5" />
      </div>

      {/* front nilometer shaft & vent */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative w-[44%] max-w-[520px] h-[64%] rounded-[18px] border-4
            ${ventOpen ? "border-sky-400" : "border-amber-600"}
            bg-[radial-gradient(circle_at_50%_10%,_rgba(160,200,255,0.10),_rgba(20,40,80,0.10)_70%),linear-gradient(180deg,_#2b2b33,_#21212a)]
            shadow-[inset_0_14px_48px_rgba(0,0,0,0.55)]
          `}
        >
          {/* grille or glow */}
          {!ventOpen ? (
            <div className="absolute inset-6 grid grid-cols-6 gap-3 opacity-70">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="rounded bg-black/40 border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="absolute -inset-6 rounded-[22px] bg-sky-400/10 blur-2xl pointer-events-none" />
          )}
          {/* central gauge silhouette */}
          <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-10 rounded bg-black/50 border border-white/10" />
        </div>
      </div>
    </div>
  );
}

function IndicesPanel({ variant }: { variant: { cubits:number; palms:number; seasonNote:string; fact:string; hint:string } }) {
  return (
    <div className="rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white shadow-2xl">
      <div className="px-5 py-3 border-b border-zinc-700/70 text-amber-300 font-semibold">Indices (Hints)</div>
      <div className="p-5">
        <div className="rounded-xl border border-amber-900/30 p-4 md:p-5 bg-[radial-gradient(ellipse_at_top,_#fff7e6,_#f1e0bf)] text-zinc-900 shadow-inner">
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-zinc-800">
              A nilometer measures flood height in <strong>cubits</strong> and <strong>palms</strong>.
              <br/>Remember: <strong>1 cubit = 7 palms</strong>.
            </p>
            <div className="rounded-lg bg-amber-100/70 p-3 border border-amber-300 text-amber-900">
              <div className="text-sm font-semibold mb-1">Target reading</div>
              <div className="text-sm opacity-90">{variant.cubits} cubits {variant.palms} palms</div>
            </div>
            <p className="text-amber-900/80"><strong>Hint:</strong> {variant.hint}</p>
            <p className="text-zinc-800/90">{variant.fact}</p>
            <p className="text-zinc-800/90">{variant.seasonNote}</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-300/80">
          Press <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">P</kbd> for Puzzle,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">I</kbd> to return here,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">Esc</kbd> to close.
        </div>
      </div>
    </div>
  );
}
