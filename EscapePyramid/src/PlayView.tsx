import React, { useEffect } from "react";
import { useRoom } from "./state/RoomProvider";
import HUD from "./ui/HUD";
import CartouchePuzzle from "./puzzles/CartouchePuzzle";
import NilometerPuzzle from "./puzzles/NilometerPuzzle";
import StarsPuzzle from "./puzzles/StarsPuzzle";
import CanopicPuzzle from "./puzzles/CanopicPuzzle";
import TradePuzzle from "./puzzles/TradePuzzle";
import SwordTrialPuzzle from "./puzzles/SwordTrialPuzzle";
import FinalRitual from "./FinalRitual";

export default function PlayView({ preselectPuzzle }: { preselectPuzzle?: string }) {
  const { doors, meta } = useRoom();
  const door = (k: string) => doors.find(d => d.key === k)?.state === 'open';

  useEffect(() => {
    if (!preselectPuzzle) return;
    const el = document.querySelector<HTMLElement>(`[data-puzzle="${preselectPuzzle}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2','ring-amber-400','ring-offset-2','ring-offset-zinc-950');
      setTimeout(() => el.classList.remove('ring-2','ring-amber-400','ring-offset-2','ring-offset-zinc-950'), 1800);
      const focusable = el.querySelector<HTMLElement>('input,select,button,textarea');
      focusable?.focus?.();
    }
  }, [preselectPuzzle]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <HUD />

      <div className="rounded-2xl p-6 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-800 text-white shadow-xl">
        <div className="text-sm opacity-70 mb-3">Antechamber</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card title="Cartouche Niche" locked={!door('ankh_door')} lockHint="Opens with cartouche answer" dataPuzzle="cartouche">
              <CartouchePuzzle />
            </Card>

            <Card title="Nilometer Gauge" locked={false} dataPuzzle="nilometer">
              <NilometerPuzzle />
            </Card>

            <Card title="Star Shaft" locked={false} dataPuzzle="stars">
              <StarsPuzzle />
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Sarcophagus Gate" locked={!door('sarcophagus_gate')} lockHint="Opens after canopic logic" dataPuzzle="canopic">
              <CanopicPuzzle />
            </Card>

            <Card title="Trade Map" locked={false} dataPuzzle="trade">
              <TradePuzzle />
            </Card>

            <Card title="Warrior Shrine" locked={false} dataPuzzle="sword_trial">
              <SwordTrialPuzzle />
            </Card>
          </div>
        </div>
      </div>

      <FinalRitual />

      {meta?.status === 'ended' && (
        <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/40 text-emerald-200">
          Debrief: You applied cartouches (royal names), nilometer/cubits (flood), stellar alignment (true north),
          canopic jars (deities/organs), and trade sources (Byblos/Punt/Nubia/Sinai). Balance (Ma’at) wins.
        </div>
      )}
    </div>
  );
}

function Card({
  title, children, locked, lockHint, dataPuzzle,
}:{
  title:string; children:any; locked?:boolean; lockHint?:string; dataPuzzle?: string;
}) {
  return (
    <div
      data-puzzle={dataPuzzle}
      className={`rounded-xl p-4 border ${locked?'border-zinc-700 bg-zinc-800/40 opacity-80 pointer-events-auto':'border-zinc-700 bg-zinc-800/60'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        {locked && <span className="text-xs opacity-70">locked: {lockHint ?? 'solve a prerequisite'}</span>}
      </div>
      <div className={`${locked?'pointer-events-none blur-[1px] select-none':''}`}>
        {children}
      </div>
    </div>
  );
}
