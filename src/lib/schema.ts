import { z } from "zod";

// Generator request schema
export const GenerateRequestSchema = z.object({
  count: z.number().int().min(1).max(1000).default(50),
  length: z.number().int().min(3).max(12).default(4),
  pattern: z
    .enum(["CVCV", "CVCC", "VCVC", "CVCVC", "CVVC", "CCVC"])
    .default("CVCV"),
  tlds: z.array(z.string()).min(1).default(["com"]),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  excludeLetters: z.array(z.string()).optional(),
  forbiddenBigrams: z.array(z.string()).optional(),
  allowDoubles: z.boolean().default(false),
  seed: z.number().optional(),
  ensureUnique: z.boolean().default(true),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// Checker request schema
export const CheckerConfigSchema = z.object({
  tlds: z.array(z.string()).optional(),
  timeout_ms: z.number().int().min(1000).max(30000).default(5000),
  concurrency: z.number().int().min(1).max(50).default(5),
  retries: z.number().int().min(0).max(3).default(1),
  enableHTTP: z.boolean().default(false),
  enableRDAP: z.boolean().default(true),
  stopAfterNAvailable: z.number().int().optional(),
});

export type CheckerConfig = z.infer<typeof CheckerConfigSchema>;

// Check batch request schema
export const CheckBatchRequestSchema = z.object({
  domains: z.array(z.string()).min(1).max(500),
  config: CheckerConfigSchema.optional(),
});

export type CheckBatchRequest = z.infer<typeof CheckBatchRequestSchema>;

// Run request schema (generate + check in one call)
export const RunRequestSchema = z.object({
  generateConfig: GenerateRequestSchema,
  checkerConfig: CheckerConfigSchema.optional(),
});

export type RunRequest = z.infer<typeof RunRequestSchema>;

// Smart generator request schema
export const SmartGenerateRequestSchema = z.object({
  targetLen: z.number().int().min(3).max(12).default(5),
  count: z.number().int().min(1).max(500).default(50),
  tlds: z.array(z.string()).min(1).default(["com"]),
  style: z
    .enum(["balanced", "punchy", "flowing", "technical"])
    .default("balanced"),
  seed: z.number().optional(),
  scored: z.boolean().default(true),
});

export type SmartGenerateRequest = z.infer<typeof SmartGenerateRequestSchema>;

// Smart run request schema (smart generate + check in one call)
export const SmartRunRequestSchema = z.object({
  generateConfig: SmartGenerateRequestSchema,
  checkerConfig: CheckerConfigSchema.optional(),
});

export type SmartRunRequest = z.infer<typeof SmartRunRequestSchema>;
