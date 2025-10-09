import React, { useEffect, useState } from "react";
import { useRoom } from "./state/RoomProvider";
import IntroView from "./intro/IntroView";
import PlayView from "./PlayView";
import CorridorCinematic from "./cinematic/CorridorCinematic";

export default function GameScreen() {
  const { meta } = useRoom();
  const [view, setView] = useState<'intro'|'cinematic'|'play'>('intro');
  const [preselect, setPreselect] = useState<string | null>(null);

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
        onDone={() => { setView('play'); setPreselect('cartouche'); }} // go to first puzzle
      />
    );
  }

  // view === 'play'
  return <PlayView preselectPuzzle={preselect ?? undefined} />;
}
