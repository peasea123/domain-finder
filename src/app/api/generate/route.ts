import { NextRequest, NextResponse } from "next/server";
import { generateDomains, GeneratorConfig } from "@/lib/generator";
import { GenerateRequestSchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GenerateRequestSchema.parse(body);

    const config: GeneratorConfig = {
      count: validated.count,
      length: validated.length,
      pattern: validated.pattern,
      tlds: validated.tlds,
      prefix: validated.prefix,
      suffix: validated.suffix,
      excludeLetters: validated.excludeLetters,
      forbiddenBigrams: validated.forbiddenBigrams,
      allowDoubles: validated.allowDoubles,
      seed: validated.seed,
      ensureUnique: validated.ensureUnique,
    };

    const result = await generateDomains(config);

    return NextResponse.json(result);
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
