import React, { useEffect, useState } from "react";
import { getVariant, markLessonRead, solvePuzzle } from "../gameState";
import { useRoom } from "../state/RoomProvider";

export default function SwordTrialPuzzle() {
  const { roomId, refetchAll, broadcastRefresh, progress } = useRoom();
  const solved = !!progress.find(p => p.puzzle_key==='sword_trial' && p.solved);
  const [v, setV] = useState<any>(null);
  const [word, setWord] = useState('');

  useEffect(() => { getVariant(roomId, 'sword_trial').then(setV); }, [roomId]);

  async function submit() {
    await markLessonRead(roomId, 'sword_trial');
    const res = await solvePuzzle(roomId, 'sword_trial', { word });
    await refetchAll(); await broadcastRefresh();
    alert(res.correct ? 'Khopesh claimed.' : 'That’s not the Bronze Age sword term we need.');
  }

  return (
    <Section title="Sword Trial" done={solved} help={v?.lesson}>
      <div className="space-y-2">
        <input value={word} onChange={e=>setWord(e.target.value)} placeholder="Spell the word…" className="w-full border rounded px-3 py-2 bg-white/90" />
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
