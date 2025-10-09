// src/puzzles/CartouchePuzzle.tsx
import React, { useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { supabase } from "../supabaseClient";
import { useRoom } from "../state/RoomProvider";

// --- Variant & token setup ----------------------------------------------------

type Variant = {
  name: string;                  // Pharaoh / royal name shown in Knowledge
  tokens: string[];              // phonetic pieces to place (simplified transliteration)
  missingIdx: number[];          // positions the player must fill
  distractors: string[];         // extra tiles to mislead slightly
  fact: string;                  // small factoid for the Knowledge panel
  hint: string;                  // short hint for the Indices panel
};

// We keep tokens readable (transliteration-ish) but style them like “glyph tiles”
const VARIANTS: Variant[] = [
  {
    name: "KHUFU (Ḫwfw)",
    tokens: ["KH", "U", "F", "U"],
    missingIdx: [1, 3],
    distractors: ["RA", "M", "N", "T"],
    fact: "Khufu (c. 2589–2566 BCE) commissioned the Great Pyramid at Giza.",
    hint: "‘KHUFU’ repeats the ‘U’ sound twice: top and bottom.",
  },
  {
    name: "KHAFRE (Ḫʿʿf-Ra)",
    tokens: ["KH", "A", "F", "RE"],
    missingIdx: [1, 3],
    distractors: ["U", "M", "N", "T"],
    fact: "Khafre built the second pyramid at Giza; associated with the Great Sphinx.",
    hint: "‘RE’ (Ra) is the sun—often a round disk. It completes the cartouche.",
  },
  {
    name: "MENKAURE (Mn-kꜣw-Ra)",
    tokens: ["MEN", "KA", "U", "RE"],
    missingIdx: [2, 3],
    distractors: ["KH", "F", "T", "N"],
    fact: "Menkaure is builder of the third pyramid at Giza.",
    hint: "Menkaure ends with Ra—place ‘RE’ last.",
  },
  {
    name: "NARMER (nꜥr-mr)",
    tokens: ["NAR", "MER"],
    missingIdx: [1],
    distractors: ["RE", "U", "KA", "KH"],
    fact: "Narmer is often credited with unifying Upper & Lower Egypt.",
    hint: "It’s a 2-part name; complete the lower slot with ‘MER’.",
  },
  {
    name: "HATSHEPSUT (Ḥꜣt-špsw.t)",
    tokens: ["HAT", "SHEP", "SUT"],
    missingIdx: [1, 2],
    distractors: ["RE", "KA", "MEN", "U"],
    fact: "Hatshepsut was a powerful female pharaoh; her mortuary temple stands at Deir el-Bahri.",
    hint: "Three parts: ‘HAT’ – ‘SHEP’ – ‘SUT’.",
  },
  {
    name: "RAMSES (Rꜥ-ms-sw)",
    tokens: ["RA", "MES", "ES"],
    missingIdx: [1, 2],
    distractors: ["KH", "U", "N", "KA"],
    fact: "Ramesses II (the Great) reigned for 66 years; prolific builder, famed for Abu Simbel.",
    hint: "Begin with Ra (the sun); complete with ‘MES’ then ‘ES’.",
  },
];

// --- Utility UI bits ----------------------------------------------------------

function Tile({ text, onClick, disabled }: { text: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border font-semibold tracking-wide
        ${disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.03] active:scale-[0.98]"}
        bg-amber-200/80 text-zinc-900 border-amber-400 shadow-sm`}
      aria-label={`glyph ${text}`}
    >
      {text}
    </button>
  );
}

function Parchment({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-900/30 p-4 md:p-5 bg-[radial-gradient(ellipse_at_top,_#fff7e6,_#f1e0bf)] text-zinc-900 shadow-inner">
      {children}
    </div>
  );
}

function StoneCard({ children, title, right }: { children: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-700/70 bg-[linear-gradient(180deg,_#2b2723,_#201d1a)] text-white shadow-xl">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-700/70">
        <div className="font-semibold tracking-wide text-amber-300">{title}</div>
        <div>{right}</div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

// --- Main component -----------------------------------------------------------

export default function CartouchePuzzle({ embedded = false }: { embedded?: boolean }) {
  const { roomId, roomCode, me, refetchAll, broadcastRefresh, progress, doors } = useRoom();

  // is already solved?
  const solved = useMemo(
    () => !!progress.find((p) => p.puzzle_key === "cartouche" && p.solved),
    [progress]
  );

  // choose a variant by room seed (stable per room)
  const variant = useMemo<Variant>(() => {
    const rng = seedrandom(roomId || roomCode || "seed");
    const idx = Math.floor(rng() * VARIANTS.length);
    return VARIANTS[idx];
  }, [roomId, roomCode]);

  // compute the working slots & choices
  const [activeTab, setActiveTab] = useState<"puzzle" | "knowledge" | "indices">("puzzle");
  const [slots, setSlots] = useState<(string | null)[]>(() => [...variant.tokens].map((t, i) => (variant.missingIdx.includes(i) ? null : t)));
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);

  // Build tray: missing tokens + distractors, shuffled but stable
  const tray = useMemo(() => {
    const need: string[] = variant.missingIdx.map((i) => variant.tokens[i]);
    const full = [...need, ...variant.distractors];
    const rng = seedrandom(roomId + ":cartouche");
    for (let i = full.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [full[i], full[j]] = [full[j], full[i]];
    }
    return full;
  }, [variant, roomId]);

  useEffect(() => {
    // reset when variant changes
    setSlots([...variant.tokens].map((t, i) => (variant.missingIdx.includes(i) ? null : t)));
    setDone(false);
    setShake(false);
    setActiveTab("puzzle");
  }, [variant]);

  useEffect(() => {
    if (solved) setDone(true);
  }, [solved]);

  const nextEmpty = () => variant.missingIdx.find((i) => slots[i] === null);

  const placeToken = (tok: string) => {
    const idx = nextEmpty();
    if (idx === undefined) return;
    const ns = [...slots];
    ns[idx] = tok;
    setSlots(ns);
  };

  const clearLast = () => {
    // clear the last filled missing slot
    const filled = variant.missingIdx.filter((i) => slots[i] !== null);
    if (!filled.length) return;
    const idx = filled[filled.length - 1];
    const ns = [...slots];
    ns[idx] = null;
    setSlots(ns);
  };

  const reset = () => {
    setSlots([...variant.tokens].map((t, i) => (variant.missingIdx.includes(i) ? null : t)));
  };

  const isCorrect = () => slots.every((t, i) => t === variant.tokens[i]);

  // --- Persist success (progress, artifacts, doors, air) ----------------------
  const commitSuccess = async () => {
    // Insert progress
    try {
      await supabase.from("progress").insert({
        room_id: roomId,
        puzzle_key: "cartouche",
        solved: true,
        payload: { attempt: slots, variant: variant.name },
      });
    } catch (_) {
      // ignore (maybe already inserted); try to ensure solved=true
      await supabase.from("progress").upsert(
        { room_id: roomId, puzzle_key: "cartouche", solved: true, payload: { attempt: slots, variant: variant.name } },
        { onConflict: "room_id,puzzle_key" }
      );
    }
    // Give artifact (Ankh)
    try {
      await supabase.from("artifacts").insert({ room_id: roomId, key: "ankh_key", qty: 1 });
    } catch (_) {}
    // Open Ankh door if present
    const { error } = await supabase.from("doors").update({ state: "open" }).eq("room_id", roomId).eq("key", "ankh_door");
    // ignore error if any
    // +60s air bonus (server side keeps caps/logic)
    try {
      await supabase.rpc("increment_air_bonus", { p_room_id: roomId, p_delta: 60 });
    } catch (_) {
      // ignore error
    }
    // refresh both clients
    await refetchAll();
    await broadcastRefresh();
  };

  const onCheck = async () => {
    setChecking(true);
    if (isCorrect()) {
      setDone(true);
      await commitSuccess();
      // tiny flourish: pulse success ring
      setTimeout(() => setChecking(false), 400);
    } else {
      // shake the cartouche
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setChecking(false);
    }
  };

  // --- Cartouche visual -------------------------------------------------------
  // door state for small label
  const ankhDoorOpen = doors.find((d) => d.key === "ankh_door")?.state === "open";

  return (
    <div className="relative">
      {/* Tabs */}
      {!embedded && (
        <div className="flex items-center gap-2 mb-3">
          {[
            { k: "puzzle", label: "Puzzle" },
            { k: "knowledge", label: "Knowledge" },
            { k: "indices", label: "Indices" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k as any)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                activeTab === t.k
                  ? "bg-amber-600 text-white border-amber-500"
                  : "bg-zinc-800/60 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-zinc-400">
            Door:{" "}
            <span className={`font-semibold ${ankhDoorOpen ? "text-emerald-300" : "text-zinc-300"}`}>
              {ankhDoorOpen ? "Ankh Gate OPEN" : "Ankh Gate LOCKED"}
            </span>
          </div>
        </div>
      )}

      {/* Panels */}
      {!embedded && activeTab === "knowledge" && (
        <StoneCard title="Cartouche: Name of a King">
          <Parchment>
            <div className="text-sm leading-relaxed space-y-3">
              <p>
                A <strong>cartouche</strong> is an oval ring that encircles a royal name. Most hieroglyphs inside are{" "}
                <em>phonetic</em>—they spell the sound of the name.
              </p>
              <p>
                In this puzzle you’ll complete a cartouche by choosing the right sound tiles (e.g., <span className="font-semibold">RA, KH, KA</span>).
                The vertical layout is a stylistic presentation—real inscriptions can stack or group signs.
              </p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Determinatives</strong> (idea signs) don’t read aloud; we omit them here for clarity.
                </li>
                <li>
                  The sun disk <strong>RA</strong> often marks the god Ra (read “Re/ Ra”).
                </li>
                <li>
                  Repeated vowels like <strong>U</strong> in KHUFU appear more than once.
                </li>
              </ul>
              <div className="rounded-lg bg-amber-100/70 p-3 border border-amber-300 text-amber-900">
                <div className="text-sm font-semibold mb-1">{variant.name}</div>
                <div className="text-sm opacity-90">{variant.fact}</div>
              </div>
            </div>
          </Parchment>
        </StoneCard>
      )}

      {!embedded && activeTab === "indices" && (
        <StoneCard title="Indices (Hints)">
          <Parchment>
            <div className="text-sm leading-relaxed space-y-2">
              <p>{variant.hint}</p>
              <p className="opacity-80">
                Tip: Try placing what you’re most confident about first—often the start (top) or the divine name (<strong>RA</strong>) at the end.
              </p>
              <p className="opacity-80">
                If you’re unsure, switch back to <strong>Knowledge</strong> for the quick lesson, then return here.
              </p>
            </div>
          </Parchment>
        </StoneCard>
      )}

      {(embedded || activeTab === "puzzle") && (
        <StoneCard
          title="Complete the Cartouche"
          right={
            <div className="flex items-center gap-2">
              {!done ? (
                <>
                  <button onClick={reset} className="text-xs px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700">
                    Reset
                  </button>
                  <button onClick={clearLast} className="text-xs px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700">
                    Undo
                  </button>
                  <button
                    onClick={onCheck}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500"
                    disabled={checking}
                  >
                    Check
                  </button>
                </>
              ) : (
                <span className="text-emerald-300 text-sm">Solved ✓ (+ Ankh, +60s Air)</span>
              )}
            </div>
          }
        >
          <div className="grid md:grid-cols-2 gap-6">
            {/* Cartouche column */}
            <div className="flex items-center justify-center">
              <div
                className={`relative w-52 md:w-64 h-[420px] md:h-[520px] rounded-full border-4
                  ${done ? "border-emerald-400" : shake ? "border-red-400 animate-[wiggle_0.45s_ease-in-out]" : "border-amber-500"}
                  bg-[radial-gradient(circle_at_50%_10%,_rgba(255,220,140,0.3),_rgba(120,80,20,0.15)_70%),linear-gradient(180deg,_#3a2f25,_#2b251f)]
                  shadow-[inset_0_12px_40px_rgba(0,0,0,0.45),_0_0_0_1px_rgba(255,200,120,0.2)]
                `}
                style={{ boxShadow: "inset 0 12px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(255,200,120,.2)" }}
                aria-label="cartouche"
              >
                {/* inner slots */}
                <div className="absolute inset-[18px] flex flex-col items-center justify-center gap-3">
                  {slots.map((tok, i) => {
                    const missing = variant.missingIdx.includes(i);
                    return (
                      <div
                        key={i}
                        className={`w-36 md:w-44 h-12 rounded-xl border flex items-center justify-center
                          ${missing ? "border-amber-500/70 bg-amber-200/10" : "border-zinc-500/40 bg-zinc-700/30"}
                          ${!missing ? "opacity-80" : ""}`}
                      >
                        {tok ? (
                          <span className="font-semibold tracking-wider text-amber-200">{tok}</span>
                        ) : missing ? (
                          <span className="text-amber-300/60 text-xs">place tile</span>
                        ) : (
                          <span className="text-zinc-400/60 text-xs">fixed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tiles column */}
            <div>
              <div className="text-sm mb-2 text-zinc-300">
                Choose tiles and fill the empty slots (top → bottom). Use <strong>Undo</strong> / <strong>Reset</strong> as needed.
              </div>
              <div className="flex flex-wrap gap-2">
                {tray.map((t, idx) => {
                  // tile is disabled if all instances of this token are already placed in missing slots
                  const neededCount = variant.missingIdx.filter((i) => variant.tokens[i] === t).length;
                  const placedCount = variant.missingIdx.filter((i) => slots[i] === t).length;
                  const disabled = placedCount >= neededCount || done;
                  return <Tile key={t + idx} text={t} onClick={() => placeToken(t)} disabled={disabled} />;
                })}
              </div>

              {/* Success panel */}
              {done && (
                <div className="mt-4 rounded-lg border border-emerald-600/40 bg-emerald-900/20 p-3 text-emerald-200">
                  <div className="font-semibold mb-1">Cartouche complete!</div>
                  <div className="text-sm">
                    You unlocked the <strong>Ankh Key</strong> and gained <strong>+60s air</strong>. The <strong>Ankh Gate</strong> should now be open.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* tiny CSS keyframe for shake */}
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
        </StoneCard>
      )}
    </div>
  );
}
