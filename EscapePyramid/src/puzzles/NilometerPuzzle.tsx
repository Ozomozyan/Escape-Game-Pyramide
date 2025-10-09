import React, { useEffect, useState } from "react";
import { getVariant, markLessonRead, solvePuzzle } from "../gameState";
import { useRoom } from "../state/RoomProvider";

export default function NilometerPuzzle() {
  const { roomId, refetchAll, broadcastRefresh, progress } = useRoom();
  const solved = !!progress.find(p => p.puzzle_key==='nilometer' && p.solved);
  const [v, setV] = useState<any>(null);
  const [cubits, setCubits] = useState<number | ''>('');

  useEffect(() => { getVariant(roomId, 'nilometer').then(setV); }, [roomId]);

  async function submit() {
    await markLessonRead(roomId, 'nilometer');
    const res = await solvePuzzle(roomId, 'nilometer', { cubits: Number(cubits) });
    await refetchAll(); await broadcastRefresh();
    alert(res.correct ? 'Perfect flood! Vent grate opens (+90s air).' : 'Unsafe level — recall Akhet and the cubit scale.');
  }

  return (
    <Section title="Nilometer & Seasons" done={solved} help={v?.lesson}>
      <div className="space-y-2">
        <div className="text-sm opacity-80">Set the safe flood height (in cubits).</div>
        <input type="number" value={cubits} onChange={e=>setCubits(e.target.value === '' ? '' : Number(e.target.value))}
               className="w-40 border rounded px-3 py-2 bg-white/90" placeholder="e.g. 16" />
        <button onClick={submit} className="px-3 py-2 rounded bg-emerald-600 text-white hover:opacity-90">Submit</button>
      </div>
    </Section>
  );
}

function Section({title, help, done, children}:{title:string;help?:string;done?:boolean;children:any}) {
  return (
    <div className={`p-4 rounded-xl border ${done?'border-emerald-500/60 bg-emerald-500/5':'border-zinc-700/60 bg-zinc-800/40'} text-white`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title} {done && <span className="text-emerald-400 text-xs ml-2">solved</span>}</h3>
        {help && <span className="text-xs opacity-70">Lesson: {help}</span>}
      </div>
      {children}
    </div>
  );
}
