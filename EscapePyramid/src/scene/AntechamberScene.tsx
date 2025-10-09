// src/scene/AntechamberScene.tsx
import React, { useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { useRoom } from "../state/RoomProvider";
import HUD from "../ui/HUD";
import CartouchePuzzle from "../puzzles/CartouchePuzzle";

type Facing = "front" | "left" | "right";
type Panel = "none" | "puzzle" | "indices";

// Simple “variant” selector for the Indices view (same seed as puzzle)
function useCartoucheVariantSeed(roomId?: string, roomCode?: string) {
  const key = (roomId || roomCode || "seed") + ":cartouche-variant";
  const rng = seedrandom(key);
  const idx = Math.floor(rng() * 6);
  // mirror the list order in CartouchePuzzle.tsx
  const table = [
    { name: "KHUFU (Ḫwfw)", fact: "Khufu (c. 2589–2566 BCE) commissioned the Great Pyramid at Giza.", hint: "‘KHUFU’ repeats the ‘U’ sound twice: top and bottom." },
    { name: "KHAFRE (Ḫʿʿf-Ra)", fact: "Khafre built the second pyramid at Giza; associated with the Great Sphinx.", hint: "‘RE’ (Ra) is the sun—often a round disk. It completes the cartouche." },
    { name: "MENKAURE (Mn-kꜣw-Ra)", fact: "Menkaure is builder of the third pyramid at Giza.", hint: "Menkaure ends with Ra—place ‘RE’ last." },
    { name: "NARMER (nꜥr-mr)", fact: "Narmer is often credited with unifying Upper & Lower Egypt.", hint: "It’s a 2-part name; complete the lower slot with ‘MER’." },
    { name: "HATSHEPSUT (Ḥꜣt-špsw.t)", fact: "Hatshepsut was a powerful female pharaoh; her mortuary temple stands at Deir el-Bahri.", hint: "Three parts: ‘HAT’ – ‘SHEP’ – ‘SUT’." },
    { name: "RAMSES (Rꜥ-ms-sw)", fact: "Ramesses II reigned for ~66 years; famed for Abu Simbel.", hint: "Begin with Ra (the sun); complete with ‘MES’ then ‘ES’." },
  ];
  return table[idx];
}

export default function AntechamberScene() {
  const { roomId, roomCode, doors } = useRoom();
  const [facing, setFacing] = useState<Facing>("front");
  const [panel, setPanel] = useState<Panel>("none");
  const variant = useCartoucheVariantSeed(roomId, roomCode);

  const ankhOpen = doors.find(d => d.key === "ankh_door")?.state === "open";

  // keyboard look & open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== "none") {
        if (e.key === "Escape") setPanel("none");
        if (e.key.toLowerCase() === "i") setPanel(p => (p === "indices" ? "puzzle" : "indices"));
        if (e.key.toLowerCase() === "p") setPanel(p => (p === "puzzle" ? "indices" : "puzzle"));
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

  // little label for what the player sees
  const caption = useMemo(() => {
    if (facing === "front") return ankhOpen ? "Ankh Gate — OPEN" : "Ankh Gate — LOCKED";
    if (facing === "left") return "Wall of Hints (Indices)";
    return "Wall Inscriptions (Indices)";
  }, [facing, ankhOpen]);

  return (
    <div className="relative min-h-[calc(100vh-2rem)] max-w-6xl mx-auto my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

      {/* HUD (top) */}
      <div className="absolute inset-x-0 top-0 p-3 z-20">
        <HUD />
      </div>

      {/* “Camera” view */}
      <SceneBackground facing={facing} gateOpen={ankhOpen} />

      {/* Diegetic label */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
        <div className="px-3 py-1.5 rounded-lg text-amber-200 bg-black/60 border border-amber-500/30 backdrop-blur-sm text-sm">
          {caption}
        </div>
      </div>

      {/* Look controls */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3">
        <button
          onClick={() => setFacing(f => (f === "front" ? "left" : "front"))}
          className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-black/70"
        >
          {facing === "front" ? "◀︎ Look Left" : "◀︎ Face Forward"}
        </button>

        <button
          onClick={() => setPanel(facing === "front" ? "puzzle" : "indices")}
          className="px-5 py-3 rounded-lg font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200 shadow-lg hover:scale-[1.03] active:scale-[0.99] transition"
        >
          {facing === "front" ? (ankhOpen ? "Inspect Gate (continue)" : "Inspect Gate (puzzle)") : "Read Wall (indices)"}
        </button>

        <button
          onClick={() => setFacing(f => (f === "front" ? "right" : "front"))}
          className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-black/70"
        >
          {facing === "front" ? "Look Right ▶︎" : "Face Forward ▶︎"}
        </button>
      </div>

      {/* Overlay panel */}
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
                {/* Embedded mode = just the puzzle surface, no internal tabs */}
                <CartouchePuzzle embedded />
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

// Background drawn with gradients to evoke a 2D first-person chamber
function SceneBackground({ facing, gateOpen }: { facing: Facing; gateOpen: boolean }) {
  // change gradients by facing
  const base =
    "absolute inset-0 transition-all duration-500 will-change-transform";
  const leftSkew = facing === "left" ? "translate-x-0" : "translate-x-[-8%]";
  const rightSkew = facing === "right" ? "translate-x-0" : "translate-x-[8%]";

  return (
    <div className="absolute inset-0 z-0">
      {/* Floor & ceiling vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      {/* Walls */}
      <div className={`${base} bg-[radial-gradient(80%_60%_at_50%_50%,_#3a2f25,_#221c18_70%)]`} />
      {/* Left wall overlay */}
      <div className={`${base} ${leftSkew} md:translate-x-0 md:${facing === "left" ? "" : ""}`}>
        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
        {/* Indices glyphs hint pattern */}
        <div className="absolute left-4 top-1/4 w-[26%] h-[48%] rounded-lg border border-amber-900/30 bg-amber-50/5 backdrop-blur-[1px]" />
      </div>
      {/* Right wall overlay */}
      <div className={`${base} ${rightSkew}`}>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black/30 via-transparent to-transparent" />
      </div>
      {/* Front gate */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative w-[46%] max-w-[520px] h-[62%] rounded-[24px] border-4 transition-all duration-500
            ${gateOpen ? "border-emerald-400" : "border-amber-600"}
            bg-[radial-gradient(circle_at_50%_10%,_rgba(255,220,140,0.18),_rgba(120,80,20,0.12)_70%),linear-gradient(180deg,_#3a2f25,_#2b251f)]
            shadow-[inset_0_14px_48px_rgba(0,0,0,0.5),_0_0_0_1px_rgba(255,200,120,0.18)]
          `}
          aria-label="Ankh Gate"
        >
          {/* Ankh emblem */}
          <div className="absolute inset-0 grid place-items-center">
            <div className={`w-24 h-24 rounded-full border-4 ${gateOpen ? "border-emerald-400" : "border-amber-500"} relative`}>
              <div className="absolute inset-[22%] rounded-full border-2 border-amber-500/60" />
              <div className="absolute left-1/2 -translate-x-1/2 top-[52%] w-2 h-16 bg-amber-500/70 rounded" />
            </div>
          </div>
          {/* Glow if open */}
          {gateOpen && (
            <div className="absolute -inset-6 rounded-[28px] bg-emerald-400/10 blur-2xl pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  );
}

function IndicesPanel({ variant }: { variant: { name: string; fact: string; hint: string } }) {
  return (
    <div className="rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white shadow-2xl">
      <div className="px-5 py-3 border-b border-zinc-700/70 text-amber-300 font-semibold">Indices (Hints)</div>
      <div className="p-5">
        <div className="rounded-xl border border-amber-900/30 p-4 md:p-5 bg-[radial-gradient(ellipse_at_top,_#fff7e6,_#f1e0bf)] text-zinc-900 shadow-inner">
          <div className="text-sm leading-relaxed space-y-3">
            <p className="text-zinc-800">
              Read the wall inscriptions: the royal name rests inside an oval ring — the <strong>cartouche</strong>.
              Choose the correct sound tiles to complete it.
            </p>
            <div className="rounded-lg bg-amber-100/70 p-3 border border-amber-300 text-amber-900">
              <div className="text-sm font-semibold mb-1">{variant.name}</div>
              <div className="text-sm opacity-90">{variant.fact}</div>
            </div>
            <p className="text-amber-900/80"><strong>Hint:</strong> {variant.hint}</p>
            <ul className="list-disc pl-5 text-sm text-zinc-800/90">
              <li>RA (sun) often appears at the end of royal names.</li>
              <li>Repeated vowels may appear more than once (e.g., U in KHUFU).</li>
              <li>Place what you’re most confident about first, then adjust.</li>
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
