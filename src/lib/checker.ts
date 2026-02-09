/**
 * Domain availability checker module
 * Implements multi-stage checking: DNS (DoH), RDAP, HTTP
 */

export type CheckSignal = "dns-found" | "dns-timeout" | "dns-error" | "rdap-registered" | "rdap-available" | "rdap-timeout" | "http-found" | "http-not-found" | "http-timeout";
export type Verdict = "AVAILABLE" | "TAKEN" | "UNKNOWN";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface CheckResult {
  domain: string;
  verdict: Verdict;
  confidence: Confidence;
  signals: CheckSignal[];
  reasons: string[];
  ip?: string;
  rdapStatus?: string;
  dnsRecordFound?: boolean;
  httpResolved?: boolean;
  timestamp: string;
  duration_ms: number;
}

export interface CheckerConfig {
  tlds?: string[];
  timeout_ms?: number;
  concurrency?: number;
  retries?: number;
  enableHTTP?: boolean;
  enableRDAP?: boolean;
  stopAfterNAvailable?: number;
}

interface DnsResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    data: string;
  }>;
}

/**
 * Check a single domain's availability
 */
export async function checkDomain(
  domain: string,
  config: CheckerConfig = {}
): Promise<CheckResult> {
  const startTime = performance.now();
  const {
    timeout_ms = 5000,
    enableRDAP = true,
    enableHTTP = false,
  } = config;

  const signals: CheckSignal[] = [];
  const reasons: string[] = [];
  let ip: string | undefined;
  let rdapStatus: string | undefined;
  let dnsRecordFound = false;
  let httpResolved = false;

  try {
    // Stage 1: DNS check via Cloudflare DoH
    const dnsResult = await checkDNS(domain, timeout_ms);
    if (dnsResult.found) {
      signals.push("dns-found");
      dnsRecordFound = true;
      ip = dnsResult.ip;
      reasons.push("DNS A record found");
    } else if (dnsResult.timeout) {
      signals.push("dns-timeout");
      reasons.push("DNS lookup timeout");
    } else {
      signals.push("dns-error");
      reasons.push("DNS lookup failed (NXDOMAIN or error)");
    }

    // Stage 2: RDAP check for .com/.net
    if (enableRDAP) {
      const tld = domain.split(".").pop()?.toLowerCase();
      if (tld === "com" || tld === "net") {
        const rdapResult = await checkRDAP(domain, timeout_ms);
        if (rdapResult.registered) {
          signals.push("rdap-registered");
          rdapStatus = "registered";
          reasons.push("RDAP: Domain registered");
        } else if (rdapResult.available) {
          signals.push("rdap-available");
          rdapStatus = "available";
          reasons.push("RDAP: Domain not found (available)");
        } else if (rdapResult.timeout) {
          signals.push("rdap-timeout");
          reasons.push("RDAP lookup timeout");
        }
      }
    }

    // Stage 3: HTTP check (optional, supporting evidence only)
    if (enableHTTP) {
      const httpResult = await checkHTTP(domain, timeout_ms);
      if (httpResult.found) {
        signals.push("http-found");
        httpResolved = true;
        reasons.push("HTTP response received");
      } else if (httpResult.timeout) {
        signals.push("http-timeout");
        reasons.push("HTTP request timeout");
      } else {
        signals.push("http-not-found");
        reasons.push("HTTP: No resolution");
      }
    }
  } catch (err) {
    reasons.push(`Error during checks: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Determine verdict based on signals
  const { verdict, confidence } = determineVerdict(
    domain,
    signals,
    dnsRecordFound,
    rdapStatus
  );

  const duration_ms = Math.round(performance.now() - startTime);

  return {
    domain,
    verdict,
    confidence,
    signals,
    reasons,
    ip,
    rdapStatus,
    dnsRecordFound,
    httpResolved,
    timestamp: new Date().toISOString(),
    duration_ms,
  };
}

/**
 * Check multiple domains with concurrency control
 */
export async function checkBatch(
  domains: string[],
  config: CheckerConfig = {}
): Promise<CheckResult[]> {
  const { concurrency = 5 } = config;
  const results: CheckResult[] = [];
  const queue = [...domains];
  const active = new Set<Promise<CheckResult>>();

  while (queue.length > 0 || active.size > 0) {
    // Fill up to concurrency limit
    while (active.size < concurrency && queue.length > 0) {
      const domain = queue.shift()!;
      const promise = checkDomain(domain, config).then((result) => {
        active.delete(promise);
        return result;
      });
      active.add(promise);
    }

    // Wait for at least one to complete
    if (active.size > 0) {
      const result = await Promise.race(active);
      results.push(result);
    }
  }

  return results;
}

/**
 * Check domain via Cloudflare DoH JSON API
 */
async function checkDNS(
  domain: string,
  timeout_ms: number
): Promise<{ found: boolean; timeout: boolean; ip?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=A`,
      {
        headers: {
          Accept: "application/dns-json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { found: false, timeout: false };
    }

    const data = (await response.json()) as DnsResponse;

    // If Status is NOERROR (0) and we have Answer records, domain is resolving
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      // Find the first A record
      const aRecord = data.Answer.find((r: any) => r.type === 1);
      return {
        found: true,
        timeout: false,
        ip: aRecord?.data,
      };
    }

    // Status 3 = NXDOMAIN (not found)
    if (data.Status === 3) {
      return { found: false, timeout: false };
    }

    return { found: false, timeout: false };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { found: false, timeout: true };
    }
    return { found: false, timeout: false };
  }
}

/**
 * Check domain via Verisign RDAP for .com/.net
 */
async function checkRDAP(
  domain: string,
  timeout_ms: number
): Promise<{ registered: boolean; available: boolean; timeout: boolean }> {
  const tld = domain.split(".").pop()?.toLowerCase();
  if (!tld || (tld !== "com" && tld !== "net")) {
    return { registered: false, available: false, timeout: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    const url = `https://rdap.verisign.com/${tld}/v1/domain/${encodeURIComponent(
      domain
    )}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rdap+json",
      },
    });

    clearTimeout(timeoutId);

    // 200 or 2xx = domain exists
    if (response.ok) {
      return { registered: true, available: false, timeout: false };
    }

    // 404 = not found
    if (response.status === 404) {
      return { registered: false, available: true, timeout: false };
    }

    return { registered: false, available: false, timeout: false };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { registered: false, available: false, timeout: true };
    }
    return { registered: false, available: false, timeout: false };
  }
}

/**
 * Check domain via HTTP HEAD request (optional, supporting evidence only)
 */
async function checkHTTP(
  domain: string,
  timeout_ms: number
): Promise<{ found: boolean; timeout: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

    await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);
    return { found: true, timeout: false };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { found: false, timeout: true };
    }
    return { found: false, timeout: false };
  }
}

/**
 * Determine final verdict based on signals and evidence
 */
function determineVerdict(
  domain: string,
  signals: CheckSignal[],
  dnsRecordFound: boolean,
  rdapStatus?: string
): { verdict: Verdict; confidence: Confidence } {
  const tld = domain.split(".").pop()?.toLowerCase();

  // For .com/.net: RDAP is authoritative
  if (tld === "com" || tld === "net") {
    if (rdapStatus === "available") {
      return { verdict: "AVAILABLE", confidence: "HIGH" };
    }
    if (rdapStatus === "registered") {
      return { verdict: "TAKEN", confidence: "HIGH" };
    }
    if (rdapStatus === undefined) {
      // RDAP timed out or failed
      // NOTE: We cannot confidently determine availability without RDAP!
      // Even if DNS is absent, the domain could be recently registered,
      // parked without DNS resolution, or have private RDAP data
      if (dnsRecordFound) {
        // If DNS exists, definitely taken
        return { verdict: "TAKEN", confidence: "MEDIUM" };
      }
      // RDAP failed: DNS absent is not enough to claim available
      return { verdict: "UNKNOWN", confidence: "LOW" };
    }
  }

  // For other TLDs: heuristic based on DNS/HTTP
  if (dnsRecordFound) {
    return { verdict: "TAKEN", confidence: "HIGH" };
  }

  // Check if all checks timed out
  const hasTimeouts = signals.some((s) => s.includes("timeout"));
  if (hasTimeouts && signals.length <= 2) {
    return { verdict: "UNKNOWN", confidence: "LOW" };
  }

  // No DNS found and no other positive signals
  // Still cautious - only LOW confidence on DNS alone
  return { verdict: "AVAILABLE", confidence: "LOW" };
}
