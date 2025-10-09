// src/GameScreen.tsx
import React, { useEffect, useState } from "react";
import { useRoom } from "./state/RoomProvider";
import IntroView from "./intro/IntroView";
import CorridorCinematic from "./cinematic/CorridorCinematic";
import AntechamberScene from "./scene/AntechamberScene"; // ⬅️ NEW

export default function GameScreen() {
  const { meta } = useRoom();
  const [view, setView] = useState<'intro'|'cinematic'|'play'>('intro');

  // When server flips to 'play', show the cinematic once
  useEffect(() => {
    if (!meta) return;
    if (meta.status === 'ended') {
      setView('play');
      return;
    }
    if (meta.phase === 'play' && view === 'intro') {
      setView('cinematic');
    }
  }, [meta?.phase, meta?.status]); // eslint-disable-line

  if (!meta) return null;

  if (view === 'intro') return <IntroView />;

  if (view === 'cinematic') {
    return (
      <CorridorCinematic
        onDone={() => { setView('play'); }} // ⬅️ after camera push, enter 1st-person scene
      />
    );
  }

  // view === 'play' -> show the first-person antechamber scene (Puzzle 1)
  return <AntechamberScene />;
}
