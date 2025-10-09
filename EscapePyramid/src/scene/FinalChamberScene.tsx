import React, { useEffect, useMemo, useState } from "react";
import { useRoom } from "../state/RoomProvider";
import HUD from "../ui/HUD";
import MaatScalesPuzzle from "../puzzles/MaatScalesPuzzle";

type Facing = "front" | "left" | "right";
type Panel = "none" | "puzzle" | "indices";

export default function FinalChamberScene({ onProceed }: { onProceed: () => void }) {
  const { players, progress } = useRoom();
  const [facing, setFacing] = useState<Facing>("front");
  const [panel, setPanel] = useState<Panel>("none");

  const maatSolved = progress.some(p => p.puzzle_key === "maat" && p.solved);
  const iEscaped = players.find(p => p.status === "escaped"); // at least one escaped
  const canProceed = maatSolved || !!iEscaped;

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
    if (facing === "front") return "The Scales of Ma’at";
    if (facing === "left") return "Instruction Stele";
    return "Judgment Hall Carvings";
  }, [facing]);

  return (
    <div className="relative min-h-[calc(100vh-2rem)] max-w-6xl mx-auto my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 p-3 z-20"><HUD /></div>

      <SceneBG facing={facing} />

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
            {facing === "front" ? "Approach the Scales (puzzle)" : "Read Stele (indices)"}
          </button>
        ) : (
          <button
            onClick={onProceed}
            className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-emerald-300 to-emerald-500 border border-emerald-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition"
          >
            Leave the Tomb
          </button>
        )}

        <button
          onClick={() => setFacing(f => (f === "front" ? "right" : "front"))}
          className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-black/70"
        >
          {facing === "front" ? "Look Right ▶︎" : "Face Forward ▶︎"}
        </button>
      </div>

      {/* Overlay */}
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
                <MaatScalesPuzzle embedded />
              </div>
            ) : (
              <IndicesPanel />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SceneBG({ facing }: { facing: Facing }) {
  const base = "absolute inset-0 transition-all duration-500 will-change-transform";
  const leftSkew = facing === "left" ? "translate-x-0" : "translate-x-[-8%]";
  const rightSkew = facing === "right" ? "translate-x-0" : "translate-x-[8%]";

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      <div className={`${base} bg-[radial-gradient(80%_60%_at_50%_50%,_#2f2925,_#1a1714_70%)]`} />
      <div className={`${base} ${leftSkew}`}>
        <div className="absolute left-6 top-1/4 w-[28%] h-[52%] rounded-lg border border-amber-900/30 bg-amber-50/5" />
      </div>
      <div className={`${base} ${rightSkew}`}>
        <div className="absolute right-8 top-1/5 w-[22%] h-[60%] rounded-lg border border-amber-900/20 bg-amber-50/5" />
      </div>

      {/* central scales silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative w-[46%] max-w-[520px] h-[62%] rounded-[18px] border-4 border-amber-600
            bg-[radial-gradient(circle_at_50%_10%,_rgba(255,240,190,0.12),_rgba(120,80,20,0.10)_70%),linear-gradient(180deg,_#3b332a,_#2a241f)]
            shadow-[inset_0_14px_48px_rgba(0,0,0,0.55)]
          `}
        >
          <div className="absolute inset-10">
            <div className="absolute left-1/2 -translate-x-1/2 top-8 w-1 h-24 bg-amber-600/60" />
            <div className="absolute left-1/2 -translate-x-1/2 top-8 w-28 h-1 bg-amber-600/60" />
            <div className="absolute left-10 top-24 w-16 h-1 bg-amber-500/60" />
            <div className="absolute right-10 top-24 w-16 h-1 bg-amber-500/60" />
            <div className="absolute left-7 top-24 w-20 h-20 rounded-full border border-amber-400/50" />
            <div className="absolute right-7 top-24 w-20 h-20 rounded-full border border-amber-400/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function IndicesPanel() {
  return (
    <div className="rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white shadow-2xl">
      <div className="px-5 py-3 border-b border-zinc-700/70 text-amber-300 font-semibold">Indices (Hints)</div>
      <div className="p-5">
        <div className="rounded-xl border border-amber-900/30 p-4 md:p-5 bg-[radial-gradient(ellipse_at_top,_#fff7e6,_#f1e0bf)] text-zinc-900 shadow-inner">
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-zinc-800">
              In Egyptian belief, a heart was weighed against the <strong>feather of Ma’at</strong>—truth and balance.
              Cooperation honors balance; selfishness tips the scale.
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-800/90">
              <li><strong>Co-op ending:</strong> Requires a <em>Shabti</em>. Both step together; balance achieved → both escape.</li>
              <li><strong>Solo ending:</strong> Use <em>Counterweight Stones</em> or a <em>Bronze Khopesh</em> to force the outcome.</li>
            </ul>
            <p className="text-amber-900/80">
              <strong>Tip:</strong> If your partner is present, press “Step on Plate” at the same time.
            </p>
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
