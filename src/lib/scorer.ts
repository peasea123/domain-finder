/**
 * VC Brandability Scorer
 *
 * Scores domain name candidates on a 0–100 scale across 7 dimensions
 * modeled on VC-backed company naming heuristics:
 *
 * 1. Brevity (20%) — shorter names command premium valuations
 * 2. Pronounceability (25%) — can people say it on a podcast?
 * 3. Visual Balance (10%) — does it look good as a logo/wordmark?
 * 4. Memorability (15%) — will people recall it after hearing once?
 * 5. Distinctiveness (10%) — is it novel or generic?
 * 6. Trademark Safety (10%) — risk of collision with known brands?
 * 7. Domain Premium (10%) — intrinsic .com aftermarket value signal
 */

import { loadHeuristicsConfig } from "./heuristics-config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  overall: number;
  brevity: number;
  pronounceability: number;
  visualBalance: number;
  memorability: number;
  distinctiveness: number;
  trademarkSafety: number;
  domainPremium: number;
}

// ─── Scoring Functions ──────────────────────────────────────────────────────

function scoreBrevity(name: string): number {
  const config = loadHeuristicsConfig();
  const scores = config.scoring.dimensions.brevity.scores as Record<string, number>;
  const len = name.length;
  return scores[len.toString()] ?? Math.max(0, 100 - len * 10);
}

function scorePronounceability(
  name: string,
  units?: string[],
): number {
  const config = loadHeuristicsConfig();
  const dim = config.scoring.dimensions.pronounceability;
  let score = 60; // baseline

  // Bonus for containing multi-char units (digraphs/blends)
  if (units) {
    const multiUnits = units.filter((u) => u.length > 1);
    score += multiUnits.length * dim.digraphBonus;
  }

  // Vowel-consonant alternation bonus
  const vowels = new Set("aeiou");
  let alternations = 0;
  for (let i = 1; i < name.length; i++) {
    const prevIsVowel = vowels.has(name[i - 1]);
    const currIsVowel = vowels.has(name[i]);
    if (prevIsVowel !== currIsVowel) alternations++;
  }
  const alternationRatio = alternations / (name.length - 1);
  if (alternationRatio > 0.6) {
    score += dim.vowelConsonantAlternationBonus;
  }

  // Vowel ratio check
  const vowelCount = [...name].filter((c) => vowels.has(c)).length;
  const vowelRatio = vowelCount / name.length;
  if (vowelRatio < dim.idealVowelRatioMin) {
    const deficit = (dim.idealVowelRatioMin - vowelRatio) * 100;
    score -= deficit * dim.vowelRatioPenaltyPerPoint;
  } else if (vowelRatio > dim.idealVowelRatioMax) {
    const excess = (vowelRatio - dim.idealVowelRatioMax) * 100;
    score -= excess * dim.vowelRatioPenaltyPerPoint;
  }

  // Awkward bigram penalty
  for (let i = 0; i < name.length - 1; i++) {
    const bigram = name.slice(i, i + 2);
    if (config.awkwardBigrams.has(bigram)) {
      score += dim.awkwardBigramPenalty;
    }
  }

  // Syllable estimate bonus (roughly 1 syllable per vowel group)
  const syllables = name.match(/[aeiou]+/gi)?.length ?? 0;
  const syllableRatio = syllables / name.length;
  if (syllableRatio >= 0.25 && syllableRatio <= 0.5) {
    score += 5; // good syllable density
  }

  return clamp(score, 0, 100);
}

function scoreVisualBalance(name: string): number {
  const dim = loadHeuristicsConfig().scoring.dimensions.visualBalance;
  let score = 70; // baseline

  // Character variety
  const uniqueChars = new Set(name).size;
  const varietyRatio = uniqueChars / name.length;
  if (varietyRatio >= 0.6) {
    score += dim.varietyBonus;
  }

  // Triple character penalty
  for (let i = 0; i < name.length - 2; i++) {
    if (name[i] === name[i + 1] && name[i + 1] === name[i + 2]) {
      score += dim.tripleRepeatPenalty;
    }
  }

  // Ascender/descender balance
  const ascenders = new Set(dim.ascenders);
  const descenders = new Set(dim.descenders);
  let ascCount = 0;
  let descCount = 0;
  for (const ch of name) {
    if (ascenders.has(ch)) ascCount++;
    if (descenders.has(ch)) descCount++;
  }

  // Bonus for having some vertical variety but not too much
  const verticalChars = ascCount + descCount;
  const verticalRatio = verticalChars / name.length;
  if (verticalRatio >= 0.15 && verticalRatio <= 0.5) {
    score += 8; // pleasant visual rhythm
  } else if (verticalRatio > 0.6) {
    score -= 10; // too busy
  }

  // Width uniformity — penalize mixing very wide (m,w) and very narrow (i,l,j)
  const wide = [...name].filter((c) => "mw".includes(c)).length;
  const narrow = [...name].filter((c) => "ijl".includes(c)).length;
  if (wide > 0 && narrow > 0 && (wide + narrow) / name.length > 0.5) {
    score -= 8;
  }

  return clamp(score, 0, 100);
}

function scoreMemorability(name: string, units?: string[]): number {
  let score = 60;

  // Shorter = more memorable
  if (name.length <= 5) score += 15;
  else if (name.length <= 7) score += 8;
  else if (name.length <= 9) score += 3;

  // Contains multi-char phonemes (feels like a "real" word)
  if (units) {
    const hasMultiUnit = units.some((u) => u.length > 1);
    if (hasMultiUnit) score += 5;
  }

  // Rhythmic pattern bonus — alternating stressed/unstressed feel
  const vowels = new Set("aeiou");
  let pattern = "";
  for (const ch of name) {
    pattern += vowels.has(ch) ? "V" : "C";
  }
  // Check for CV alternation runs
  let maxRun = 0;
  let currentRun = 1;
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i] !== pattern[i - 1]) {
      currentRun++;
    } else {
      maxRun = Math.max(maxRun, currentRun);
      currentRun = 1;
    }
  }
  maxRun = Math.max(maxRun, currentRun);
  if (maxRun >= name.length * 0.7) {
    score += 8; // strong rhythmic pattern
  }

  // Penalize confusable characters in combination
  const confusablePairs = [
    ["r", "n"], // rn looks like m
  ];
  for (const [a, b] of confusablePairs) {
    if (name.includes(a + b)) {
      score -= 5;
    }
  }

  return clamp(score, 0, 100);
}

function scoreDistinctiveness(name: string): number {
  const dim = loadHeuristicsConfig().scoring.dimensions.distinctiveness;
  let score = 70;

  // Penalty for common prefixes
  for (const prefix of dim.commonPrefixes) {
    if (name.startsWith(prefix)) {
      score += dim.commonWordPenalty;
      break;
    }
  }

  // Penalty for common suffixes
  for (const suffix of dim.commonSuffixes) {
    if (name.endsWith(suffix)) {
      score += dim.commonWordPenalty;
      break;
    }
  }

  // Letter entropy — how varied are the characters?
  const freq: Record<string, number> = {};
  for (const ch of name) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / name.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  if (entropy >= dim.minEntropy) {
    score += dim.noveltyBonus;
  } else {
    score -= (dim.minEntropy - entropy) * 8;
  }

  return clamp(score, 0, 100);
}

function scoreTrademarkSafety(name: string): number {
  const dim = loadHeuristicsConfig().scoring.dimensions.trademarkSafety;
  let score = 80; // start optimistic — generated names are usually novel

  // Check brand substrings
  for (const brand of dim.knownBrands) {
    if (name.includes(brand)) {
      score += dim.brandSubstringPenalty;
    }
  }

  // Bonus for being novel — no real English word longer than maxRealWordLength
  // Simple heuristic: if name length > 4 and doesn't contain common 4+ letter words
  const commonWords = [
    "able", "back", "best", "book", "call", "case", "city", "come",
    "data", "done", "face", "fact", "fast", "find", "fire", "first",
    "free", "game", "give", "good", "hand", "have", "help", "here",
    "high", "home", "just", "keep", "know", "last", "life", "like",
    "line", "link", "list", "live", "long", "look", "made", "make",
    "mind", "most", "move", "much", "must", "name", "need", "news",
    "next", "only", "open", "over", "part", "plan", "play", "post",
    "read", "real", "rent", "rest", "road", "sale", "same", "save",
    "self", "send", "show", "side", "sign", "site", "some", "star",
    "step", "stop", "sure", "take", "talk", "team", "tell", "test",
    "than", "that", "them", "then", "they", "this", "time", "text",
    "true", "turn", "type", "upon", "used", "user", "very", "view",
    "want", "well", "went", "what", "when", "wide", "will", "with",
    "word", "work", "year", "your", "zero", "zone",
  ];
  let containsCommonWord = false;
  for (const word of commonWords) {
    if (name.includes(word)) {
      containsCommonWord = true;
      break;
    }
  }
  if (!containsCommonWord) {
    score += dim.noveltyBonus;
  } else {
    score -= 8;
  }

  return clamp(score, 0, 100);
}

function scoreDomainPremium(name: string): number {
  const dim = loadHeuristicsConfig().scoring.dimensions.domainPremium;
  const premiums = dim.lengthPremium as Record<string, number>;
  const len = name.length;

  let score = premiums[len.toString()] ?? Math.max(0, 100 - len * 10);

  // .com bonus applied by default (actual availability adjusts this later)
  score += dim.comBonus;

  return clamp(score, 0, 100);
}

// ─── Main Scoring Function ──────────────────────────────────────────────────

/**
 * Score a domain name candidate on the full VC brandability scorecard.
 *
 * @param name - The domain label (e.g., "tharo")
 * @param units - Optional: the virtual letter units used (e.g., ["th","a","r","o"])
 * @param pattern - Optional: the pattern used (e.g., "CVCV")
 * @returns ScoreBreakdown with per-dimension scores and weighted overall
 */
export function scoreName(
  name: string,
  units?: string[],
  pattern?: string,
): ScoreBreakdown {
  void pattern; // reserved for future pattern-specific scoring

  const config = loadHeuristicsConfig();
  const dims = config.scoring.dimensions;

  const brevity = scoreBrevity(name);
  const pronounceability = scorePronounceability(name, units);
  const visualBalance = scoreVisualBalance(name);
  const memorability = scoreMemorability(name, units);
  const distinctiveness = scoreDistinctiveness(name);
  const trademarkSafety = scoreTrademarkSafety(name);
  const domainPremium = scoreDomainPremium(name);

  const overall = Math.round(
    brevity * dims.brevity.weight +
    pronounceability * dims.pronounceability.weight +
    visualBalance * dims.visualBalance.weight +
    memorability * dims.memorability.weight +
    distinctiveness * dims.distinctiveness.weight +
    trademarkSafety * dims.trademarkSafety.weight +
    domainPremium * dims.domainPremium.weight
  );

  return {
    overall: clamp(overall, 0, 100),
    brevity,
    pronounceability,
    visualBalance,
    memorability,
    distinctiveness,
    trademarkSafety,
    domainPremium,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
