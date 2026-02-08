import { NextRequest, NextResponse } from "next/server";
import { generateDomains, GeneratorConfig } from "@/lib/generator";
import { checkBatch, CheckerConfig } from "@/lib/checker";
import { RunRequestSchema } from "@/lib/schema";

export const maxDuration = 60; // For Vercel, max 60s for Pro plan

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RunRequestSchema.parse(body);

    // Step 1: Generate domains
    const generatorConfig: GeneratorConfig = {
      count: validated.generateConfig.count,
      length: validated.generateConfig.length,
      pattern: validated.generateConfig.pattern,
      tlds: validated.generateConfig.tlds,
      prefix: validated.generateConfig.prefix,
      suffix: validated.generateConfig.suffix,
      excludeLetters: validated.generateConfig.excludeLetters,
      forbiddenBigrams: validated.generateConfig.forbiddenBigrams,
      allowDoubles: validated.generateConfig.allowDoubles,
      seed: validated.generateConfig.seed,
      ensureUnique: validated.generateConfig.ensureUnique,
    };

    const generationResult = await generateDomains(generatorConfig);

    // Check if generation would exceed reasonable limits for serverless
    const domainCount = generationResult.domains.length;
    if (domainCount > 500) {
      return NextResponse.json(
        {
          error:
            "Generated too many domains (>500). Please reduce count or TLDs.",
        },
        { status: 400 }
      );
    }

    // Step 2: Check domains
    const checkerConfig: CheckerConfig = {
      tlds: validated.checkerConfig?.tlds,
      timeout_ms: validated.checkerConfig?.timeout_ms ?? 5000,
      concurrency: validated.checkerConfig?.concurrency ?? 5,
      retries: validated.checkerConfig?.retries ?? 1,
      enableHTTP: validated.checkerConfig?.enableHTTP ?? false,
      enableRDAP: validated.checkerConfig?.enableRDAP ?? true,
      stopAfterNAvailable: validated.checkerConfig?.stopAfterNAvailable,
    };

    const checkResults = await checkBatch(generationResult.domains, checkerConfig);

    // Calculate summary
    const summary = {
      total: checkResults.length,
      available: checkResults.filter((r) => r.verdict === "AVAILABLE").length,
      taken: checkResults.filter((r) => r.verdict === "TAKEN").length,
      unknown: checkResults.filter((r) => r.verdict === "UNKNOWN").length,
    };

    return NextResponse.json({
      generation: {
        count: generationResult.count,
        generatedAt: generationResult.generatedAt,
      },
      results: checkResults,
      summary,
      totalTime_ms: checkResults.reduce((sum, r) => sum + r.duration_ms, 0),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
