import React from "react";
import { useRoom } from "../state/RoomProvider";
import HUD from "../ui/HUD";

export default function DebriefScreen() {
  const { roomCode, progress, artifacts, players } = useRoom();

  const learned = [
    progress.some(p => p.puzzle_key === "cartouche" && p.solved) && "Cartouches & phonetic glyphs",
    progress.some(p => p.puzzle_key === "nilometer" && p.solved) && "Nile flood (cubits & palms)",
    progress.some(p => p.puzzle_key === "stars" && p.solved) && "True north via stars & shafts",
    progress.some(p => p.puzzle_key === "canopic" && p.solved) && "Canopic jars & organs",
    progress.some(p => p.puzzle_key === "trade" && p.solved) && "Trade routes: Byblos, Punt, Nubia, Sinai",
    progress.some(p => p.puzzle_key === "maat" && p.solved) && "Ma’at: balance & cooperation",
  ].filter(Boolean) as string[];

  const ending = progress.find(p => p.puzzle_key === "maat" && p.solved)?.payload?.ending ?? "—";
  const escapedCount = players.filter(p => p.status === "escaped").length;

  return (
    <div className="relative min-h-[calc(100vh-2rem)] max-w-5xl mx-auto my-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-x-0 top-0 p-3 z-20"><HUD /></div>

      <div className="p-6 pt-20 text-white">
        <h1 className="text-2xl font-semibold">Debrief — Room {roomCode}</h1>
        <p className="mt-2 text-zinc-300">Ending: <span className="font-semibold">{ending === "coop" ? "Co-op (both escaped)" : ending === "solo" ? "Solo (one escaped)" : "—"}</span> — Escaped: {escapedCount}</p>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-700 p-4 bg-zinc-900/60">
            <div className="text-amber-300 font-semibold">What you learned</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-zinc-200">
              {learned.length ? learned.map((t, i) => <li key={i}>{t}</li>) : <li>No lessons recorded.</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-700 p-4 bg-zinc-900/60">
            <div className="text-amber-300 font-semibold">Artifacts collected</div>
            <ul className="mt-2 text-sm text-zinc-200">
              {artifacts.length
                ? artifacts.map((a) => (
                    <li key={a.id}>
                      {a.key} ×{a.qty}
                    </li>
                  ))
                : <li>None</li>}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a href="/" className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
