import { NextRequest, NextResponse } from "next/server";
import { generateAllCombinations } from "@/lib/generator";
import { checkDomain, CheckResult } from "@/lib/checker";

// Vercel hobby plan max: 300s (5 minutes)
// Pro plan allows 900s (15 minutes)
// For long batch checks, use CLI script instead
export const maxDuration = 300;

interface BatchCheckRequest {
  pattern: "CVCV" | "CVCC" | "VCVC" | "CVCVC" | "CVVC" | "CCVC";
  length: number;
  tlds: string[];
  config: {
    timeout_ms: number;
    enableRDAP: boolean;
    enableHTTP: boolean;
  };
}

export async function POST(request: NextRequest) {
  const body: BatchCheckRequest = await request.json();

  // Validate input
  if (!body.pattern || !body.length || !body.tlds || body.tlds.length === 0) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // Create a ReadableStream for streaming responses
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Generate all combinations
        const combinations = generateAllCombinations(body.pattern as any);

        if (combinations.length === 0) {
          controller.enqueue(`{"error": "No combinations generated"}\n`);
          controller.close();
          return;
        }

        let checked = 0;
        const encoder = new TextEncoder();

        // Check each combination with each TLD
        for (const combo of combinations) {
          for (const tld of body.tlds) {
            const domain = `${combo}.${tld}`;

            try {
              // Check domain with provided config
              const result = await checkDomain(domain, {
                timeout_ms: body.config.timeout_ms,
                enableRDAP: body.config.enableRDAP,
                enableHTTP: body.config.enableHTTP,
              });

              // Send result as JSON line
              const json = JSON.stringify(result);
              controller.enqueue(encoder.encode(json + "\n"));

              checked++;

              // Add rate limiting (40 req/sec = 25ms per request)
              if (checked % 50 === 0) {
                // Every 50 requests, sleep for 1.5 seconds
                await new Promise((resolve) => setTimeout(resolve, 1500));
              } else {
                // Sleep 25ms between requests
                await new Promise((resolve) => setTimeout(resolve, 25));
              }
            } catch (err) {
              // Send error result
              const errorResult: CheckResult = {
                domain,
                verdict: "UNKNOWN",
                confidence: "LOW",
                signals: [],
                reasons: [err instanceof Error ? err.message : "Unknown error"],
                timestamp: new Date().toISOString(),
                duration_ms: 0,
              };
              const json = JSON.stringify(errorResult);
              controller.enqueue(encoder.encode(json + "\n"));
            }
          }
        }

        // Send completion signal
        const completion = { status: "complete", checked };
        controller.enqueue(encoder.encode(JSON.stringify(completion) + "\n"));

        controller.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify({ error: errorMsg }) + "\n")
        );
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
