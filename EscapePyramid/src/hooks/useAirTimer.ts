import { useEffect, useState } from 'react';
import { getAirSeconds } from '../gameState';

export function useAirTimer(roomId: string | null) {
  const [air, setAir] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    // If no room yet, clear value and skip polling
    if (!roomId) {
      setAir(null);
      return () => { alive = false; };
    }

    const tick = async () => {
      try {
        const secs = await getAirSeconds(roomId);
        if (alive) setAir(secs);
      } catch {
        // ignore transient errors
      }
    };

    tick();                          // initial fetch
    const id = setInterval(tick, 2000);  // poll every 2s
    return () => { alive = false; clearInterval(id); };
  }, [roomId]);

  return air;
}
