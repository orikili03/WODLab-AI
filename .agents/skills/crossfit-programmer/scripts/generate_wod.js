#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const LEVEL_RANK = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const DEFAULT_PROFILE = {
  goal: "mixed",
  fitness_level: "intermediate",
  session_minutes: 45,
  equipment_available: ["none"],
  limitations: {
    avoid_patterns: [],
    avoid_movements: [],
  },
  preferred_modalities: ["monostructural", "gymnastics", "weightlifting", "odd-object"],
  wod_type: null,
  intensity: "moderate",
};

const WOD_TYPES = ["amrap", "for_time", "emom", "chipper", "interval"];

class SeededRng {
  constructor(seed) {
    this.state = Number(seed) >>> 0;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  choice(values) {
    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }
    const index = Math.floor(this.next() * values.length);
    return values[index];
  }

  shuffle(values) {
    for (let idx = values.length - 1; idx > 0; idx -= 1) {
      const pick = Math.floor(this.next() * (idx + 1));
      [values[idx], values[pick]] = [values[pick], values[idx]];
    }
  }
}

function fail(message) {
  throw new Error(message);
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      fail(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      fail(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

function asLowerSet(values) {
  const out = new Set();
  if (!Array.isArray(values)) {
    return out;
  }
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized) {
      out.add(normalized);
    }
  }
  return out;
}

function sortedListFromSet(values) {
  return Array.from(values).sort();
}

function parseIsoDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    ordinalDay: Math.floor(date.getTime() / 86400000),
  };
}

function todayOrdinalDay() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return Math.floor(date.getTime() / 86400000);
}

function todaySeed() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
}

function mergeProfile(rawProfile) {
  const profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  for (const [key, value] of Object.entries(rawProfile)) {
    profile[key] = value;
  }

  const level = String(profile.fitness_level || "intermediate")
    .trim()
    .toLowerCase();
  profile.fitness_level = Object.prototype.hasOwnProperty.call(LEVEL_RANK, level)
    ? level
    : "intermediate";

  const goal = String(profile.goal || "mixed")
    .trim()
    .toLowerCase();
  profile.goal = new Set(["engine", "strength", "skill", "mixed", "power"]).has(goal)
    ? goal
    : "mixed";

  const intensity = String(profile.intensity || "moderate")
    .trim()
    .toLowerCase();
  profile.intensity = new Set(["low", "moderate", "high"]).has(intensity)
    ? intensity
    : "moderate";

  const parsedMinutes = Number.parseInt(profile.session_minutes, 10);
  const sessionMinutes = Number.isFinite(parsedMinutes) ? parsedMinutes : 45;
  profile.session_minutes = Math.max(20, Math.min(120, sessionMinutes));

  const equipment = asLowerSet(profile.equipment_available || ["none"]);
  equipment.add("none");
  profile.equipment_available = sortedListFromSet(equipment);

  const limitations =
    profile.limitations && typeof profile.limitations === "object" && !Array.isArray(profile.limitations)
      ? profile.limitations
      : {};
  profile.limitations = {
    avoid_patterns: sortedListFromSet(asLowerSet(limitations.avoid_patterns || [])),
    avoid_movements: sortedListFromSet(asLowerSet(limitations.avoid_movements || [])),
  };

  const preferred = asLowerSet(profile.preferred_modalities || []);
  const validModalities = new Set([
    "monostructural",
    "gymnastics",
    "weightlifting",
    "odd-object",
    "recovery",
  ]);
  const preferredModalities = sortedListFromSet(
    new Set(Array.from(preferred).filter((modality) => validModalities.has(modality))),
  );
  profile.preferred_modalities =
    preferredModalities.length > 0
      ? preferredModalities
      : ["monostructural", "gymnastics", "weightlifting", "odd-object"];

  if (typeof profile.wod_type === "string") {
    const wodType = profile.wod_type.trim().toLowerCase();
    profile.wod_type = WOD_TYPES.includes(wodType) ? wodType : null;
  } else {
    profile.wod_type = null;
  }

  return profile;
}

function movementMap(movements) {
  const out = new Map();
  for (const movement of movements) {
    if (!movement || typeof movement !== "object") {
      continue;
    }
    const name = String(movement.name || "").trim();
    if (name) {
      out.set(name.toLowerCase(), movement);
    }
  }
  return out;
}

function incrementCounter(counter, key) {
  counter.set(key, (counter.get(key) || 0) + 1);
}

function sessionInLookback(session, cutoffOrdinalDay) {
  const dateObj = parseIsoDate(String(session.date || ""));
  return !dateObj || dateObj.ordinalDay >= cutoffOrdinalDay;
}

function recentContext(history, byName, lookbackDays) {
  const cutoffOrdinalDay = todayOrdinalDay() - lookbackDays;
  const recentMovements = new Set();
  const patternCounter = new Map();

  for (const session of history) {
    if (!session || typeof session !== "object" || !sessionInLookback(session, cutoffOrdinalDay)) {
      continue;
    }

    const sessionMovements = Array.isArray(session.movements) ? session.movements : [];
    for (const movementName of sessionMovements) {
      if (typeof movementName !== "string") {
        continue;
      }
      const normalizedName = movementName.trim().toLowerCase();
      if (!normalizedName) {
        continue;
      }

      recentMovements.add(normalizedName);
      const found = byName.get(normalizedName);
      if (found && Array.isArray(found.patterns)) {
        for (const pattern of found.patterns) {
          if (typeof pattern !== "string" || !pattern.trim()) {
            continue;
          }
          incrementCounter(patternCounter, pattern.trim().toLowerCase());
        }
      }
    }

    const sessionPatterns = Array.isArray(session.patterns) ? session.patterns : [];
    for (const pattern of sessionPatterns) {
      if (typeof pattern !== "string" || !pattern.trim()) {
        continue;
      }
      incrementCounter(patternCounter, pattern.trim().toLowerCase());
    }
  }

  return { recentMovements, patternCounter };
}

function canDoMovement(movement, profile, recentMovements) {
  const levelRank = LEVEL_RANK[profile.fitness_level];
  const movementLevel = LEVEL_RANK[String(movement.difficulty || "intermediate").toLowerCase()] ?? 1;

  const allowSkillReach = profile.goal === "skill";
  if (movementLevel > levelRank + (allowSkillReach ? 1 : 0)) {
    return false;
  }

  const equipmentNeeded = asLowerSet(movement.equipment || []);
  const optionalEquipment = new Set(["none", "bodyweight"]);
  const requiredEquipment = new Set(Array.from(equipmentNeeded).filter((item) => !optionalEquipment.has(item)));
  const availableEquipment = asLowerSet(profile.equipment_available || []);
  for (const item of requiredEquipment) {
    if (!availableEquipment.has(item)) {
      return false;
    }
  }

  const movementName = String(movement.name || "").trim().toLowerCase();
  if (profile.limitations.avoid_movements.includes(movementName)) {
    return false;
  }

  const movementPatterns = asLowerSet(movement.patterns || []);
  const avoidPatterns = new Set(profile.limitations.avoid_patterns || []);
  for (const pattern of movementPatterns) {
    if (avoidPatterns.has(pattern)) {
      return false;
    }
  }

  if (profile.goal === "skill" && recentMovements.has(movementName)) {
    return false;
  }

  return true;
}

function scoreMovement(movement, profile, recentMovements, patternCounter) {
  let score = 0.0;

  const name = String(movement.name || "").trim().toLowerCase();
  const modality = String(movement.modality || "").trim().toLowerCase();
  const effects = asLowerSet(movement.effects || []);
  const patterns = asLowerSet(movement.patterns || []);

  if (effects.has(profile.goal)) {
    score += 3.0;
  }

  if (profile.goal === "mixed" && effects.size >= 2) {
    score += 1.0;
  }

  if (new Set(profile.preferred_modalities).has(modality)) {
    score += 2.0;
  }

  if (recentMovements.has(name)) {
    score -= 4.0;
  }

  for (const pattern of patterns) {
    score -= 1.3 * (patternCounter.get(pattern) || 0);
  }

  const levelRank = LEVEL_RANK[profile.fitness_level];
  const movementLevel = LEVEL_RANK[String(movement.difficulty || "intermediate").toLowerCase()] ?? 1;
  if (movementLevel === levelRank) {
    score += 1.0;
  } else if (movementLevel < levelRank) {
    score += 0.4;
  }

  if (profile.intensity === "low") {
    if (effects.has("power") || modality === "weightlifting") {
      score -= 1.0;
    }
  } else if (profile.intensity === "high") {
    if (effects.has("power") || effects.has("engine")) {
      score += 1.0;
    }
  }

  if (modality === "recovery") {
    score -= 2.5;
  }

  return score;
}

function rankCandidates(movements, profile, recentMovements, patternCounter) {
  const ranked = [];
  for (const movement of movements) {
    if (canDoMovement(movement, profile, recentMovements)) {
      ranked.push([movement, scoreMovement(movement, profile, recentMovements, patternCounter)]);
    }
  }

  ranked.sort((left, right) => right[1] - left[1]);
  return ranked;
}

function pickBest(ranked, rng, usedNames, modalities = null, includeRecovery = false) {
  const filtered = [];
  for (const [movement, score] of ranked) {
    const name = String(movement.name || "").trim().toLowerCase();
    const modality = String(movement.modality || "").trim().toLowerCase();

    if (!includeRecovery && modality === "recovery") {
      continue;
    }
    if (usedNames.has(name)) {
      continue;
    }
    if (modalities && !modalities.has(modality)) {
      continue;
    }

    filtered.push([movement, score]);
  }

  if (filtered.length === 0) {
    return null;
  }

  const top = filtered.slice(0, Math.min(8, filtered.length));
  const chosen = rng.choice(top)[0];
  usedNames.add(String(chosen.name || "").trim().toLowerCase());
  return chosen;
}

function repTarget(movement, level) {
  const name = String(movement.name || "");
  const modality = String(movement.modality || "").toLowerCase();
  const difficulty = String(movement.difficulty || "intermediate").toLowerCase();

  if (modality === "monostructural") {
    if (name.toLowerCase().includes("run")) {
      return "200 m";
    }
    if (
      name.toLowerCase().includes("row") ||
      name.toLowerCase().includes("bike") ||
      name.toLowerCase().includes("ski")
    ) {
      return "12/10 cal";
    }
    if (name.toLowerCase().includes("double under")) {
      return "30 reps";
    }
    if (name.toLowerCase().includes("jump rope")) {
      return "60 reps";
    }
    return "12/10 cal";
  }

  if (modality === "weightlifting" || modality === "odd-object") {
    if (name.toLowerCase().includes("carry")) {
      return "40 m";
    }
    if (difficulty === "advanced") {
      return "6 reps";
    }
    if (level === "beginner") {
      return "8 reps";
    }
    return "10 reps";
  }

  if (modality === "gymnastics") {
    if (difficulty === "advanced") {
      return "6 reps";
    }
    if (difficulty === "intermediate") {
      return "10 reps";
    }
    return "14 reps";
  }

  return "45 sec";
}

function sessionBlockLengths(sessionMinutes) {
  if (sessionMinutes <= 30) {
    return { warmup: 6, strength: 6, metcon: 12, cooldown: 4 };
  }
  if (sessionMinutes <= 45) {
    return { warmup: 8, strength: 10, metcon: 18, cooldown: 6 };
  }
  if (sessionMinutes <= 60) {
    return { warmup: 10, strength: 12, metcon: 24, cooldown: 8 };
  }
  return { warmup: 12, strength: 15, metcon: 30, cooldown: 10 };
}

function chooseWodType(profile, rng) {
  if (profile.wod_type) {
    return String(profile.wod_type);
  }

  if (profile.goal === "engine") {
    return rng.choice(["interval", "amrap", "for_time"]);
  }
  if (profile.goal === "strength" || profile.goal === "power") {
    return rng.choice(["emom", "for_time", "amrap"]);
  }
  if (profile.goal === "skill") {
    return rng.choice(["emom", "amrap", "interval"]);
  }
  return rng.choice(WOD_TYPES);
}

function buildWarmup(ranked, used, rng, minutes) {
  function pickWarmup(candidates) {
    const warmupFiltered = [];
    for (const [movement, score] of ranked) {
      const name = String(movement.name || "").trim().toLowerCase();
      const modality = String(movement.modality || "").trim().toLowerCase();
      const difficulty = String(movement.difficulty || "intermediate")
        .trim()
        .toLowerCase();
      const effects = asLowerSet(movement.effects || []);

      if (used.has(name)) {
        continue;
      }
      if (!candidates.has(modality)) {
        continue;
      }
      if ((modality === "weightlifting" || modality === "odd-object") && difficulty !== "beginner") {
        continue;
      }
      if (effects.has("power") || effects.has("mental")) {
        continue;
      }
      if (name.includes("burpee")) {
        continue;
      }

      warmupFiltered.push([movement, score]);
    }

    if (warmupFiltered.length === 0) {
      return pickBest(ranked, rng, used, candidates);
    }

    const top = warmupFiltered.slice(0, Math.min(8, warmupFiltered.length));
    const chosen = rng.choice(top)[0];
    used.add(String(chosen.name || "").trim().toLowerCase());
    return chosen;
  }

  const cyc = pickWarmup(new Set(["monostructural"]));
  const base1 = pickWarmup(new Set(["gymnastics", "recovery"]));
  const base2 = pickWarmup(new Set(["gymnastics", "recovery", "odd-object"]));

  const cycName = cyc ? cyc.name : "easy cardio";
  const base1Name = base1 ? base1.name : "air squat";
  const base2Name = base2 ? base2.name : "plank";

  const items = [
    `${Math.max(3, Math.floor(minutes / 2))} min easy ${cycName}`,
    `2 rounds: 10 ${base1Name}, 8 ${base2Name}, 20 sec nasal breathing`,
  ];

  return {
    duration_min: minutes,
    movements: [cycName, base1Name, base2Name].filter((value) => typeof value === "string"),
    items,
  };
}

function buildStrengthOrSkillBlock(ranked, used, rng, profile, minutes) {
  const goal = profile.goal;
  const level = profile.fitness_level;

  if (goal === "engine" && profile.session_minutes <= 35) {
    return null;
  }

  let focus = "strength";
  let modalities = new Set(["weightlifting", "odd-object"]);
  if (goal === "skill") {
    focus = "skill";
    modalities = new Set(["gymnastics", "weightlifting"]);
  }

  const movement = pickBest(ranked, rng, used, modalities);
  if (!movement) {
    return null;
  }

  const movementName = movement.name;
  let prescription = "";
  if (focus === "skill") {
    prescription = `E2MOM x ${Math.max(8, minutes)}: 2-4 quality reps ${movementName} + technical drill between sets`;
  } else if (level === "beginner") {
    prescription = `${movementName}: 5 x 5 @ moderate load (RPE 7), rest 90 sec`;
  } else if (level === "intermediate") {
    prescription = `${movementName}: 5 x 3 @ challenging load (RPE 8), rest 2 min`;
  } else {
    prescription = `${movementName}: 6 x 2 heavy quality reps (RPE 8-9), rest 2-3 min`;
  }

  return {
    focus,
    duration_min: minutes,
    movement: movementName,
    prescription,
  };
}

function buildMetcon(ranked, used, rng, profile, minutes) {
  const wodType = chooseWodType(profile, rng);

  const metconMovements = [];
  for (const modalityGroup of [
    new Set(["monostructural"]),
    new Set(["gymnastics"]),
    new Set(["weightlifting", "odd-object"]),
  ]) {
    const choice = pickBest(ranked, rng, used, modalityGroup);
    if (choice) {
      metconMovements.push(choice);
    }
  }

  const targetCount = profile.session_minutes > 45 ? 4 : 3;
  while (metconMovements.length < targetCount) {
    const extra = pickBest(
      ranked,
      rng,
      used,
      new Set(["monostructural", "gymnastics", "weightlifting", "odd-object"]),
    );
    if (!extra) {
      break;
    }
    metconMovements.push(extra);
  }

  if (metconMovements.length === 0) {
    fail("No eligible movements remain for metcon after constraints.");
  }

  const level = profile.fitness_level;
  const lines = metconMovements.map((movement) => `${repTarget(movement, level)} ${movement.name}`);

  let description = "";
  if (wodType === "amrap") {
    description = `${minutes}-min AMRAP: ${lines.join(" | ")}`;
  } else if (wodType === "for_time") {
    const rounds = metconMovements.length <= 3 ? 4 : 3;
    description = `${rounds} rounds for time: ${lines.join(" | ")}`;
  } else if (wodType === "emom") {
    const stationCount = metconMovements.length;
    let emomMinutes = Math.max(stationCount * 4, minutes);
    emomMinutes -= emomMinutes % stationCount;
    const stations = lines.map((line, idx) => `Min ${idx + 1}: ${line}`);
    description = `EMOM ${emomMinutes} (cycle ${stationCount} stations): ${stations.join(" | ")}`;
  } else if (wodType === "chipper") {
    description = `For time chipper: ${lines.join(" -> ")}`;
  } else {
    description = `${Math.max(4, Math.floor(minutes / 3))} rounds: 2:00 work / 1:00 rest on ${lines.join(" | ")}`;
  }

  return {
    type: wodType,
    duration_min: minutes,
    movements: metconMovements.map((movement) => movement.name),
    description,
  };
}

function buildCooldown(movements, rng, minutes) {
  const recoveryPool = movements.filter(
    (movement) => String(movement.modality || "").toLowerCase() === "recovery",
  );
  rng.shuffle(recoveryPool);
  const selected = recoveryPool.slice(0, 2);

  let items = [];
  let movementNames = [];
  if (selected.length < 2) {
    items = [
      "2 min easy breathing walk",
      "2 x 45 sec per side hip opener",
      "2 x 45 sec thoracic opener",
    ];
    movementNames = ["Breathing walk", "Hip opener", "Thoracic opener"];
  } else {
    items = [
      `2 x 45 sec per side ${selected[0].name}`,
      `2 x 45 sec per side ${selected[1].name}`,
      "2 min down-regulation breathing",
    ];
    movementNames = [selected[0].name, selected[1].name, "Down-regulation breathing"];
  }

  return {
    duration_min: minutes,
    movements: movementNames,
    items,
  };
}

function buildScalingNotes(chosenMovements, byName) {
  const notes = [];
  for (const movementName of chosenMovements) {
    const movement = byName.get(String(movementName || "").toLowerCase());
    if (!movement) {
      continue;
    }

    const variations = (Array.isArray(movement.variations) ? movement.variations : []).filter(
      (variation) => typeof variation === "string" && variation.trim(),
    );
    const easier = variations.length > 0 ? variations[0] : "Reduce reps and use controlled tempo";
    const harder =
      variations.length > 0 ? variations[variations.length - 1] : "Increase load or reduce rest";

    notes.push({
      movement: movementName,
      easier,
      harder,
    });
  }
  return notes;
}

function fatigueSummary(patternCounter) {
  if (patternCounter.size === 0) {
    return [];
  }

  return Array.from(patternCounter.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count})`);
}

function formatConstraintList(values) {
  return `[${values.map((value) => `'${String(value)}'`).join(", ")}]`;
}

function renderText(plan) {
  const lines = [];
  const profile = plan.profile;

  lines.push("WOD Plan");
  lines.push(`Seed: ${plan.seed}`);
  lines.push(
    `Profile: goal=${profile.goal}, level=${profile.fitness_level}, duration=${profile.session_minutes} min, intensity=${profile.intensity}`,
  );
  if (profile.limitations.avoid_patterns.length || profile.limitations.avoid_movements.length) {
    lines.push(
      `Constraints: avoid_patterns=${formatConstraintList(
        profile.limitations.avoid_patterns,
      )} avoid_movements=${formatConstraintList(profile.limitations.avoid_movements)}`,
    );
  }

  if (plan.context.recent_fatigue_patterns.length) {
    lines.push(`Recent pattern load: ${plan.context.recent_fatigue_patterns.join(", ")}`);
  }

  lines.push("");
  lines.push(`Warm-up (${plan.warmup.duration_min} min)`);
  for (const item of plan.warmup.items) {
    lines.push(`- ${item}`);
  }

  const strength = plan.strength_or_skill;
  if (strength) {
    const label = strength.focus === "skill" ? "Skill / Strength" : "Strength";
    lines.push("");
    lines.push(`${label} (${strength.duration_min} min)`);
    lines.push(`- ${strength.prescription}`);
  }

  lines.push("");
  lines.push(`Metcon (${plan.metcon.duration_min} min, ${plan.metcon.type})`);
  lines.push(`- ${plan.metcon.description}`);

  lines.push("");
  lines.push(`Cooldown (${plan.cooldown.duration_min} min)`);
  for (const item of plan.cooldown.items) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("Scaling options");
  for (const note of plan.scaling) {
    lines.push(`- ${note.movement}: easier=${note.easier} | harder=${note.harder}`);
  }

  return lines.join("\n");
}

function buildPlan(profile, history, movements, lookbackDays, seed) {
  const rng = new SeededRng(seed);

  const byName = movementMap(movements);
  const { recentMovements, patternCounter } = recentContext(history, byName, lookbackDays);
  const ranked = rankCandidates(movements, profile, recentMovements, patternCounter);

  if (ranked.length === 0) {
    fail("No movements match the current equipment/level/limitations. Relax constraints and retry.");
  }

  const blocks = sessionBlockLengths(profile.session_minutes);
  const used = new Set();

  const warmup = buildWarmup(ranked, used, rng, blocks.warmup);
  const strengthOrSkill = buildStrengthOrSkillBlock(ranked, used, rng, profile, blocks.strength);
  const metcon = buildMetcon(ranked, used, rng, profile, blocks.metcon);
  const cooldown = buildCooldown(movements, rng, blocks.cooldown);

  const selectedForScaling = [...(warmup.movements || []), ...metcon.movements];
  if (strengthOrSkill) {
    selectedForScaling.push(strengthOrSkill.movement);
  }

  return {
    seed,
    profile,
    context: {
      lookback_days: lookbackDays,
      recent_movements: Array.from(recentMovements).sort(),
      recent_fatigue_patterns: fatigueSummary(patternCounter),
    },
    warmup,
    strength_or_skill: strengthOrSkill,
    metcon,
    cooldown,
    scaling: buildScalingNotes(selectedForScaling, byName),
  };
}

function printUsage() {
  const scriptName = path.basename(process.argv[1] || "scripts/generate_wod.js");
  const lines = [
    "Generate a personalized CrossFit WOD from profile and history",
    "",
    `Usage: node ${scriptName} --profile-file <path> [options]`,
    "",
    "Options:",
    "  --profile-file <path>    Path to athlete profile JSON (required)",
    "  --history-file <path>    Path to recent workout history JSON (optional)",
    `  --movements-file <path>  Path to movement library JSON (default: ${path
      .join("references", "movements.json")
      .replace(/\\/g, "/")})`,
    "  --history-days <int>     How many days of history to weigh for fatigue (default: 2)",
    "  --seed <int>             Random seed; default is current date (YYYYMMDD)",
    "  --output <text|json>     Output format (default: text)",
    "  --help                   Show this help message",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function parseArgs(argv) {
  const defaults = {
    profileFile: null,
    historyFile: null,
    movementsFile: path.resolve(__dirname, "..", "references", "movements.json"),
    historyDays: 2,
    seed: null,
    output: "text",
  };

  const args = { ...defaults };
  for (let idx = 0; idx < argv.length; idx += 1) {
    const token = argv[idx];
    if (token === "--help") {
      printUsage();
      process.exit(0);
    }

    const next = argv[idx + 1];
    const requireValue = () => {
      if (!next || next.startsWith("--")) {
        fail(`Missing value for ${token}`);
      }
      idx += 1;
      return next;
    };

    if (token === "--profile-file") {
      args.profileFile = requireValue();
      continue;
    }
    if (token === "--history-file") {
      args.historyFile = requireValue();
      continue;
    }
    if (token === "--movements-file") {
      args.movementsFile = requireValue();
      continue;
    }
    if (token === "--history-days") {
      const raw = requireValue();
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        fail(`Invalid integer for --history-days: ${raw}`);
      }
      args.historyDays = parsed;
      continue;
    }
    if (token === "--seed") {
      const raw = requireValue();
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        fail(`Invalid integer for --seed: ${raw}`);
      }
      args.seed = parsed;
      continue;
    }
    if (token === "--output") {
      const raw = requireValue();
      if (!["text", "json"].includes(raw)) {
        fail(`Invalid value for --output: ${raw}`);
      }
      args.output = raw;
      continue;
    }

    fail(`Unknown argument: ${token}`);
  }

  if (!args.profileFile) {
    fail("Missing required argument: --profile-file");
  }

  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    const rawProfile = loadJson(args.profileFile);
    if (!rawProfile || typeof rawProfile !== "object" || Array.isArray(rawProfile)) {
      fail("Profile JSON must be an object.");
    }
    const profile = mergeProfile(rawProfile);

    let history = [];
    if (args.historyFile) {
      const rawHistory = loadJson(args.historyFile);
      if (!Array.isArray(rawHistory)) {
        fail("History JSON must be an array.");
      }
      history = rawHistory.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
    }

    const movementBlob = loadJson(args.movementsFile);
    const movements =
      movementBlob && typeof movementBlob === "object" && !Array.isArray(movementBlob)
        ? movementBlob.movements
        : null;
    if (!Array.isArray(movements) || movements.length === 0) {
      fail("Movement library must be a JSON object with a non-empty 'movements' list.");
    }

    const seed = args.seed !== null ? args.seed : todaySeed();
    const plan = buildPlan(profile, history, movements, Math.max(1, args.historyDays), seed);

    if (args.output === "json") {
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderText(plan)}\n`);
    }
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

main();
