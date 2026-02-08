# Architecture

## Overview

Domain Finder is a Next.js 14 web application that generates pronounceable domain names and checks their availability through a multi-stage verification pipeline. It's designed to run on Vercel's serverless infrastructure without requiring API keys or secrets.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / UI                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────────┐
         │   Next.js 14      │
         │   App Router      │
         └───────┬───────┬───┘
                 │       │
        ┌────────┴──┐    └──────────────────────┐
        ▼           ▼                           ▼
   ┌─────────┐  ┌──────────┐        ┌──────────────────┐
   │ Generate│  │  Check   │        │  Run (Generate   │
   │ API     │  │  API     │        │  + Check)        │
   └────┬────┘  └────┬─────┘        └────┬─────────────┘
        │            │                    │
        ▼            ▼                    ▼
   ┌──────────────────────────────────────────────────┐
   │         Generator Module                         │
   │  - Pattern generation (CVCV, CVCC, etc.)        │
   │  - Constraint application                        │
   │  - Seeded RNG for reproducibility               │
   └──────────────────────────────────────────────────┘
        │
        │      ┌──────────────────────────────────────┐
        │      │    Checker Module                    │
        │      │  - DNS (Cloudflare DoH)             │
        │      │  - RDAP (Verisign for .com/.net)    │
        │      │  - HTTP (optional verification)     │
        │      │  - Verdict engine                   │
        │      └────────────────────────────────────┘
        │              │
        └──────┬───────┘
               ▼
      ┌────────────────┐
      │ External APIs  │
      ├────────────────┤
      │ Cloudflare DoH │
      │ Verisign RDAP  │
      │ HTTP (domains) │
      └────────────────┘
```

## Component Architecture

### 1. Frontend Layer (`src/app/page.tsx`)

**Responsibilities:**
- Main UI orchestration
- User input management
- API calls to backend routes  
- Result display and filtering
- State management (generator/checker configs, results)

**State Variables:**
```typescript
- generatorConfig: GenerateRequest
- checkerConfig: CheckerConfig  
- results: CheckResult[]
- isLoading: boolean
- error: string | null
- stats: { available, taken, unknown }
- duration_ms: number
```

**Key Functions:**
- `handleRun()` - POST to `/api/run` with configs
- Re-render results, stats, and duration on completion

### 2. Generator Module (`src/lib/generator.ts`)

**Purpose:** Generate pronounceable domain names with constraints

**Core Types:**
```typescript
type PatternTemplate = "CVCV" | "CVCC" | "VCVC" | "CVCVC" | "CVVC" | "CCVC"

interface GeneratorConfig {
  count: number
  length: number
  pattern: PatternTemplate
  tlds: string[]
  prefix?: string
  suffix?: string
  excludeLetters?: string[]
  forbiddenBigrams?: string[]
  allowDoubles?: boolean
  seed?: number
  ensureUnique?: boolean
}
```

**Algorithm:**
1. Seed RNG if provided (for reproducibility)
2. Define vowel/consonant sets, apply excluded letters
3. For each domain needed:
   - Generate base name by pattern (or repeat pattern to fit length)
   - Apply phonetic rules: vowel/consonant selection per pattern position
   - Check for forbidden bigrams (skip if found)
   - Check for double letters (skip if `allowDoubles` is false)
   - Apply prefix/suffix constraints
   - Generate all TLD combinations
   - Add to set (ensure uniqueness)
4. Return array of generated domains

**Seeded Random:**
Uses linear congruential generator (LCG) for deterministic generation:
```typescript
class SeededRandom {
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}
```

### 3. Checker Module (`src/lib/checker.ts`)

**Purpose:** Verify domain availability through multi-stage checking

**Core Types:**
```typescript
type CheckSignal = 
  | "dns-found" | "dns-timeout" | "dns-error"
  | "rdap-registered" | "rdap-available" | "rdap-timeout"  
  | "http-found" | "http-not-found" | "http-timeout"

type Verdict = "AVAILABLE" | "TAKEN" | "UNKNOWN"
type Confidence = "HIGH" | "MEDIUM" | "LOW"

interface CheckResult {
  domain: string
  verdict: Verdict
  confidence: Confidence
  signals: CheckSignal[]
  reasons: string[]
  ip?: string
  rdapStatus?: string
  dnsRecordFound?: boolean
  httpResolved?: boolean
  timestamp: string
  duration_ms: number
}
```

**Three-Stage Pipeline:**

**Stage 1: DNS Resolution (via Cloudflare DoH)**
- Endpoint: `https://cloudflare-dns.com/dns-query?name=[domain]&type=A`
- Headers: `Accept: application/dns-json`
- Response: `{ Status: number, Answer?: [{type, data}] }`
  - Status 0 (NOERROR) + Answer records → DNS found
  - Status 3 (NXDOMAIN) → DNS not found
  - Otherwise → Error/timeout
- Signal: `dns-found` | `dns-error` | `dns-timeout`

**Stage 2: RDAP Registry Check (Verisign for .com/.net)**
- Endpoint: `https://rdap.verisign.com/[tld]/v1/domain/[domain]`
- Headers: `Accept: application/rdap+json`
- Response: 
  - 200 → Domain registered
  - 404 → Domain not found
  - Timeout → RDAP unavailable
- Signal: `rdap-registered` | `rdap-available` | `rdap-timeout`

**Stage 3: HTTP Presence Check (Optional)**
- Method: HEAD request to `https://[domain]`
- Timeout: Configurable (default 5s)
- Signal: `http-found` | `http-not-found` | `http-timeout`

**Verdict Engine:**
```
For .com/.net (RDAP available):
  - RDAP says registered → TAKEN (HIGH)
  - RDAP says available → AVAILABLE (HIGH)
  - RDAP timeout + DNS found → TAKEN (MEDIUM)
  - RDAP timeout + no DNS → UNKNOWN (LOW)

For other TLDs (heuristic):
  - DNS found → TAKEN (HIGH)
  - No DNS + no timeouts → AVAILABLE (MEDIUM)
  - Timeouts → UNKNOWN (LOW)
```

**Concurrency Control:**
- Uses `Promise.race()` to limit active requests
- Maintains queue of domains to check
- Scales from 1 to 50 concurrent requests
- Each request has independent timeout

### 4. API Routes

#### `POST /api/generate`
- Input: `GenerateRequest` (validated with Zod)
- Output: `GeneratorResult`
- Logic: Instantiate generator, call `generate(config)`, return result
- Error handling: Catch validation/runtime errors, return 400/500

#### `POST /api/check`
- Input: `CheckBatchRequest` with domain array and config
- Output: Results array + summary stats
- Logic: Iterate domains, spawn concurrent checks, collect results
- Concurrency: Controlled by `config.concurrency` (default 5)
- Error handling: Catch fetch/timeout errors per domain, return results

#### `POST /api/run`
- Input: `RunRequest` with generate + checker configs
- Output: Generation metadata + all check results + summary
- Logic: 
  1. Generate domains
  2. Validate domain count (<= 500)
  3. Check all domains with concurrent checks
  4. Return results
- Serverless limit: Enforced 60s timeout with `maxDuration = 60`
- Error handling: Validate configs, catch generation/checking errors

### 5. UI Components

#### `GeneratorSettings.tsx`
- Props: `config: GenerateRequest`, `onChange: (config) => void`
- Controls:
  - Count slider (1-500)
  - Length slider (3-12)
  - Pattern buttons (6 choices)
  - TLDs input (comma-separated)
  - Optional: prefix, suffix, excluded letters, forbidden bigrams
  - Toggles: allow doubles, seed input
- Event handlers: Update parent state on change

#### `CheckerSettings.tsx`
- Props: `config?: CheckerConfig`, `onChange: (config) => void`
- Controls:
  - Timeout slider (1-30s)
  - Concurrency slider (1-50)
  - TLDs input (optional, auto-detect if blank)
  - Retries slider (0-3)
  - Toggles: enableRDAP, enableHTTP
  - Optional: stopAfterNAvailable
- Info box: Explains DNS vs RDAP vs HTTP
- Event handlers: Update parent state on change

#### `ResultsTabs.tsx`
- Props: `results: CheckResult[]`, `isLoading?: boolean`
- Tabs: All, Available, Taken, Unknown
- Controls: Search box, sort dropdown, export buttons
- Table: Domain, Verdict, Confidence, Reason, IP
- Export: CSV (spreadsheet) and JSON (raw data)
- Logic: Filter/sort results based on tab and search term

## Data Flow

```
User Input (Generator Settings)
         ↓
[Generate] Button Click
         ↓
POST /api/generate
         ↓
Generator Module (TypeScript)
         ↓
Array of domains
         ↓
POST /api/check or /api/run
         ↓
Checker Module (DNS → RDAP → HTTP)
         ↓
Array of CheckResult
         ↓
Verdict Engine
         ↓
Results with HIGH/MEDIUM/LOW confidence
         ↓
Display in UI + Export
```

## Security Considerations

1. **No Secrets**: All external APIs are public; no auth headers needed
2. **Input Validation**: Zod schemas validate all API payloads
3. **HTTPS**: All external calls use HTTPS
4. **Rate Limiting**: Respects API timeouts; concurrency prevents abuse
5. **No Storage**: Results not persisted; computed on-demand
6. **CORS**: API routes are same-origin; no CORS issues on Vercel

## Performance Optimizations

1. **Parallel Checking**: 5-50 concurrent domain checks
2. **Fast Fail**: DNS check first (sub-100ms typically)
3. **RDAP Caching**: Browser-level (via Verisign)
4. **Seeded Generation**: Reproducible results without re-querying
5. **Serverless**: Stateless functions scale horizontally on Vercel
6. **Timeouts**: Prevent long-running requests; fast fallback

## Scalability

- **Horizontal**: Vercel auto-scales serverless functions
- **Batch Limits**: Max 500 domains per request (respects 60s timeout)
- **Concurrency**: Configurable per-request (1-50)
- **Rate Limiting**: External APIs may throttle; built in backoff via retries

## Error Handling

| Layer | Error Type | Handling |
|-------|-----------|----------|
| Frontend | Network error | Display error message |
| Frontend | Validation error | Show error toast |
| API Route | Invalid input | 400 Bad Request + Zod error |
| API Route | Generation error | 400 + message |
| API Route | Check error | Per-domain UNKNOWN verdict |
| Checker | DNS timeout | Return `dns-timeout` signal |
| Checker | RDAP timeout | Return `rdap-timeout` signal |
| Checker | HTTP timeout | Return `http-timeout` signal |

## Testing Strategy

- **Unit Tests**: Generator patterns, constraints, verdict logic
- **Integration Tests**: API route contracts
- **Manual Testing**: Local `npm run dev`, Vercel staging deploy

See [TESTING.md](./TESTING.md) for details.

## Future Enhancements

1. **RDAP Bootstrap**: Support other TLDs (.io, .co, .net registry-specific)
2. **Caching**: Redis for frequently checked domains
3. **Job Queue**: Background checks for large batches (100s of domains)
4. **DB Backend**: Persist user preferences, saved batches
5. **TypeScript Types**: Stricter type safety (strict: true in tsconfig)
6. **Analytics**: Track popular patterns, TLDs
7. **Rate Limit Headers**: Respect X-RateLimit headers from external APIs

---

**For more details, see:**
- [API.md](./API.md) - Endpoint reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Vercel deployment
- [CONFIGURATION.md](./CONFIGURATION.md) - Environment & config options
