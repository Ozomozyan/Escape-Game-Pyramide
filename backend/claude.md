# MA'AT ou asphyxie — Game Concept

## Overview

**Title:** "MA'AT ou asphyxie" — Cooperative escape game in a pyramid

**Pitch:**
Two young archaeologists awaken in an Old Kingdom pyramid. A message from the builder threatens: "Only one can leave." In reality, if players understand and apply Ma'at (truth/balance) and cooperate, both survive. Room loop: learn → cooperate → consequence.

## Target Audience & Format

- **Age:** 15–18 years (high school)
- **Players:** 2 (asynchronous/real-time coop)
- **Duration:** 20–30 minutes
- **Platform:** Browser (PC/tablet), simple controls

## Educational Objectives

- **Geography:** Upper/Lower Egypt, delta/cataracts, north orientation
- **Techniques:** Royal cubit, knotted rope (3–4–5), water leveling
- **Culture/Writing:** Hieroglyphs (phonetic/determinative), cartouche
- **Society/Economy:** Nilometer, flood, calendar (rising of Sirius), taxation
- **Ethics:** Ma'at (truth/justice) vs. tomb raiding

## Player Roles

- **Surveyor:** Geometry, measurements, mechanisms
- **Scribe:** Symbols, chronology, funerary practices

## Core Mechanic: "Teach Then Play"

1. **Mini-lesson:** Short, visual, guided (1–2 min)
2. **Coop challenge:** Each player has half the information
3. **Consequence:**
   - Success = object + slightly slows air timer
   - Failure = progress anyway but with cost (time/shortcut loss)

## Progression (6 Rooms)

### 1. Antechamber – Upper/Lower Egypt
Orient a compass disk (north, red/white crowns)
→ **Object:** Stellar disk

### 2. Surveyors' Gallery – 3–4–5 Rope
Reconstruct a right angle to realign a corridor
→ **Object:** Cubit ruler

### 3. Scribe's Library – Hieroglyphs
Compose the builder's cartouche (reading direction)
→ **Object:** Cartouche seal

### 4. Nilometer Room – Flood/Calendar
Adjust valves to reach the correct height during Sirius rising
→ **Object:** Water key

### 5. Funerary Suite – Ma'at
Separate scales (true/false + respectful protocol)
**Branch:** Ma'at (shared ventilation) vs non-Ma'at ("only one leaves" path)

### 6. Ascending Passage – Counterweights & Stars
Synchronize counterweights + aim circumpolar stars with the disk
→ **Exit**

## Inventory (Rewards That Embody Learning)

- **Stellar disk:** Orientation/astronomy (reorients rooms)
- **Cubit ruler:** Haptic/visual feedback on measurements (accelerates)
- **Cartouche seal:** Authenticates respectful access (secondary doors)
- **Water key:** Opens shared air conduits (coop > competition)

## Possible Endings

- **Ma'at ending (coop):** Both escape; epilogue on preservation
- **Seth ending (competitive):** Only one leaves; clear ethical debrief

## Accessibility & UX

- Clear tutorials, pictograms + audio, colorblind-safe palette, large subtitles
- Hint scale (30s: pictogram; 60s: highlighting)
- Visible timer but slowed by successes (tension without punishment)

## Tech & Ops (MVP)

- **Online coop:** WebSocket (room code), server state, reconnection & save after each room
- **Security:** HTTPS/TLS, no personal data, anonymous avatars, minimal logs
- **Reliability:** Idempotent endpoints, heartbeats, "resume game" button

## Content & AI (Later)

- Data-driven content bank (JSON) to vary questions and rooms
- Future AI option: Generate pedagogical variants from validated sheets

## Deliverables (Week 1 → 3)

- **S1:** Detailed scenario (6 rooms), wireframe UI prototypes, content table (lesson → challenge → reward)
- **S2:** Puzzles 1–3 playable, session server, save system
- **S3:** Puzzles 4–6, pedagogical debrief, accessibility QA, operation documentation

## Backlog (Quick Checklist)

- [ ] Write 6 mini-lessons (text + images)
- [ ] Design 6 coop puzzles (complementary information)
- [ ] Implement inventory & "air" timer
- [ ] Final debrief (what I learned / my choices)
- [ ] Multiplayer (room creation/lobby, resume, minimal logs)
- [ ] Accessibility & real-time tests
