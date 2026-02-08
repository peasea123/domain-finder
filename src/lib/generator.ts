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
 * WARNING: Can produce very large arrays (e.g., CVCV = 11,025 combinations)
 */
export function generateAllCombinations(pattern: PatternTemplate): string[] {
  const vowels = ["a", "e", "i", "o", "u"];
  const consonants = ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"];

  const combinations: string[] = [];

  // Generate based on pattern
  if (pattern === "CVCV") {
    // 4-letter: C1 V1 C2 V2
    for (const c1 of consonants) {
      for (const v1 of vowels) {
        for (const c2 of consonants) {
          for (const v2 of vowels) {
            combinations.push(`${c1}${v1}${c2}${v2}`);
          }
        }
      }
    }
  } else if (pattern === "CVCC") {
    // 4-letter: C1 V1 C2 C3
    for (const c1 of consonants) {
      for (const v1 of vowels) {
        for (const c2 of consonants) {
          for (const c3 of consonants) {
            combinations.push(`${c1}${v1}${c2}${c3}`);
          }
        }
      }
    }
  } else if (pattern === "VCVC") {
    // 4-letter: V1 C1 V2 C2
    for (const v1 of vowels) {
      for (const c1 of consonants) {
        for (const v2 of vowels) {
          for (const c2 of consonants) {
            combinations.push(`${v1}${c1}${v2}${c2}`);
          }
        }
      }
    }
  } else if (pattern === "CVVC") {
    // 4-letter: C1 V1 V2 C2
    for (const c1 of consonants) {
      for (const v1 of vowels) {
        for (const v2 of vowels) {
          for (const c2 of consonants) {
            combinations.push(`${c1}${v1}${v2}${c2}`);
          }
        }
      }
    }
  } else if (pattern === "CCVC") {
    // 4-letter: C1 C2 V1 C3
    for (const c1 of consonants) {
      for (const c2 of consonants) {
        for (const v1 of vowels) {
          for (const c3 of consonants) {
            combinations.push(`${c1}${c2}${v1}${c3}`);
          }
        }
      }
    }
  } else if (pattern === "CVCVC") {
    // 5-letter: C1 V1 C2 V2 C3
    for (const c1 of consonants) {
      for (const v1 of vowels) {
        for (const c2 of consonants) {
          for (const v2 of vowels) {
            for (const c3 of consonants) {
              combinations.push(`${c1}${v1}${c2}${v2}${c3}`);
            }
          }
        }
      }
    }
  }

  return combinations;
}
