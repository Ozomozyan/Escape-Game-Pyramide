// src/GameScreen.tsx
import React, { useEffect, useState } from "react";
import { useRoom } from "./state/RoomProvider";

import IntroView from "./intro/IntroView";
import CorridorCinematic from "./cinematic/CorridorCinematic";

import AntechamberScene from "./scene/AntechamberScene";
import NileChamberScene from "./scene/NileChamberScene";
import StarChamberScene from "./scene/StarChamberScene";
import SarcophagusChamberScene from "./scene/SarcophagusChamberScene";
import TradeChamberScene from "./scene/TradeChamberScene";
import FinalChamberScene from "./scene/FinalChamberScene";
import DebriefScreen from "./final/DebriefScreen";

type View =
  | "intro"
  | "cinematic"
  | "ch1"  // cartouche
  | "ch2"  // nilometer
  | "ch3"  // stars
  | "ch4"  // canopic
  | "ch5"  // trade routes
  | "final"
  | "debrief";

export default function GameScreen() {
  const { meta } = useRoom();
  const [view, setView] = useState<View>("intro");

  useEffect(() => {
    if (!meta) return;
    if (meta.phase === "play" && view === "intro") setView("cinematic");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.phase]);

  if (!meta) return null;

  if (view === "intro") return <IntroView />;
  if (view === "cinematic") return <CorridorCinematic onDone={() => setView("ch1")} />;

  if (view === "ch1") return <AntechamberScene onProceed={() => setView("ch2")} />;
  if (view === "ch2") return <NileChamberScene onProceed={() => setView("ch3")} />;
  if (view === "ch3") return <StarChamberScene onProceed={() => setView("ch4")} />;
  if (view === "ch4") return <SarcophagusChamberScene onProceed={() => setView("ch5")} />;
  if (view === "ch5") return <TradeChamberScene onProceed={() => setView("final")} />;

  if (view === "final") return <FinalChamberScene onProceed={() => setView("debrief")} />;

  return <DebriefScreen />;
}
