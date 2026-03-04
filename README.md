# WODLab: AI-Powered CrossFit "Meta-Coach"

WODLab is a sophisticated workout generation system that internalizes the **CrossFit Level 1 Manual** to deliver safe, functional, and variation-aware programming. Unlike random generators, WODLab uses a multi-layered rules engine to ensure physical skill development and optimal stimulus.

## 🚀 Core Philosophy
- **Intelligence over Randomness:** Rule-based movement selection grounded in G/W/M modalities.
- **Data-Driven Adaptation:** Performance data feeds back into the model to identify weaknesses.
- **Methodology-First:** AI logic is grounded in the "Hopper" model and the "Theoretical Hierarchy of Development".

## 🏗️ The 4 Pillars of Architecture

### Pillar 1: The Movement Library (Rules Layer)
The source of truth for all movements, categorized by modality (G/W/M), family (Squat, Hinge, etc.), and progressive skill ladders (Beginner -> RX).

### Pillar 2: The Rules Engine & Coach Brain (Scoring Layer)
- **Equipment Filtering:** Dynamically adapts to what the athlete has available.
- **Deterministic Coach Engine:** Scores every candidate movement using a multi-factor algorithm:
  - **Exponential Fatigue Decay:** Penalises exact movement repeats (-4.0 within 24h, -2.0 within 48h, -1.0 within 72h).
  - **Pattern Capping:** Penalises movement-family repetition (e.g., back-to-back squat days) with a hard cap of -4.0.
  - **Methodist Window Matrix:** Enforces G/W/M (Gymnastics / Weightlifting / Monostructural) balance over a 3-day microcycle with ±2.0 bias adjustments.
  - **Goal Alignment:** Rewards movements that match the athlete's primary training goal.
  - **Skill Calibration:** Rewards movements that match the athlete's fitness level.
- **Modality-Aware Prescriptions:** Rep targets are context-specific — cals for rowers, metres for runs, integer reps for gymnastics and barbell work.
- **Live Library Re-classification:** Historical workouts are re-tagged against the current movement library at hydration time, preventing stale modality data from skewing the matrix.
- **Template Assembly:** Supports 13 CrossFit protocols (AMRAP, EMOM, RFT, Tabata, Death-By, 21-15-9, Ladder, Chipper, Interval, Strength, and more).

### Pillar 3: The Coach Agent (AI Layer)
A RAG-powered middleware (Vertex AI + MongoDB Atlas Vector Search) that interprets the L1 Manual to provide:
- The "Why" behind the workout's stimulus.
- Personalized coaching and motivational cues.
- Personalized coaching and motivational cues.
- Intelligent protocol selection rationale.

### Pillar 4: The Performance Loop (Data Layer)
Structured performance tracking (numeric scoring, RPE, and completion rates) that informs future programming variance.

## 🛠️ Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS, TanStack Query.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** MongoDB Atlas (Mongoose).
- **AI/RAG:** Vertex AI (Gemini 2.0) + Atlas Vector Search.
- **Authentication:** Dual-Auth Strategy (HttpOnly Cookies + JWT Bearer Header) for cross-domain mobile stability.

## 📁 Project Structure
- `/WODLab-V2/frontend`: React application.
- `/WODLab-V2/backend`: Express API and Logic Services.
  - `src/services/scoring/`: Deterministic Coach Engine sub-modules:
    - `WodHydrationService.ts` — Batch DB fetcher + live movement re-classification.
    - `MovementScorer.ts` — Multi-factor scoring with decay, pattern cap, and Matrix.
    - `MethodistMatrix.ts` — G/W/M balance tracker and bias engine.
    - `repTarget.ts` — Modality-aware rep/distance prescriptions.
- `/Docs`: Archive of implementation plans and manual summaries.
- `/Docs/Engineering`: Technical specifications (Architecture, Tasks, Master Prompt).
- `README.md`: This project entry point.
