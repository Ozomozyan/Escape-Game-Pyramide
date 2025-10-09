import React, { useEffect, useState } from "react";
import { getVariant, markLessonRead, solvePuzzle } from "../gameState";
import { useRoom } from "../state/RoomProvider";

const ORGANS = ['liver','lungs','stomach','intestines'];

export default function CanopicPuzzle() {
  const { roomId, refetchAll, broadcastRefresh, progress } = useRoom();
  const solved = !!progress.find(p => p.puzzle_key==='canopic' && p.solved);
  const [v, setV] = useState<any>(null);
  const [map, setMap] = useState<{[k:string]:string}>({Imsety:'liver', Hapi:'lungs', Duamutef:'stomach', Qebehsenuef:'intestines'});

  useEffect(() => { getVariant(roomId, 'canopic').then(setV); }, [roomId]);

  async function submit() {
    await markLessonRead(roomId, 'canopic');
    const res = await solvePuzzle(roomId, 'canopic', { mapping: map });
    await refetchAll(); await broadcastRefresh();
    alert(res.correct ? 'Correct — gate opens, shabti gained.' : 'Mismatch — revisit which deity guards which organ.');
  }

  return (
    <Section title="Canopic Logic" done={solved} help={v?.lesson}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.keys(map).map(k => (
          <div key={k} className="p-2 rounded bg-zinc-900/50">
            <div className="text-xs opacity-70">{k}</div>
            <select className="w-full border rounded px-2 py-1 bg-white/90"
                    value={map[k]} onChange={e=>setMap(m=>({...m,[k]:e.target.value}))}>
              {ORGANS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
      <button onClick={submit} className="mt-3 px-3 py-2 rounded bg-emerald-600 text-white hover:opacity-90">Submit</button>
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
