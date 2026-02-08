/**
 * Batch checker for all CVCV four-letter domain combinations
 * Respects rate limits and shows progress
 * 
 * Run with: npx ts-node scripts/batch-check-cvcv.ts
 */

import fs from "fs";
import path from "path";
import { checkDomain, CheckResult } from "../src/lib/checker";

const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const TLD = "com";

// Rate limiting
const RDAP_MAX_RPS = 40; // Conservative: max 40 requests per second for RDAP
const BATCH_SIZE = 50; // Check 50 at a time
const DELAY_BETWEEN_BATCHES_MS = 1500; // 1.5 second delay between batches

interface BatchCheckConfig {
  tld: string;
  timeout_ms: number;
  enableRDAP: boolean;
  enableHTTP: boolean;
  outputFile: string;
}

/**
 * Generate all CVCV 4-letter combinations
 */
function generateAllCVCV(): string[] {
  const combinations: string[] = [];
  const c_list = CONSONANTS.split("");
  const v_list = VOWELS.split("");

  for (const c1 of c_list) {
    for (const v1 of v_list) {
      for (const c2 of c_list) {
        for (const v2 of v_list) {
          combinations.push(`${c1}${v1}${c2}${v2}`);
        }
      }
    }
  }

  return combinations;
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format time duration
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Main batch check function
 */
async function batchCheckCVCV(config: BatchCheckConfig): Promise<void> {
  console.log("🚀 CVCV Batch Domain Checker");
  console.log("============================\n");

  // Generate all combinations
  console.log("📝 Generating all CVCV combinations...");
  const combinations = generateAllCVCV();
  const totalDomains = combinations.length;
  console.log(`✅ Generated ${totalDomains.toLocaleString()} combinations\n`);

  // Create domain list with TLD
  const domains = combinations.map((name) => `${name}.${config.tld}`);

  // Initialize results
  const results: CheckResult[] = [];
  let checkedCount = 0;
  let availableCount = 0;
  let takenCount = 0;
  let unknownCount = 0;
  const startTime = Date.now();

  console.log(`⏱️  Starting checks (ETA: ~${formatTime((totalDomains / RDAP_MAX_RPS) * 1000)})`);
  console.log(`📊 Rate limit: ${RDAP_MAX_RPS} req/sec, Batch size: ${BATCH_SIZE}\n`);

  // Process in batches
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batchDomains = domains.slice(i, Math.min(i + BATCH_SIZE, domains.length));
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(domains.length / BATCH_SIZE);

    console.log(`\n🔍 Batch ${batchNumber}/${totalBatches} (${checkedCount.toLocaleString()}-${Math.min(checkedCount + BATCH_SIZE, totalDomains).toLocaleString()}/${totalDomains.toLocaleString()})`);

    // Check domains in this batch with delays
    for (let j = 0; j < batchDomains.length; j++) {
      const domain = batchDomains[j];

      try {
        const result = await checkDomain(domain, {
          timeout_ms: config.timeout_ms,
          enableRDAP: config.enableRDAP,
          enableHTTP: config.enableHTTP,
        });

        results.push(result);
        checkedCount++;

        // Count verdicts
        if (result.verdict === "AVAILABLE") {
          availableCount++;
          process.stdout.write("✓");
        } else if (result.verdict === "TAKEN") {
          takenCount++;
          process.stdout.write("✗");
        } else {
          unknownCount++;
          process.stdout.write("?");
        }

        // Add delay between requests to respect rate limits
        if (j < batchDomains.length - 1) {
          await sleep(25); // 25ms delay = ~40 req/sec
        }
      } catch (error) {
        console.error(`\n❌ Error checking ${domain}:`, error);
        unknownCount++;
        process.stdout.write("!");
      }

      // Progress indicator every 100
      if (checkedCount % 100 === 0) {
        const elapsed = Date.now() - startTime;
        const avgSpeed = checkedCount / (elapsed / 1000);
        const remaining = totalDomains - checkedCount;
        const estimatedRemaining = Math.ceil(remaining / avgSpeed);
        process.stdout.write(` ${checkedCount.toLocaleString()} (ETA: ${formatTime(estimatedRemaining * 1000)})\n`);
      }
    }

    // Delay between batches to be extra safe with rate limits
    if (i + BATCH_SIZE < domains.length) {
      process.stdout.write(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...\n`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  const totalTime = Date.now() - startTime;
  const avgRps = checkedCount / (totalTime / 1000);

  console.log("\n\n📊 RESULTS");
  console.log("==========");
  console.log(`✅ Available: ${availableCount.toLocaleString()} (${((availableCount / totalDomains) * 100).toFixed(2)}%)`);
  console.log(`❌ Taken: ${takenCount.toLocaleString()} (${((takenCount / totalDomains) * 100).toFixed(2)}%)`);
  console.log(`❓ Unknown: ${unknownCount.toLocaleString()} (${((unknownCount / totalDomains) * 100).toFixed(2)}%)`);
  console.log(`\nTotal checked: ${checkedCount.toLocaleString()} / ${totalDomains.toLocaleString()}`);
  console.log(`Time elapsed: ${formatTime(totalTime)}`);
  console.log(`Average speed: ${avgRps.toFixed(1)} req/sec`);

  // Save results to file
  console.log(`\n💾 Saving results to ${config.outputFile}...`);
  const outputPath = path.join(process.cwd(), config.outputFile);
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        metadata: {
          pattern: "CVCV",
          length: 4,
          tld: config.tld,
          totalDomains,
          checkedCount,
          timestamp: new Date().toISOString(),
          duration_ms: totalTime,
          avg_rps: parseFloat(avgRps.toFixed(2)),
        },
        summary: {
          available: availableCount,
          taken: takenCount,
          unknown: unknownCount,
        },
        results,
      },
      null,
      2
    )
  );

  // Separate files for available domains
  const availableDomains = results
    .filter((r) => r.verdict === "AVAILABLE")
    .map((r) => r.domain);

  if (availableDomains.length > 0) {
    const availableFile = config.outputFile.replace(".json", "-available.txt");
    const availablePath = path.join(process.cwd(), availableFile);
    fs.writeFileSync(availablePath, availableDomains.join("\n"));
    console.log(`📄 Available domains saved to ${availableFile}`);
  }

  console.log(`\n✨ Done! All results saved.`);
}

// Main entry point
async function main() {
  const config: BatchCheckConfig = {
    tld: TLD,
    timeout_ms: 5000,
    enableRDAP: true,
    enableHTTP: false,
    outputFile: `results/cvcv-batch-${TLD}-${new Date().toISOString().split("T")[0]}.json`,
  };

  // Create results directory if it doesn't exist
  const resultsDir = path.join(process.cwd(), "results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  try {
    await batchCheckCVCV(config);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
