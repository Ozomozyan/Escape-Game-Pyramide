import React, { useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { useRoom } from "../state/RoomProvider";
import HUD from "../ui/HUD";
import StarsPuzzle from "../puzzles/StarsPuzzle";

type Facing = "front" | "left" | "right";
type Panel = "none" | "puzzle" | "indices";

function useStarsVariant(roomId?: string, roomCode?: string) {
  const rng = seedrandom((roomId || roomCode || "seed") + ":stars");
  const mirrorCombos = [
    { A: "EAST", B: "WEST" },
    { A: "WEST", B: "EAST" },
    { A: "NORTH", B: "EAST" },
    { A: "EAST", B: "NORTH" },
  ] as const;
  const pick = mirrorCombos[Math.floor(rng() * mirrorCombos.length)];
  return {
    requiredDirection: "NORTH" as const,
    mirrorA: pick.A as "NORTH" | "EAST" | "SOUTH" | "WEST",
    mirrorB: pick.B as "NORTH" | "EAST" | "SOUTH" | "WEST",
    fact:
      "Egyptian surveyors used a merkhet and circumpolar stars (the “Imperishables”) to find true north for pyramid alignment.",
    hint:
      "Set the shaft to true NORTH, then angle mirrors A & B so the beam reaches the target.",
  };
}

export default function StarChamberScene({ onProceed }: { onProceed: () => void }) {
  const { roomId, roomCode, doors, progress } = useRoom();
  const [facing, setFacing] = useState<Facing>("front");
  const [panel, setPanel] = useState<Panel>("none");
  const v = useStarsVariant(roomId, roomCode);

  const shaftOpen = doors.find((d) => d.key === "light_shaft")?.state === "open";
  const solvedStars = progress.some((p) => p.puzzle_key === "stars" && p.solved);
  const canProceed = shaftOpen || solvedStars;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== "none") {
        if (e.key === "Escape") setPanel("none");
        if (e.key.toLowerCase() === "i") setPanel("indices");
        if (e.key.toLowerCase() === "p") setPanel("puzzle");
        return;
      }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") setFacing((p) => (p === "front" ? "left" : "front"));
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") setFacing((p) => (p === "front" ? "right" : "front"));
      if (e.key === " " || e.key.toLowerCase() === "e" || e.key === "Enter") {
        if (facing === "front") setPanel("puzzle");
        else setPanel("indices");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [facing, panel]);

  const caption = useMemo(() => {
    if (facing === "front") return shaftOpen ? "Sun Shaft — OPEN" : "Sun Shaft (closed)";
    if (facing === "left") return "Star Tablet (Indices)";
    return "Mirror Racks (Indices)";
  }, [facing, shaftOpen]);

  return (
    <div className="relative min-h-[calc(100vh-2rem)] max-w-6xl mx-auto my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 p-3 z-20">
        <HUD />
      </div>

      <SceneBG facing={facing} shaftOpen={shaftOpen} />

      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
        <div className="px-3 py-1.5 rounded-lg text-amber-200 bg-black/60 border border-amber-500/30 backdrop-blur-sm text-sm">
          {caption}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3">
        <button
          onClick={() => setFacing((f) => (f === "front" ? "left" : "front"))}
          className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-black/70"
        >
          {facing === "front" ? "◀︎ Look Left" : "◀︎ Face Forward"}
        </button>

        <button
          onClick={() =>
            canProceed ? onProceed() : setPanel(facing === "front" ? "puzzle" : "indices")
          }
          className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition"
        >
          {facing === "front"
            ? canProceed
              ? "Proceed to Mummy Chamber"
              : "Inspect Mirrors (puzzle)"
            : "Read Tablet (indices)"}
        </button>

        <button
          onClick={() => setFacing((f) => (f === "front" ? "right" : "front"))}
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
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  panel === "puzzle"
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-black/60 border-white/10 text-white"
                }`}
              >
                Puzzle
              </button>
              <button
                onClick={() => setPanel("indices")}
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  panel === "indices"
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-black/60 border-white/10 text-white"
                }`}
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
                <StarsPuzzle
                  embedded
                  requiredDirection={v.requiredDirection}
                  mirrorA={v.mirrorA}
                  mirrorB={v.mirrorB}
                />
              </div>
            ) : (
              <Indices variant={v} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SceneBG({ facing, shaftOpen }: { facing: Facing; shaftOpen: boolean }) {
  const base = "absolute inset-0 transition-all duration-500 will-change-transform";
  const leftSkew = facing === "left" ? "translate-x-0" : "translate-x-[-8%]";
  const rightSkew = facing === "right" ? "translate-x-0" : "translate-x-[8%]";

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      <div className={`${base} bg-[radial-gradient(80%_60%_at_50%_50%,_#2f2a25,_#1c1815_70%)]`} />

      <div className={`${base} ${leftSkew}`}>
        <div className="absolute left-6 top-1/4 w-[28%] h-[52%] rounded-lg border border-amber-900/30 bg-amber-50/5" />
      </div>
      <div className={`${base} ${rightSkew}`}>
        <div className="absolute right-8 top-1/5 w-[22%] h-[60%] rounded-lg border border-amber-900/20 bg-amber-50/5" />
      </div>

      {/* front shaft */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative w-[46%] max-w-[520px] h-[62%] rounded-[18px] border-4
            ${shaftOpen ? "border-emerald-400" : "border-amber-600"}
            bg-[radial-gradient(circle_at_50%_10%,_rgba(255,240,190,0.12),_rgba(120,80,20,0.10)_70%),linear-gradient(180deg,_#3b332a,_#2a241f)]
            shadow-[inset_0_14px_48px_rgba(0,0,0,0.55)]
          `}
        >
          {!shaftOpen ? (
            <div className="absolute inset-8 flex items-center justify-center">
              <div className="w-1/2 h-1 rounded bg-amber-400/50" />
            </div>
          ) : (
            <div className="absolute -inset-6 rounded-[22px] bg-emerald-400/10 blur-2xl pointer-events-none" />
          )}
          {/* target disc */}
          <div className="absolute right-6 top-1/3 w-10 h-10 rounded-full border-4 border-amber-500/70" />
        </div>
      </div>
    </div>
  );
}

function Indices({
  variant,
}: {
  variant: {
    requiredDirection: "NORTH";
    mirrorA: "NORTH" | "EAST" | "SOUTH" | "WEST";
    mirrorB: "NORTH" | "EAST" | "SOUTH" | "WEST";
    fact: string;
    hint: string;
  };
}) {
  return (
    <div className="rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white shadow-2xl">
      <div className="px-5 py-3 border-b border-zinc-700/70 text-amber-300 font-semibold">Indices (Hints)</div>
      <div className="p-5">
        <div className="rounded-xl border border-amber-900/30 p-4 md:p-5 bg-[radial-gradient(ellipse_at_top,_#fff7e6,_#f1e0bf)] text-zinc-900 shadow-inner">
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-zinc-800">
              Align the shaft to <strong>true north</strong>. Egyptian architects used circumpolar stars and the
              <em> merkhet</em> to establish north, then oriented pyramid shafts accordingly.
            </p>
            <div className="rounded-lg bg-amber-100/70 p-3 border border-amber-300 text-amber-900">
              <div className="text-sm font-semibold mb-1">Star survey</div>
              <div className="text-sm opacity-90">{variant.fact}</div>
            </div>
            <p className="text-amber-900/80">
              <strong>Hint:</strong> {variant.hint}
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-800/90">
              <li>Set the shaft to <strong>{variant.requiredDirection}</strong>.</li>
              <li>Then adjust mirror A and mirror B to bounce light to the target ring.</li>
            </ul>
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
