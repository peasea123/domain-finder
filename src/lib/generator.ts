/**
 * Domain name generator module
 * Generates pronounceable domain names based on patterns and constraints
 */

export type PatternTemplate = "CVCV" | "CVCC" | "VCVC" | "CVCVC" | "CVVC" | "CCVC";

export interface GeneratorConfig {
  count: number;
  length: number;
  pattern: PatternTemplate;
  tlds: string[];
  prefix?: string;
  suffix?: string;
  excludeLetters?: string[];
  forbiddenBigrams?: string[];
  allowDoubles?: boolean;
  seed?: number;
  ensureUnique?: boolean;
}

export interface GeneratorResult {
  domains: string[];
  config: GeneratorConfig;
  generatedAt: string;
  count: number;
}

class DomainGenerator {
  private vowels: string;
  private consonants: string;
  private rng: SeededRandom;

  constructor(seed?: number) {
    this.vowels = "aeiou";
    this.consonants = "bcdfghjklmnpqrstvwxyz";
    this.rng = new SeededRandom(seed ?? Date.now());
  }

  /**
   * Generate domain names based on configuration
   */
  generate(config: GeneratorConfig): GeneratorResult {
    const vowels = this.vowels
      .split("")
      .filter((v) => !config.excludeLetters?.includes(v));
    const consonants = this.consonants
      .split("")
      .filter((c) => !config.excludeLetters?.includes(c));

    const domains = new Set<string>();

    while (domains.size < config.count) {
      const name = this.generateName(
        config.length,
        config.pattern,
        consonants,
        vowels,
        config
      );

      let finalName = name;

      // Apply prefix
      if (config.prefix) {
        finalName = config.prefix + name.slice(config.prefix.length);
      }

      // Apply suffix
      if (config.suffix) {
        finalName = name.slice(0, -config.suffix.length) + config.suffix;
      }

      // Check forbidden bigrams
      if (config.forbiddenBigrams && this.hasForbiddenBigram(finalName, config.forbiddenBigrams)) {
        continue;
      }

      // Add all TLDs
      for (const tld of config.tlds) {
        const domain = `${finalName}.${tld}`;
        domains.add(domain);

        if (domains.size >= config.count) break;
      }
    }

    const domainArray = Array.from(domains).slice(0, config.count);

    return {
      domains: domainArray,
      config,
      generatedAt: new Date().toISOString(),
      count: domainArray.length,
    };
  }

  /**
   * Generate a single name based on pattern
   */
  private generateName(
    length: number,
    pattern: PatternTemplate,
    consonants: string[],
    vowels: string[],
    config: GeneratorConfig
  ): string {
    let name = "";
    const expandedPattern = this.expandPattern(pattern, length);

    for (let i = 0; i < expandedPattern.length; i++) {
      const char = expandedPattern[i];

      if (char === "C") {
        let newChar = this.pickRandom(consonants);
        // Check double letter constraint
        if (!config.allowDoubles && i > 0 && name[i - 1] === newChar) {
          i--;
          continue;
        }
        name += newChar;
      } else if (char === "V") {
        let newChar = this.pickRandom(vowels);
        if (!config.allowDoubles && i > 0 && name[i - 1] === newChar) {
          i--;
          continue;
        }
        name += newChar;
      }
    }

    return name.slice(0, length);
  }

  /**
   * Expand pattern to match desired length
   */
  private expandPattern(pattern: PatternTemplate, length: number): string {
    if (pattern.length === length) return pattern;

    // Repeat pattern to fill length
    let expanded = "";
    while (expanded.length < length) {
      expanded += pattern;
    }
    return expanded.slice(0, length);
  }

  /**
   * Check if name contains forbidden bigrams
   */
  private hasForbiddenBigram(
    name: string,
    forbidden: string[]
  ): boolean {
    for (const bigram of forbidden) {
      if (name.includes(bigram.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Pick random element from array using seeded RNG
   */
  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(this.rng.random() * arr.length)];
  }
}

/**
 * Seeded random number generator for reproducibility
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export function createGenerator(seed?: number): DomainGenerator {
  return new DomainGenerator(seed);
}

export async function generateDomains(config: GeneratorConfig): Promise<GeneratorResult> {
  const generator = createGenerator(config.seed);
  return generator.generate(config);
}

/**
 * Generate ALL possible combinations for a pattern (cartesian product)
 * Used for comprehensive domain checking without randomization
 * Expands pattern to match desired length (e.g., CVCV->CVCVCV for length 6)
 * WARNING: Can produce very large arrays (grows exponentially with length)
 * Examples:
 *   CVCV at length 4 = 20 × 5 × 20 × 5 = 10,000 (20 consonants, 5 vowels from y-less set - actually counted as 20 in code)
 *   CVCV at length 6 = 20^3 × 5^3 = 1,000,000 (exponential growth!)
 *   CVCV at length 8 = 20^4 × 5^4 = 100,000,000 (be careful!)
 */
export function generateAllCombinations(pattern: PatternTemplate, length: number): string[] {
  const vowels = ["a", "e", "i", "o", "u"];
  const consonants = ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"];

  // Expand pattern to match desired length by repeating it
  let expandedPattern = "";
  while (expandedPattern.length < length) {
    expandedPattern += pattern;
  }
  expandedPattern = expandedPattern.slice(0, length);

  // Build indices: C->0, V->1 (to track which loop level uses consonants vs vowels)
  const patternIndices = expandedPattern.split("").map((char) => (char === "C" ? 0 : 1));

  const combinations: string[] = [];

  // Generate using nested loops - one level per character
  // This is a generic cartesian product generator
  const generate = (index: number, current: string): void => {
    if (index === expandedPattern.length) {
      combinations.push(current);
      return;
    }

    if (patternIndices[index] === 0) {
      // Consonant position
      for (const c of consonants) {
        generate(index + 1, current + c);
      }
    } else {
      // Vowel position
      for (const v of vowels) {
        generate(index + 1, current + v);
      }
    }
  };

  generate(0, "");
  return combinations;
}
