/**
 * Smart Domain Name Generator
 *
 * Produces pronounceable, English-like domain labels using virtual letters
 * (multi-character phonetic units) with weighted selection, feasibility gating,
 * and backtracking. Results are scored and ranked by VC brandability metrics.
 */

import {
  StylePreset,
  getWeightedUnitsForSlot,
  selectPattern,
  checkHardConstraints,
} from "./heuristics-config";
import { scoreName, ScoreBreakdown } from "./scorer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SmartGeneratorConfig {
  targetLen: number; // 3–12
  count: number; // how many candidates to return
  tlds: string[]; // e.g. ["com"]
  style: StylePreset; // "balanced" | "punchy" | "flowing" | "technical"
  seed?: number; // optional for reproducibility
  scored?: boolean; // default true — include scoring
}

export interface SmartCandidate {
  name: string;
  domain: string; // name.tld
  tld: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  pattern: string;
  units: string[];
}

export interface SmartGeneratorResult {
  candidates: SmartCandidate[];
  config: SmartGeneratorConfig;
  generatedAt: string;
  totalGenerated: number; // how many were produced before ranking
  totalReturned: number;
}

// ─── Seeded RNG ──────────────────────────────────────────────────────────────

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Mulberry32 initialization
    this.state = seed | 0;
  }

  random(): number {
    // Mulberry32 — better distribution than simple LCG
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// ─── Weighted Random Selection ───────────────────────────────────────────────

function weightedPick<T extends { weight: number }>(
  items: T[],
  rng: () => number
): T | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return null;

  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

// ─── Name Generation with Backtracking ───────────────────────────────────────

const MAX_BACKTRACK_ATTEMPTS = 50;

function generateOneName(
  targetLen: number,
  pattern: string,
  style: StylePreset,
  rng: () => number
): { name: string; units: string[] } | null {
  const totalSlots = pattern.length;

  // Recursive backtracking
  function build(
    slotIndex: number,
    currentChars: number,
    builtString: string,
    usedUnits: string[],
    depth: number
  ): { name: string; units: string[] } | null {
    if (depth > MAX_BACKTRACK_ATTEMPTS) return null;

    // All slots filled — check exact length
    if (slotIndex === totalSlots) {
      if (currentChars === targetLen) {
        return { name: builtString, units: [...usedUnits] };
      }
      return null; // wrong length
    }

    const slotType = pattern[slotIndex] as "C" | "V";

    const candidates = getWeightedUnitsForSlot({
      slotType,
      slotIndex,
      totalSlots,
      currentChars,
      targetLen,
      prevUnits: usedUnits,
      builtString,
      style,
    });

    if (candidates.length === 0) return null;

    // Shuffle candidates by weight — try multiple picks
    // Build a weighted order: pick repeatedly without replacement
    const remaining = [...candidates];
    const maxTries = Math.min(remaining.length, 8);

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const picked = weightedPick(remaining, rng);
      if (!picked) break;

      // Remove picked from remaining for next attempt
      const idx = remaining.indexOf(picked);
      if (idx >= 0) remaining.splice(idx, 1);

      const result = build(
        slotIndex + 1,
        currentChars + picked.charLen,
        builtString + picked.unit,
        [...usedUnits, picked.unit],
        depth + 1
      );

      if (result) return result;
    }

    return null; // all attempts at this slot exhausted
  }

  return build(0, 0, "", [], 0);
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export async function generateSmartDomains(
  config: SmartGeneratorConfig
): Promise<SmartGeneratorResult> {
  const {
    targetLen,
    count,
    tlds,
    style = "balanced",
    seed,
    scored = true,
  } = config;

  // Validate
  if (targetLen < 3 || targetLen > 12) {
    throw new Error(`targetLen must be 3–12, got ${targetLen}`);
  }
  if (count < 1 || count > 1000) {
    throw new Error(`count must be 1–1000, got ${count}`);
  }

  const rng = seed !== undefined
    ? new SeededRandom(seed)
    : new SeededRandom(Date.now() ^ (Math.random() * 0xffffffff));
  const rngFn = () => rng.random();

  // Overgenerate 3x to allow ranking
  const overgenTarget = Math.min(count * 3, 3000);
  const seen = new Set<string>();
  const rawCandidates: { name: string; units: string[]; pattern: string }[] = [];

  let attempts = 0;
  const maxAttempts = overgenTarget * 10;

  while (rawCandidates.length < overgenTarget && attempts < maxAttempts) {
    attempts++;

    // Pick a pattern
    const chosenPattern = selectPattern(targetLen, rngFn);
    if (!chosenPattern) continue;

    // Generate one name
    const result = generateOneName(targetLen, chosenPattern, style, rngFn);
    if (!result) continue;

    // Validate exact length
    if (result.name.length !== targetLen) continue;

    // Dedup
    if (seen.has(result.name)) continue;

    // Hard constraint check
    const { valid } = checkHardConstraints(result.name);
    if (!valid) continue;

    seen.add(result.name);
    rawCandidates.push({
      name: result.name,
      units: result.units,
      pattern: chosenPattern,
    });
  }

  // Score and rank
  const allCandidates: SmartCandidate[] = [];

  for (const raw of rawCandidates) {
    for (const tld of tlds) {
      const breakdown = scored
        ? scoreName(raw.name, raw.units, raw.pattern)
        : defaultBreakdown();

      allCandidates.push({
        name: raw.name,
        domain: `${raw.name}.${tld}`,
        tld,
        score: breakdown.overall,
        scoreBreakdown: breakdown,
        pattern: raw.pattern,
        units: raw.units,
      });
    }
  }

  // Sort by score descending
  allCandidates.sort((a, b) => b.score - a.score);

  // Return top N
  const topCandidates = allCandidates.slice(0, count);

  return {
    candidates: topCandidates,
    config,
    generatedAt: new Date().toISOString(),
    totalGenerated: rawCandidates.length,
    totalReturned: topCandidates.length,
  };
}

function defaultBreakdown(): ScoreBreakdown {
  return {
    overall: 50,
    brevity: 50,
    pronounceability: 50,
    visualBalance: 50,
    memorability: 50,
    distinctiveness: 50,
    trademarkSafety: 50,
    domainPremium: 50,
  };
}
