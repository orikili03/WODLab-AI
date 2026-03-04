# scripts/

One-off developer utilities. None of these run as part of the server.

## seed.ts

Populates the `movements` collection with the full movement library.

```bash
# From WODLab-V2/backend/
npx tsx src/scripts/seed.ts
```

Requires a valid `MONGODB_URI` in `.env`. Safe to re-run — uses `updateOne` with `upsert`.

## generate_seed.cjs

Regenerates `seed.ts` from a source `movements.json` file.

> **Before running:** update the two hardcoded absolute paths at the top of the file
> to point to your local `movements.json` source and desired output path.

```bash
node src/scripts/generate_seed.cjs
```

After regenerating, run `seed.ts` to push the new data to the DB.

## seed_history.ts

Generates 28 days of realistic workout history for three test athletes (RX, Scaled, Beginner).
Wipes **all** workouts before seeding. Upserts users — safe to re-run.

```bash
npx tsx src/scripts/seed_history.ts
```

Test credentials (password for all: `WODLab2026`): `rx@wodlab.ai`, `scaled@wodlab.ai`, `beginner@wodlab.ai`

## testWodEngine.test.ts

Jest integration test: simulates 30 days of WOD generation, asserts zero equipment violations
and correct duration ranges per category. Requires `MONGODB_URI` in `.env`.

```bash
npm test
# or single file:
npx jest --testPathPattern=testWodEngine
```

## test_distribution.ts

Standalone script (no DB) — samples protocol distribution 1000× for `metcon` category.

```bash
npx tsx src/scripts/test_distribution.ts
```

## list_workouts.ts

Prints the last 31 workouts for a hardcoded user ID. Toggle `MOCK_USER_ID` to switch athletes
(`...a511` = RX, `...a522` = Scaled, `...a533` = Beginner).

```bash
npx tsx src/scripts/list_workouts.ts
```