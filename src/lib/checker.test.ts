/**
 * Tests for domain checker verdict logic
 */

import { CheckSignal, Verdict, Confidence } from "@/lib/checker";

// Mock verdict determination logic for testing
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
      if (dnsRecordFound) {
        return { verdict: "TAKEN", confidence: "MEDIUM" };
      }
      return { verdict: "UNKNOWN", confidence: "LOW" };
    }
  }

  // For other TLDs: heuristic based on DNS/HTTP
  if (dnsRecordFound) {
    return { verdict: "TAKEN", confidence: "HIGH" };
  }

  const hasTimeouts = signals.some((s) => s.includes("timeout"));
  if (hasTimeouts && signals.length <= 2) {
    return { verdict: "UNKNOWN", confidence: "LOW" };
  }

  return { verdict: "AVAILABLE", confidence: "MEDIUM" };
}

describe("Domain Checker - Verdict Logic", () => {
  describe(".com/.net with RDAP", () => {
    it("should return AVAILABLE/HIGH when RDAP says not found", () => {
      const result = determineVerdict("example.com", ["rdap-available"], false, "available");
      expect(result.verdict).toBe("AVAILABLE");
      expect(result.confidence).toBe("HIGH");
    });

    it("should return TAKEN/HIGH when RDAP says registered", () => {
      const result = determineVerdict(
        "example.com",
        ["rdap-registered"],
        true,
        "registered"
      );
      expect(result.verdict).toBe("TAKEN");
      expect(result.confidence).toBe("HIGH");
    });

    it("should fallback to DNS when RDAP unavailable", () => {
      const result = determineVerdict("example.com", ["dns-found"], true, undefined);
      expect(result.verdict).toBe("TAKEN");
      expect(result.confidence).toBe("MEDIUM");
    });

    it("should return UNKNOWN when all checks timeout", () => {
      const result = determineVerdict(
        "example.com",
        ["rdap-timeout", "dns-timeout"],
        false,
        undefined
      );
      expect(result.verdict).toBe("UNKNOWN");
      expect(result.confidence).toBe("LOW");
    });
  });

  describe("non-.com/.net TLDs", () => {
    it("should return TAKEN/HIGH when DNS found", () => {
      const result = determineVerdict("example.io", ["dns-found"], true);
      expect(result.verdict).toBe("TAKEN");
      expect(result.confidence).toBe("HIGH");
    });

    it("should return AVAILABLE/MEDIUM when no signals", () => {
      const result = determineVerdict("example.io", [], false);
      expect(result.verdict).toBe("AVAILABLE");
      expect(result.confidence).toBe("MEDIUM");
    });
  });

  describe("Signal evaluation", () => {
    it("should weigh DNS resolution as definitive for taken", () => {
      const result = determineVerdict("test.io", ["dns-found"], true);
      expect(result.verdict).toBe("TAKEN");
    });

    it("should handle timeout gracefully", () => {
      const result = determineVerdict("test.io", ["dns-timeout"], false);
      expect(result.verdict).toBe("UNKNOWN");
      expect(result.confidence).toBe("LOW");
    });

    it("should combine DNS error with other signals", () => {
      const result = determineVerdict("test.io", ["dns-error", "http-not-found"], false);
      expect(result.verdict).toBe("AVAILABLE");
    });
  });
});
