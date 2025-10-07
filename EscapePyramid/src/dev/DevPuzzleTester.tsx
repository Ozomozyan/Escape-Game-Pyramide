import { useState } from "react";
import { initRoomEntities, getVariant, solvePuzzle, markLessonRead, performFinal } from "../gameState";

type Sub = { sendBroadcast: (event: "refresh", payload?: any) => Promise<void> } | null;

export default function DevPuzzleTester({
  roomId,
  onRefetch,
  sub,
}: {
  roomId: string;
  onRefetch: () => Promise<void>;
  sub: Sub;
}) {
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [variant, setVariant] = useState<any>(null);

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    try {
      const res = await fn();
      setOutput(res ?? "ok");
      await onRefetch();
      await sub?.sendBroadcast("refresh", {});
    } finally {
      setBusy(false);
    }
  }

  async function fetchVar(key: string) {
    const v = await getVariant(roomId, key);
    setVariant({ ...v, _key: key });
    return v;
  }

  function autoAnswerFor(key: string, v: any) {
    switch (key) {
      case "cartouche":   return { name: v.name };
      case "nilometer":   return { cubits: v.target_cubits };
      case "stars":       return { direction: v.direction };
      case "canopic":     return { mapping: v.mapping };
      case "trade":       return { mapping: v.mapping };
      case "sword_trial": return { word: v.word };
      default:            return {};
    }
  }

  async function autoSolve(key: string) {
    const v = (variant && variant._key === key) ? variant : await fetchVar(key);
    await markLessonRead(roomId, key);
    return await solvePuzzle(roomId, key, autoAnswerFor(key, v));
  }

  return (
    <div className="mt-4 border rounded-lg p-3">
      <h3 className="font-semibold">Dev Puzzle Tester</h3>

      <div className="flex flex-wrap gap-2 mt-2">
        <button disabled={busy} onClick={() => run(() => initRoomEntities(roomId))} className="px-3 py-1 border rounded">
          Init Doors
        </button>

        {/* Auto-solve buttons for each puzzle */}
        {["cartouche","nilometer","stars","canopic","trade","sword_trial"].map(k => (
          <button
            key={k}
            disabled={busy}
            onClick={() => run(() => autoSolve(k))}
            className="px-3 py-1 border rounded"
            title="Fetch variant, mark lesson read, submit correct answer"
          >
            Solve {k}
          </button>
        ))}

        {/* Final rituals */}
        <button disabled={busy} onClick={() => run(() => performFinal(roomId, "cooperate"))} className="px-3 py-1 border rounded">
          Final: Cooperate
        </button>
        <button disabled={busy} onClick={() => run(() => performFinal(roomId, "solo"))} className="px-3 py-1 border rounded">
          Final: Solo
        </button>
      </div>

      <div className="mt-3 text-xs grid gap-2">
        <div>
          <div className="font-semibold">Last variant:</div>
          <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
{JSON.stringify(variant, null, 2)}
          </pre>
        </div>
        <div>
          <div className="font-semibold">Last result:</div>
          <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
{JSON.stringify(output, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
