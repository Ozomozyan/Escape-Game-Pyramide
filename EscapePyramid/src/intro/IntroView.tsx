// src/intro/IntroView.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRoom } from "../state/RoomProvider";
import { getIntroScript, introAction, introReady, getBarrierStatus, setRequiredReady } from "../intro";
import { initRoomEntities } from "../gameState";

type Step = { key:string; title:string; text:string; action?:string; linkPuzzle?:string };

const BG_URL = "/images/intro/pyramid_bg.jpg"; // <- put your image at this path

export default function IntroView() {
  const { roomId, roomCode, me, refetchAll, broadcastRefresh, meta } = useRoom();
  const [steps, setSteps] = useState<Step[]>([]);
  const [ix, setIx] = useState(0);
  const [readyInfo, setReadyInfo] = useState<{ready:number; total:number; allReady:boolean}|null>(null);

  const role = useMemo(() => (me?.role ?? "P1") as "P1" | "P2", [me?.role]);
  const step = steps[ix];

// after: const step = steps[ix];

  useEffect(() => {
    // reset the label when changing steps
    setReadyInfo(null);

    // only poll on the start plates step
    if (!step || step.key !== "start_timer") return;

    let active = true;

    async function tick() {
      try {
        const s = await getBarrierStatus(roomId, "start_timer");
        if (active) setReadyInfo(s);
      } catch {
        /* ignore */
      }
      if (active) setTimeout(tick, 1500); // poll every 1.5s
    }

    tick();
    return () => { active = false; };
  }, [roomId, step?.key]);  // <- important deps


  useEffect(() => {
    let live = true;
    getIntroScript(roomId, role).then(s => { if (live) setSteps(s as Step[]); });
    // Ensure doors exist (idempotent)
    initRoomEntities(roomId).catch(() => {});
    return () => { live = false; };
  }, [roomId, role]);

  async function doContinue() {
    if (!step) return;
    if (step.action) await introAction(roomId, step.action);
    const rsp = await introReady(roomId, step.key === "start_timer" ? "start_timer" : step.key);
    setReadyInfo(rsp);
    await refetchAll();
    await broadcastRefresh();

    // advance locally except for the final plates (server flips phase to 'play')
    if (step.key !== "start_timer") {
      setIx(Math.min(ix + 1, steps.length - 1));
    }
  }

  if (!step) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-2rem)] rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-6xl">
      {/* Background image */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${BG_URL})` }}
      />
      {/* Vignette + readability gradients */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Room code + role chip (top-left) */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="rounded-lg bg-black/60 text-white font-mono text-sm px-3 py-1 border border-white/10">
          Room: {roomCode}
        </span>
        <span className="rounded-lg bg-black/40 text-white text-xs px-2 py-1 border border-white/10">
          {role}
        </span>
      </div>

      {/* Subtitle bar (bottom) */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl rounded-xl bg-black/65 backdrop-blur-sm border border-white/10 text-white p-4 sm:p-5">
          <div className="text-xs uppercase tracking-wide opacity-70 mb-1">Introduction</div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm sm:text-base opacity-90 leading-relaxed">{step.text}</p>
              {step.linkPuzzle && (
                <div className="mt-1 text-xs opacity-75">
                  This prepares you for <span className="font-semibold">{step.linkPuzzle}</span>.
                </div>
              )}
            </div>

            {step.key !== "start_timer" ? (
              <button
                onClick={doContinue}
                className="self-start sm:self-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 transition text-white"
              >
                Continue
              </button>
            ) : (
              <div className="self-start sm:self-auto space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={async () => { await setRequiredReady(roomId, 1); const s = await getBarrierStatus(roomId, "start_timer"); setReadyInfo(s); }}
                    className="px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white"
                  >
                    Start Solo
                  </button>
                  <button
                    onClick={async () => { await setRequiredReady(roomId, 2); const s = await getBarrierStatus(roomId, "start_timer"); setReadyInfo(s); }}
                    className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white"
                  >
                    Wait for Partner
                  </button>
                  <button
                    onClick={doContinue}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Step on the plate (ready)
                  </button>
                </div>
                <div className="text-xs opacity-80">
                  {readyInfo ? <>Ready {readyInfo.ready}/{readyInfo.total}{readyInfo.allReady ? " — starting…" : ""}</> : "Choose Solo or Wait for Partner, then press Ready."}
                </div>
              </div>
            )}
          </div>

          {/* Step dots */}
          <div className="mt-3 flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= ix ? "bg-white w-8" : "bg-white/30 w-3"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Accessibility: offscreen alt text for the background */}
      <span className="sr-only">
        A dim sandstone antechamber lit by torches and a sun shaft; hieroglyphs cover the walls.
      </span>
    </div>
  );
}
