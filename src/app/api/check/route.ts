import { NextRequest, NextResponse } from "next/server";
import { checkBatch, CheckerConfig } from "@/lib/checker";
import { CheckBatchRequestSchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CheckBatchRequestSchema.parse(body);

    const config: CheckerConfig = {
      tlds: validated.config?.tlds,
      timeout_ms: validated.config?.timeout_ms ?? 5000,
      concurrency: validated.config?.concurrency ?? 5,
      retries: validated.config?.retries ?? 1,
      enableHTTP: validated.config?.enableHTTP ?? false,
      enableRDAP: validated.config?.enableRDAP ?? true,
      stopAfterNAvailable: validated.config?.stopAfterNAvailable,
    };

    const results = await checkBatch(validated.domains, config);

    // Calculate summary
    const summary = {
      available: results.filter((r) => r.verdict === "AVAILABLE").length,
      taken: results.filter((r) => r.verdict === "TAKEN").length,
      unknown: results.filter((r) => r.verdict === "UNKNOWN").length,
    };

    return NextResponse.json({
      results,
      summary,
      totalTime_ms: results.reduce((sum, r) => sum + r.duration_ms, 0),
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
