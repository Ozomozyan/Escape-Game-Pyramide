// src/scene/TradeChamberScene.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRoom } from "../state/RoomProvider";
import HUD from "../ui/HUD";
import TradeRoutesPuzzle from "../puzzles/TradePuzzle";

type Facing = "front" | "left" | "right";
type Panel = "none" | "puzzle" | "indices";

export default function TradeChamberScene({ onProceed }: { onProceed: () => void }) {
  const { doors, progress } = useRoom();
  const [facing, setFacing] = useState<Facing>("front");
  const [panel, setPanel] = useState<Panel>("none");

  const finalOpen = doors.find(d => d.key === "final_door")?.state === "open";
  const solved = progress.some(p => p.puzzle_key === "trade" && p.solved);
  const canProceed = finalOpen || solved;

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
    if (facing === "front") return finalOpen ? "Stone Door — OPEN" : "Stone Door (counterweights needed)";
    if (facing === "left") return "Wall Map (Indices)";
    return "Route Inscriptions (Indices)";
  }, [facing, finalOpen]);

  return (
    <div className="relative min-h-[calc(100vh-2rem)] max-w-6xl mx-auto my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 p-3 z-20"><HUD /></div>

      <SceneBG facing={facing} finalOpen={finalOpen} />

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
            {facing === "front" ? "Inspect Door (puzzle)" : "Read Wall (indices)"}
          </button>
        ) : (
          <button
            onClick={onProceed}
            className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-emerald-300 to-emerald-500 border border-emerald-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition"
          >
            Proceed to Final Chamber
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
                <TradeRoutesPuzzle embedded />
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

function SceneBG({ facing, finalOpen }: { facing: Facing; finalOpen: boolean }) {
  const base = "absolute inset-0 transition-all duration-500 will-change-transform";
  const leftSkew = facing === "left" ? "translate-x-0" : "translate-x-[-8%]";
  const rightSkew = facing === "right" ? "translate-x-0" : "translate-x-[8%]";

  return (
    <div className="absolute inset-0 z-0">
      {/* Floor & ceiling vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      
      {/* corridor background - fixed, no skew */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url('/images/pyramid-corridor.webp')" }}
      />
      
      {/* warm dark overlay so UI stays readable */}
      <div aria-hidden className="absolute inset-0 bg-[#0a0704]/65 mix-blend-multiply" />

      {/* Left wall overlay */}
      <div className={`${base} ${leftSkew}`}>
        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
        <div className="absolute left-6 top-1/4 w-[28%] h-[52%] rounded-lg border border-amber-900/30 bg-amber-50/5 backdrop-blur-[1px]" />
      </div>

      {/* Right wall overlay */}
      <div className={`${base} ${rightSkew}`}>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black/30 via-transparent to-transparent" />
        <div className="absolute right-8 top-1/5 w-[22%] h-[60%] rounded-lg border border-amber-900/20 bg-amber-50/5 backdrop-blur-[1px]" />
      </div>

      {/* front final door */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative w-[46%] max-w-[520px] h-[62%] rounded-[18px] border-4
            ${finalOpen ? "border-emerald-400" : "border-amber-600"}
            bg-[radial-gradient(circle_at_50%_10%,_rgba(255,240,190,0.12),_rgba(120,80,20,0.10)_70%),linear-gradient(180deg,_#3b332a,_#2a241f)]
            shadow-[inset_0_14px_48px_rgba(0,0,0,0.55)]
          `}
        >
          {!finalOpen ? (
            <div className="absolute inset-8 flex items-center justify-center">
              <div className="w-1/2 h-1 rounded bg-amber-400/50" />
            </div>
          ) : (
            <div className="absolute -inset-6 rounded-[22px] bg-emerald-400/10 blur-2xl pointer-events-none" />
          )}
          <div className="absolute right-6 top-1/3 w-10 h-10 rounded-full border-4 border-amber-500/70" />
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
              Egypt traded widely: <strong>cedar</strong> from <em>Byblos</em>, <strong>incense</strong> from <em>Punt</em>,
              <strong> gold</strong> from <em>Nubia</em>, and <strong>copper</strong> from <em>Sinai</em>.
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-800/90">
              <li><em>Byblos</em> (Levant): ships of cedar reached the Nile Delta.</li>
              <li><em>Punt</em> (Red Sea/Horn): expeditions brought incense trees and resins.</li>
              <li><em>Nubia</em> (Upper Nile): a critical source of gold and other goods.</li>
              <li><em>Sinai</em>: mined copper and turquoise since early dynasties.</li>
            </ul>
            <p className="text-amber-900/80"><strong>Tip:</strong> If unsure, think <em>geography</em> first—sea routes vs upriver vs desert mining.</p>
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
