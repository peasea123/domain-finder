/**
 * Heuristics Configuration Loader & Utilities
 *
 * Provides typed access to heuristics.json config and utility functions
 * for weighted unit selection, constraint checking, and position-based
 * weight adjustment.
 */

import heuristicsData from "@/config/heuristics.json";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UnitEntry {
  unit: string;
  charLen: number;
  baseWeight: number;
  category: "single" | "digraph" | "blend" | "rControlled" | "special";
}

export interface PatternEntry {
  pattern: string;
  weight: number;
}

export type SlotType = "C" | "V";

export type StylePreset = "balanced" | "punchy" | "flowing" | "technical";

export interface StylePresetConfig {
  description: string;
  rareLetterMultiplier: number;
  digraphPreference: number;
  blendPreference: number;
  preferredConsonants?: string[];
  preferredVowels?: string[];
}

export interface ScoringDimension {
  weight: number;
  [key: string]: unknown;
}

export interface HeuristicsConfig {
  consonantUnits: UnitEntry[];
  vowelUnits: UnitEntry[];
  patternsByLength: Record<number, PatternEntry[]>;
  hardConstraints: {
    disallowedSubstrings: string[];
    ckMustFollowVowel: boolean;
    quMustPrecedeVowel: boolean;
  };
  softConstraints: {
    ngNotFinalPenalty: number;
    blendNotInitialPenalty: number;
    repeatedUnitPenalty: number;
    tripleLetterPenalty: number;
  };
  scoring: typeof heuristicsData.scoring;
  stylePresets: Record<StylePreset, StylePresetConfig>;
  awkwardBigrams: Set<string>;
}

// ─── Parse raw JSON into structured config ──────────────────────────────────

function parseUnits(
  group: Record<string, number>,
  category: UnitEntry["category"]
): UnitEntry[] {
  return Object.entries(group).map(([unit, baseWeight]) => ({
    unit,
    charLen: unit.length,
    baseWeight,
    category,
  }));
}

function buildConfig(): HeuristicsConfig {
  const raw = heuristicsData;

  const consonantUnits: UnitEntry[] = [
    ...parseUnits(raw.consonantUnits.singles, "single"),
    ...parseUnits(raw.consonantUnits.tier1Digraphs, "digraph"),
    ...parseUnits(raw.consonantUnits.tier2Blends, "blend"),
    ...parseUnits(raw.consonantUnits.special, "special"),
  ];

  const vowelUnits: UnitEntry[] = [
    ...parseUnits(raw.vowelUnits.singles, "single"),
    ...parseUnits(raw.vowelUnits.coreDigraphs, "digraph"),
    ...parseUnits(raw.vowelUnits.secondaryDigraphs, "digraph"),
    ...parseUnits(raw.vowelUnits.rControlled, "rControlled"),
  ];

  const patternsByLength: Record<number, PatternEntry[]> = {};
  for (const [lenStr, patterns] of Object.entries(raw.patternsByLength)) {
    patternsByLength[parseInt(lenStr, 10)] = patterns;
  }

  return {
    consonantUnits,
    vowelUnits,
    patternsByLength,
    hardConstraints: raw.hardConstraints,
    softConstraints: raw.softConstraints,
    scoring: raw.scoring,
    stylePresets: raw.stylePresets as Record<StylePreset, StylePresetConfig>,
    awkwardBigrams: new Set(raw.scoring.awkwardBigrams),
  };
}

// Singleton — parsed once on import
let _config: HeuristicsConfig | null = null;

export function loadHeuristicsConfig(): HeuristicsConfig {
  if (!_config) {
    _config = buildConfig();
  }
  return _config;
}

// ─── Unit Selection Utilities ───────────────────────────────────────────────

/**
 * Returns filtered + weighted units for a given pattern slot.
 *
 * Applies:
 *  - Feasibility gating (can we still reach targetLen?)
 *  - Position-based multipliers (initial/final preferences)
 *  - Hard constraint filtering (ck, qu rules)
 *  - Style preset preferences
 *  - Soft constraint penalties (repeated units, ng position)
 */
export function getWeightedUnitsForSlot(options: {
  slotType: SlotType;
  slotIndex: number;
  totalSlots: number;
  currentChars: number;
  targetLen: number;
  prevUnits: string[];
  builtString: string;
  style: StylePreset;
  pattern: string;
}): { unit: string; weight: number; charLen: number }[] {
  const config = loadHeuristicsConfig();
  const {
    slotType,
    slotIndex,
    totalSlots,
    currentChars,
    targetLen,
    prevUnits,
    builtString,
    style,
    pattern,
  } = options;

  const isInitial = slotIndex === 0;
  const isFinal = slotIndex === totalSlots - 1;
  const remainingSlots = totalSlots - slotIndex - 1; // slots AFTER this one
  const remainingCharsNeeded = targetLen - currentChars;

  // Detect adjacent-vowel context (VV in pattern)
  const prevSlotIsV = slotIndex > 0 && pattern[slotIndex - 1] === "V";
  const nextSlotIsV = slotIndex < totalSlots - 1 && pattern[slotIndex + 1] === "V";
  const inAdjacentVowelContext = slotType === "V" && (prevSlotIsV || nextSlotIsV);

  const pool = slotType === "C" ? config.consonantUnits : config.vowelUnits;
  const preset = config.stylePresets[style];

  const result: { unit: string; weight: number; charLen: number }[] = [];

  for (const entry of pool) {
    let weight = entry.baseWeight;

    // ── Feasibility gating ──
    const charsAfterThisUnit = remainingCharsNeeded - entry.charLen;
    if (charsAfterThisUnit < 0) continue; // too long
    if (remainingSlots > 0) {
      const minPossible = remainingSlots * 1;
      const maxPossible = remainingSlots * 2; // could be 3 for "str" but rare
      if (charsAfterThisUnit < minPossible || charsAfterThisUnit > maxPossible) {
        continue; // infeasible
      }
    } else {
      // This is the last slot — must use exactly the remaining chars
      if (entry.charLen !== remainingCharsNeeded) continue;
    }

    // ── Adjacent-vowel constraints ──
    // When two V slots are adjacent (VV in pattern), restrict to single
    // vowels only — the pair of singles naturally forms the digraph.
    // This prevents ugly combos like "aioo", "ooea", "eear".
    if (inAdjacentVowelContext && entry.category !== "single") {
      continue;
    }

    // Block same-vowel repetition at VV junction (prevents "uu", "aa", "oo")
    if (inAdjacentVowelContext && prevSlotIsV && prevUnits.length > 0) {
      const lastUnit = prevUnits[prevUnits.length - 1];
      // If previous unit was a single vowel, block the same vowel
      if (lastUnit.length === 1 && "aeiou".includes(lastUnit) && entry.unit === lastUnit) {
        continue;
      }
    }

    // ── Hard constraints ──
    // ck must follow a vowel
    if (entry.unit === "ck") {
      if (builtString.length === 0) continue;
      const lastChar = builtString[builtString.length - 1];
      if (!"aeiou".includes(lastChar)) continue;
    }

    // qu must be followed by a vowel slot — handled in generator (next slot must be V)
    // but reject qu in final position since nothing follows
    if (entry.unit === "qu" && isFinal) continue;

    // Check disallowed substrings with this unit appended
    const candidateStr = builtString + entry.unit;
    let disallowed = false;
    for (const sub of config.hardConstraints.disallowedSubstrings) {
      if (candidateStr.includes(sub)) {
        disallowed = true;
        break;
      }
    }
    if (disallowed) continue;

    // ── Style preset adjustments ──
    // Rare letter multiplier
    if (
      entry.category === "single" &&
      "jxqz".includes(entry.unit)
    ) {
      weight *= preset.rareLetterMultiplier;
    }

    // Digraph/blend preference
    if (entry.category === "digraph") {
      weight *= preset.digraphPreference;
    } else if (entry.category === "blend") {
      weight *= preset.blendPreference;
    }

    // Preferred consonants/vowels
    if (slotType === "C" && preset.preferredConsonants) {
      if (preset.preferredConsonants.includes(entry.unit)) {
        weight *= 1.5;
      } else {
        weight *= 0.7;
      }
    }
    if (slotType === "V" && preset.preferredVowels) {
      if (preset.preferredVowels.includes(entry.unit)) {
        weight *= 1.5;
      } else {
        weight *= 0.7;
      }
    }

    // ── Position-based multipliers ──
    // Blends/digraphs get bonus at initial position
    if (isInitial && (entry.category === "blend" || entry.category === "digraph")) {
      weight *= 1.3;
    }
    // Blends not at initial lose some weight
    if (!isInitial && entry.category === "blend") {
      weight *= config.softConstraints.blendNotInitialPenalty;
    }

    // ng prefers final position
    if (entry.unit === "ng") {
      if (!isFinal) {
        weight *= config.softConstraints.ngNotFinalPenalty;
      } else {
        weight *= 1.5; // bonus at final
      }
    }

    // ── Soft constraints ──
    // Avoid repeated units
    if (prevUnits.includes(entry.unit)) {
      weight *= config.softConstraints.repeatedUnitPenalty;
    }

    // Avoid triple letters at boundary
    if (builtString.length >= 2) {
      const last2 = builtString.slice(-2);
      if (last2[0] === last2[1] && last2[0] === entry.unit[0]) {
        weight = 0;
      }
    }

    // Check awkward bigrams at junction
    if (builtString.length > 0) {
      const junction = builtString[builtString.length - 1] + entry.unit[0];
      if (config.awkwardBigrams.has(junction)) {
        weight *= 0.15;
      }
    }

    if (weight > 0) {
      result.push({ unit: entry.unit, weight, charLen: entry.charLen });
    }
  }

  return result;
}

/**
 * Checks a completed candidate against all hard constraints.
 * Returns { valid, reasons[] }.
 */
export function checkHardConstraints(candidate: string): {
  valid: boolean;
  reasons: string[];
} {
  const config = loadHeuristicsConfig();
  const reasons: string[] = [];

  for (const sub of config.hardConstraints.disallowedSubstrings) {
    if (candidate.includes(sub)) {
      reasons.push(`Contains disallowed substring "${sub}"`);
    }
  }

  // ck not after vowel check (scan for ck in string)
  if (config.hardConstraints.ckMustFollowVowel) {
    const ckIdx = candidate.indexOf("ck");
    if (ckIdx > 0) {
      const charBefore = candidate[ckIdx - 1];
      if (!"aeiou".includes(charBefore)) {
        reasons.push(`"ck" not preceded by vowel at position ${ckIdx}`);
      }
    } else if (ckIdx === 0) {
      reasons.push(`"ck" at start with no preceding vowel`);
    }
  }

  // qu must be followed by vowel
  if (config.hardConstraints.quMustPrecedeVowel) {
    const quIdx = candidate.indexOf("qu");
    if (quIdx >= 0 && quIdx + 2 < candidate.length) {
      const charAfter = candidate[quIdx + 2];
      if (!"aeiou".includes(charAfter)) {
        reasons.push(`"qu" not followed by vowel at position ${quIdx}`);
      }
    }
  }

  return { valid: reasons.length === 0, reasons };
}

/**
 * Select a weighted pattern for a given target length.
 */
export function selectPattern(
  targetLen: number,
  rng: () => number
): string | null {
  const config = loadHeuristicsConfig();
  const patterns = config.patternsByLength[targetLen];
  if (!patterns || patterns.length === 0) return null;

  const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
  let roll = rng() * totalWeight;

  for (const p of patterns) {
    roll -= p.weight;
    if (roll <= 0) return p.pattern;
  }

  return patterns[patterns.length - 1].pattern;
}
