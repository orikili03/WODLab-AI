---
type: methodology_guide
description: Classification and stimulus intent for CrossFit protocols, such as AMRAP, EMOM, and FOR_TIME.
---

# WOD Protocols — Coach Reference

Classification and stimulus intent for CrossFit protocols. Use for **analyzing** and **classifying** WODs from archives; do not randomly deliver WODs — use this knowledge to generate principled, stimulus-appropriate workouts.

## Protocol Definitions

| Protocol | Description | Generated | Typical Duration | Energy System |
|----------|-------------|-----------|------------------|---------------|
| **AMRAP** | As Many Rounds/Reps As Possible | ✅ | 8–25 min | Glycolytic / Aerobic |
| **FOR_TIME**| Rounds for Time (RFT) | ✅ | 5–30 min | Mixed |
| **EMOM** | Every Minute On the Minute | ✅ | 8–20 min | Mixed / Quality |
| **TABATA** | 20s work / 10s rest × 8 | ✅ | 4 min | Phosphagen |
| **DEATH_BY**| Ascending ladder each minute | ✅ | 10–20 min | Glycolytic |
| **21-15-9** | Descending rep sprint | ✅ | 5–12 min | Phosphagen–Glycolytic |
| **LADDER** | Continuous rep increment | ✅ | 7–25 min | Mixed |
| **CHIPPER** | Long list of tasks | ✅ | 25–45 min | Aerobic–Glycolytic |
| **INTERVAL**| Fixed work/rest windows | ✅ | 15–40 min | Aerobic / Power |
| **STRENGTH**| Finding 1RM or Heavy Sets | ✅ | 15–25 min | Neuromuscular |
| **REST_DAY**| Recovery / Education | ✅ | — | — |

## Protocol → Stimulus Mapping

- **Sprint (<7 min)**: FOR_TIME, 21-15-9, TABATA — high power, low total volume.
- **Short metcon (8–20 min)**: AMRAP, EMOM, FOR_TIME, DEATH_BY — sustained effort, moderate volume.
- **Long aerobic (20–40 min)**: AMRAP, CHIPPER, INTERVAL, LADDER — pacing, higher total volume.
- **Strength bias**: STRENGTH_SINGLE, STRENGTH_SETS, or EMOM with heavy, low-rep work.
- **Skill**: EMOM or short AMRAP with technique focus; lower density.

## Rep Scheme Guidelines by Protocol

Duration and volume are now derived from the **Protocol Blueprint Matrix** (`ProtocolBlueprintMatrix.ts`) — each entry encodes coaching-doctrine prescriptions per protocol × stimulus × tier.

Key rules:
- **AMRAP** (sprint): 2 movements, reps × 0.6 → each round <90 sec.
- **AMRAP** (metcon): 2–3 movements, reps × 1.0 → rounds 90–180 sec.
- **AMRAP** (aerobic): 3–4 movements, reps × 1.2 → rounds 3–6 min.
- **EMOM**: Work fits in ~40s (metcon) or ~25s (strength) so rest is meaningful. Reps are capped to the window.
- **TABATA**: 20s work interval — reps capped to fit. Classic monostructural variant: 1 movement only (running sprints).
- **CHIPPER**: 4–6 movements, reps × 1.8 → high station volume; athlete should not full-stop on any station.
- **DEATH_BY**: Always starts at 1 rep; ascending +1 per minute. 10–20 min depending on athlete.
- **STRENGTH_SINGLE / STRENGTH_SETS**: Load at 80–90% of defaultLoadKg; very low reps (1–5).

## Key Rule

WODs are fetched and stored **to learn structure, scaling, and stimulus** — not to be randomly served. Generation must use this taxonomy to pick protocol and duration from **intended stimulus** (see `StimulusIntentService.ts` and `ProtocolBlueprintMatrix.ts`).

