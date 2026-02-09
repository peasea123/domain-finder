import { NextRequest, NextResponse } from "next/server";
import { generateSmartDomains } from "@/lib/smart-generator";
import { checkBatch, CheckerConfig } from "@/lib/checker";
import { SmartRunRequestSchema } from "@/lib/schema";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SmartRunRequestSchema.parse(body);

    // Step 1: Generate smart domain candidates
    const genResult = await generateSmartDomains({
      targetLen: validated.generateConfig.targetLen,
      count: validated.generateConfig.count,
      tlds: validated.generateConfig.tlds,
      style: validated.generateConfig.style,
      seed: validated.generateConfig.seed,
      scored: validated.generateConfig.scored,
    });

    // Guard against too many domains for serverless
    if (genResult.candidates.length > 500) {
      return NextResponse.json(
        { error: "Generated too many domains (>500). Please reduce count." },
        { status: 400 }
      );
    }

    // Step 2: Check availability via existing pipeline
    const domains = genResult.candidates.map((c) => c.domain);

    const checkerConfig: CheckerConfig = {
      tlds: validated.checkerConfig?.tlds,
      timeout_ms: validated.checkerConfig?.timeout_ms ?? 5000,
      concurrency: validated.checkerConfig?.concurrency ?? 5,
      retries: validated.checkerConfig?.retries ?? 1,
      enableHTTP: validated.checkerConfig?.enableHTTP ?? false,
      enableRDAP: validated.checkerConfig?.enableRDAP ?? true,
      stopAfterNAvailable: validated.checkerConfig?.stopAfterNAvailable,
    };

    const checkResults = await checkBatch(domains, checkerConfig);

    // Merge smart candidate data with check results
    const mergedResults = genResult.candidates.map((candidate) => {
      const checkResult = checkResults.find((r) => r.domain === candidate.domain);
      return {
        ...candidate,
        verdict: checkResult?.verdict ?? "UNKNOWN",
        confidence: checkResult?.confidence ?? "LOW",
        signals: checkResult?.signals ?? [],
        reasons: checkResult?.reasons ?? [],
        ip: checkResult?.ip,
        rdapStatus: checkResult?.rdapStatus,
        dnsRecordFound: checkResult?.dnsRecordFound,
        httpResolved: checkResult?.httpResolved,
        checkTimestamp: checkResult?.timestamp,
        checkDuration_ms: checkResult?.duration_ms ?? 0,
      };
    });

    // Re-sort: available first (within score order), then by score
    mergedResults.sort((a, b) => {
      // Available domains first
      if (a.verdict === "AVAILABLE" && b.verdict !== "AVAILABLE") return -1;
      if (b.verdict === "AVAILABLE" && a.verdict !== "AVAILABLE") return 1;
      // Then by score descending
      return b.score - a.score;
    });

    // Summary
    const summary = {
      total: mergedResults.length,
      available: mergedResults.filter((r) => r.verdict === "AVAILABLE").length,
      taken: mergedResults.filter((r) => r.verdict === "TAKEN").length,
      unknown: mergedResults.filter((r) => r.verdict === "UNKNOWN").length,
    };

    return NextResponse.json({
      generation: {
        count: genResult.totalReturned,
        totalGenerated: genResult.totalGenerated,
        generatedAt: genResult.generatedAt,
        style: validated.generateConfig.style,
      },
      results: mergedResults,
      summary,
      totalTime_ms: checkResults.reduce((sum, r) => sum + r.duration_ms, 0),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
