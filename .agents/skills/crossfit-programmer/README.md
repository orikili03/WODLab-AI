# CrossFit Programmer

`crossfit-programmer` is a Codex skill and Node.js CLI that generates personalized CrossFit WODs from an athlete profile, available equipment, and recent training history.

## What This Repository Includes

- `SKILL.md`: Skill definition and operating instructions (required by Codex skills)
- `agents/openai.yaml`: Skill UI metadata
- `scripts/generate_wod.js`: Deterministic WOD generator script
- `references/movements.json`: Movement library with modalities, patterns, effects, and scaling variations
- `references/sample-profile.json`: Example athlete profile input
- `references/sample-history.json`: Example recent training history input

## Quick Start

Requirements:

- Node.js 18+

Generate a workout using the sample inputs:

```bash
node scripts/generate_wod.js \
  --profile-file references/sample-profile.json \
  --history-file references/sample-history.json
```

Generate machine-readable JSON output:

```bash
node scripts/generate_wod.js \
  --profile-file references/sample-profile.json \
  --history-file references/sample-history.json \
  --output json
```

Run with npm scripts:

```bash
npm run generate:wod:sample
npm run generate:wod:sample:json
```

## How It Programs

The generator builds:

1. Warm-up
2. Strength/skill block (context dependent)
3. Metcon
4. Cooldown
5. Scaling options per selected movement

Programming logic factors in:

- Goal (`engine`, `strength`, `skill`, `mixed`, `power`)
- Fitness level (`beginner`, `intermediate`, `advanced`)
- Session length and intensity
- Equipment constraints
- Movement/pattern limitations
- Recent movement and pattern fatigue

## Publishing Notes (GitHub + skills.sh)

This repository is structured for skill publishing:

- Skill definition is in root `SKILL.md`
- Usage documentation is in `README.md`
- Skill metadata is in `agents/openai.yaml`
- Reusable resources are organized in `scripts/` and `references/`

Suggested publish steps:

1. Push this repository to a public GitHub repository.
2. Verify `SKILL.md` frontmatter has accurate `name` and `description`.
3. Confirm `README.md` explains purpose and usage.
4. Submit the GitHub repo URL to skills.sh.

## Example Prompt

Use `$crossfit-programmer` to create a 45-minute WOD using my equipment and my last 3 training days.
