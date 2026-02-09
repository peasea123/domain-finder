#!/usr/bin/env node

/**
 * Batch checker for all CVCV four-letter domain combinations
 * Self-contained Node.js script - no ts-node needed
 * 
 * Run with: node scripts/batch-check-cvcv-simple.js
 */

const fs = require("fs");
const path = require("path");

const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const TLD = "com";
const RDAP_MAX_RPS = 40; // Conservative: max 40 requests per second for RDAP
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1500;

// Rate limiting
const requestQueue = [];
let activeRequests = 0;
let lastRequestTime = 0;

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate-limited fetch with RDAP timeout
 */
async function limitedFetch(url, options = {}) {
  // Wait for rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minTimeBetweenRequests = Math.ceil(1000 / RDAP_MAX_RPS);

  if (timeSinceLastRequest < minTimeBetweenRequests) {
    await sleep(minTimeBetweenRequests - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
  return fetch(url, { ...options, timeout: 5000 });
}

/**
 * Check domain via DNS
 */
async function checkDNS(domain) {
  try {
    const response = await limitedFetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
      {
        headers: { "Accept": "application/dns-json" },
        timeout: 5000,
      }
    );

    if (!response.ok) return { found: false, ip: null };

    const data = await response.json();

    // Status: 0 = NOERROR, 3 = NXDOMAIN
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      const ipRecord = data.Answer.find((r) => r.type === 1); // Type 1 = A record
      return { found: true, ip: ipRecord?.data || null };
    } else if (data.Status === 3) {
      return { found: false, ip: null };
    } else {
      return { error: true };
    }
  } catch (error) {
    return { error: true };
  }
}

/**
 * Check domain via RDAP (Verisign)
 */
async function checkRDAP(domain) {
  try {
    const response = await limitedFetch(
      `https://rdap.verisign.com/${TLD}/v1/domain/${domain}`,
      {
        headers: { "Accept": "application/rdap+json" },
        timeout: 8000,
      }
    );

    if (response.status === 200) {
      return { registered: true };
    } else if (response.status === 404) {
      return { registered: false };
    } else {
      return { error: true };
    }
  } catch (error) {
    return { error: true };
  }
}

/**
 * Determine verdict from signals
 * RDAP is authoritative for .com, but if it fails, we cannot determine availability
 */
function determineVerdict(dnsResult, rdapResult) {
  // RDAP is authoritative for .com - only trust if no error
  if (rdapResult && !rdapResult.error) {
    if (rdapResult.registered) {
      return { verdict: "TAKEN", confidence: "HIGH" };
    } else {
      return { verdict: "AVAILABLE", confidence: "HIGH" };
    }
  }

  // If RDAP failed/timed out, we cannot determine availability reliably
  if (rdapResult && rdapResult.error) {
    // RDAP failed - return UNKNOWN regardless of DNS
    // (DNS absence doesn't prove availability if RDAP is also failing)
    return { verdict: "UNKNOWN", confidence: "LOW" };
  }

  // Fall back to DNS only if RDAP wasn't checked
  if (dnsResult && dnsResult.found) {
    return { verdict: "TAKEN", confidence: "MEDIUM" };
  } else if (dnsResult && !dnsResult.error && !dnsResult.found) {
    // Only mark as AVAILABLE if DNS is reliable and checked
    // Note: This is weaker confidence than RDAP
    return { verdict: "AVAILABLE", confidence: "LOW" };
  }

  return { verdict: "UNKNOWN", confidence: "LOW" };
}

/**
 * Check a single domain
 */
async function checkDomain(domain) {
  const startTime = Date.now();
  const dnsResult = await checkDNS(domain);
  const rdapResult = await checkRDAP(domain);
  const { verdict, confidence } = determineVerdict(dnsResult, rdapResult);

  return {
    domain,
    verdict,
    confidence,
    ip: dnsResult.ip || null,
    dnsFound: dnsResult.found || false,
    rdapRegistered: rdapResult?.registered || null,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Generate all CVCV 4-letter combinations
 */
function generateAllCVCV() {
  const combinations = [];
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
 * Format time duration
 */
function formatTime(ms) {
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
async function batchCheckCVCV() {
  console.log("\n🚀 CVCV Batch Domain Checker");
  console.log("============================\n");

  // Generate all combinations
  console.log("📝 Generating all CVCV combinations...");
  const combinations = generateAllCVCV();
  const totalDomains = combinations.length;
  console.log(`✅ Generated ${totalDomains.toLocaleString()} combinations\n`);

  // Create domain list
  const domains = combinations.map((name) => `${name}.${TLD}`);

  // Initialize results
  const results = [];
  let checkedCount = 0;
  let availableCount = 0;
  let takenCount = 0;
  let unknownCount = 0;
  const startTime = Date.now();

  console.log(
    `⏱️  Starting checks (ETA: ~${formatTime((totalDomains / RDAP_MAX_RPS) * 1000)})`
  );
  console.log(
    `📊 Rate limit: ${RDAP_MAX_RPS} req/sec, Batch size: ${BATCH_SIZE}\n`
  );

  // Process in batches
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batchDomains = domains.slice(
      i,
      Math.min(i + BATCH_SIZE, domains.length)
    );
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(domains.length / BATCH_SIZE);

    console.log(
      `\n🔍 Batch ${batchNumber}/${totalBatches} (${checkedCount.toLocaleString()}-${Math.min(checkedCount + BATCH_SIZE, totalDomains).toLocaleString()}/${totalDomains.toLocaleString()})`
    );

    // Check domains in this batch
    for (let j = 0; j < batchDomains.length; j++) {
      const domain = batchDomains[j];

      try {
        const result = await checkDomain(domain);
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
      } catch (error) {
        console.error(`\n❌ Error checking ${domain}:`, error.message);
        unknownCount++;
        process.stdout.write("!");
      }

      // Progress indicator every 100
      if (checkedCount % 100 === 0) {
        const elapsed = Date.now() - startTime;
        const avgSpeed = checkedCount / (elapsed / 1000);
        const remaining = totalDomains - checkedCount;
        const estimatedRemaining = Math.ceil(remaining / avgSpeed);
        process.stdout.write(
          ` ${checkedCount.toLocaleString()} (ETA: ${formatTime(estimatedRemaining * 1000)})\n`
        );
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < domains.length) {
      process.stdout.write(
        `\n⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...\n`
      );
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  const totalTime = Date.now() - startTime;
  const avgRps = checkedCount / (totalTime / 1000);

  console.log("\n\n📊 RESULTS");
  console.log("==========");
  console.log(
    `✅ Available: ${availableCount.toLocaleString()} (${((availableCount / totalDomains) * 100).toFixed(2)}%)`
  );
  console.log(
    `❌ Taken: ${takenCount.toLocaleString()} (${((takenCount / totalDomains) * 100).toFixed(2)}%)`
  );
  console.log(
    `❓ Unknown: ${unknownCount.toLocaleString()} (${((unknownCount / totalDomains) * 100).toFixed(2)}%)`
  );
  console.log(`\nTotal checked: ${checkedCount.toLocaleString()} / ${totalDomains.toLocaleString()}`);
  console.log(`Time elapsed: ${formatTime(totalTime)}`);
  console.log(`Average speed: ${avgRps.toFixed(1)} req/sec`);

  // Save results
  console.log("\n💾 Saving results...");
  const resultsDir = path.join(__dirname, "..", "results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const outputFile = path.join(resultsDir, `cvcv-batch-${TLD}-${timestamp}.json`);

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        metadata: {
          pattern: "CVCV",
          length: 4,
          tld: TLD,
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
  console.log(`✅ Results saved to ${outputFile}`);

  // Save available domains list
  const availableDomains = results
    .filter((r) => r.verdict === "AVAILABLE")
    .map((r) => r.domain);

  if (availableDomains.length > 0) {
    const availableFile = path.join(
      resultsDir,
      `cvcv-available-${TLD}-${timestamp}.txt`
    );
    fs.writeFileSync(availableFile, availableDomains.join("\n"));
    console.log(
      `📄 Available domains (${availableDomains.length}) saved to ${availableFile}`
    );
  }

  console.log(`\n✨ Done!\n`);
}

// Main entry point
batchCheckCVCV().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
