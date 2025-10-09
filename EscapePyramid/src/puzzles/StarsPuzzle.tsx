import React, { useEffect, useState } from "react";
import { getVariant, markLessonRead, solvePuzzle } from "../gameState";
import { useRoom } from "../state/RoomProvider";

export default function StarsPuzzle() {
  const { roomId, refetchAll, broadcastRefresh, progress } = useRoom();
  const solved = !!progress.find(p => p.puzzle_key==='stars' && p.solved);
  const [v, setV] = useState<any>(null);
  const [dir, setDir] = useState('NORTH');

  useEffect(() => { getVariant(roomId, 'stars').then(setV); }, [roomId]);

  async function submit() {
    await markLessonRead(roomId, 'stars');
    const res = await solvePuzzle(roomId, 'stars', { direction: dir });
    await refetchAll(); await broadcastRefresh();
    alert(res.correct ? 'Aligned! The light shaft opens.' : 'That orientation isn’t true north — recheck the hint.');
  }

  return (
    <Section title="Star Alignment" done={solved} help={v?.lesson}>
      <div className="space-y-2">
        <select value={dir} onChange={e=>setDir(e.target.value)} className="border rounded px-3 py-2 bg-white/90">
          {['NORTH','EAST','SOUTH','WEST'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
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
