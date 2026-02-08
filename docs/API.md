# API Reference

Complete reference for Domain Finder REST API endpoints.

## Base URL

**Local Development**
```
http://localhost:3000/api
```

**Production (Vercel)**
```
https://domain-finder.vercel.app/api
```

## Authentication

No authentication required. All endpoints are public.

---

## Endpoints

### 1. Generate Domains

**Endpoint**
```
POST /api/generate
```

**Description**
Generate pronounceable domain names based on patterns and constraints.

**Request Body**
```typescript
{
  count: number          // 1-1000, default 50
  length: number         // 3-12, default 4
  pattern: string        // "CVCV" | "CVCC" | "VCVC" | "CVCVC" | "CVVC" | "CCVC"
  tlds: string[]         // ["com", "io"], default ["com"]
  prefix?: string        // e.g., "br", "loop"
  suffix?: string        // e.g., "ly", "io"
  excludeLetters?: string[]  // ["q", "x", "z"]
  forbiddenBigrams?: string[] // ["ng", "ck", "th"]
  allowDoubles?: boolean // false = no "ss", "ll", etc.
  seed?: number          // For reproducible generation
  ensureUnique?: boolean // true = no duplicate names
}
```

**Request Example**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 50,
    "length": 4,
    "pattern": "CVCV",
    "tlds": ["com", "io"],
    "allowDoubles": false,
    "seed": 12345
  }'
```

**Response (200 OK)**
```json
{
  "domains": [
    "bako.com",
    "bako.io",
    "dine.com",
    "dine.io",
    "fema.com",
    "fema.io"
  ],
  "config": {
    "count": 6,
    "length": 4,
    "pattern": "CVCV",
    "tlds": ["com", "io"],
    "allowDoubles": false,
    "seed": 12345
  },
  "generatedAt": "2026-02-08T21:35:00.000Z",
  "count": 6
}
```

**Error Response (400 Bad Request)**
```json
{
  "error": "count must be <= 1000"
}
```

**Status Codes**
- `200 OK` - Generation successful
- `400 Bad Request` - Invalid input (Zod validation failed)
- `500 Internal Server Error` - Unexpected error

---

### 2. Check Domains

**Endpoint**
```
POST /api/check
```

**Description**
Check domain availability via DNS, RDAP, and optional HTTP.

**Request Body**
```typescript
{
  domains: string[]       // List of domains to check
  config?: {
    tlds?: string[]              // Filter to specific TLDs
    timeout_ms?: number          // Per-check timeout, 1000-30000, default 5000
    concurrency?: number         // Parallel checks, 1-50, default 5
    retries?: number             // Retry failed checks, 0-3, default 1
    enableHTTP?: boolean         // Optional HTTP HEAD check, default false
    enableRDAP?: boolean         // Use RDAP for .com/.net, default true
    stopAfterNAvailable?: number // Stop after finding N available domains
  }
}
```

**Request Example**
```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["example.com", "test.io", "available.com"],
    "config": {
      "timeout_ms": 5000,
      "concurrency": 5,
      "enableRDAP": true,
      "enableHTTP": false
    }
  }'
```

**Response (200 OK)**
```json
{
  "results": [
    {
      "domain": "example.com",
      "verdict": "TAKEN",
      "confidence": "HIGH",
      "signals": ["dns-found", "rdap-registered"],
      "reasons": [
        "DNS A record found",
        "RDAP: Domain registered"
      ],
      "ip": "93.184.216.34",
      "rdapStatus": "registered",
      "dnsRecordFound": true,
      "httpResolved": false,
      "timestamp": "2026-02-08T21:35:01.234Z",
      "duration_ms": 245
    },
    {
      "domain": "test.io",
      "verdict": "TAKEN",
      "confidence": "HIGH",
      "signals": ["dns-found"],
      "reasons": ["DNS A record found"],
      "ip": "34.64.123.45",
      "rdapStatus": null,
      "dnsRecordFound": true,
      "httpResolved": false,
      "timestamp": "2026-02-08T21:35:01.456Z",
      "duration_ms": 180
    },
    {
      "domain": "available.com",
      "verdict": "AVAILABLE",
      "confidence": "HIGH",
      "signals": ["dns-error", "rdap-available"],
      "reasons": [
        "DNS lookup failed (NXDOMAIN or error)",
        "RDAP: Domain not found (available)"
      ],
      "ip": null,
      "rdapStatus": "available",
      "dnsRecordFound": false,
      "httpResolved": false,
      "timestamp": "2026-02-08T21:35:01.678Z",
      "duration_ms": 523
    }
  ],
  "summary": {
    "available": 1,
    "taken": 2,
    "unknown": 0
  },
  "totalTime_ms": 948
}
```

**Response Fields**

**CheckResult Fields**
- `domain` - The domain checked
- `verdict` - "AVAILABLE" | "TAKEN" | "UNKNOWN"
- `confidence` - "HIGH" | "MEDIUM" | "LOW"
- `signals` - Array of check signals that contributed to verdict
- `reasons` - Human-readable strings explaining the signals
- `ip` - IP address if DNS resolved
- `rdapStatus` - "registered" | "available" | null
- `dnsRecordFound` - Whether DNS A record exists
- `httpResolved` - Whether HTTP HEAD succeeded
- `timestamp` - ISO timestamp when check completed
- `duration_ms` - How long the check took

**Error Response (400 Bad Request)**
```json
{
  "error": "domains must contain at least 1 item"
}
```

**Status Codes**
- `200 OK` - Checks completed (may include UNKNOWN verdicts)
- `400 Bad Request` - Invalid input
- `500 Internal Server Error` - Unexpected error

---

### 3. Generate + Check (Full Pipeline)

**Endpoint**
```
POST /api/run
```

**Description**
Generate domains and immediately check their availability in a single request.

**Request Body**
```typescript
{
  generateConfig: {
    count: number
    length: number
    pattern: string
    tlds: string[]
    prefix?: string
    suffix?: string
    excludeLetters?: string[]
    forbiddenBigrams?: string[]
    allowDoubles?: boolean
    seed?: number
    ensureUnique?: boolean
  },
  checkerConfig?: {
    tlds?: string[]
    timeout_ms?: number
    concurrency?: number
    retries?: number
    enableHTTP?: boolean
    enableRDAP?: boolean
    stopAfterNAvailable?: number
  }
}
```

**Request Example**
```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {
      "count": 20,
      "length": 4,
      "pattern": "CVCV",
      "tlds": ["com"],
      "allowDoubles": false
    },
    "checkerConfig": {
      "timeout_ms": 5000,
      "concurrency": 5,
      "enableRDAP": true,
      "enableHTTP": false
    }
  }'
```

**Response (200 OK)**
```json
{
  "generation": {
    "count": 20,
    "generatedAt": "2026-02-08T21:35:00.000Z"
  },
  "results": [
    {
      "domain": "bako.com",
      "verdict": "AVAILABLE",
      "confidence": "HIGH",
      "signals": ["dns-error", "rdap-available"],
      "reasons": [
        "DNS lookup failed (NXDOMAIN or error)",
        "RDAP: Domain not found (available)"
      ],
      "ip": null,
      "rdapStatus": "available",
      "dnsRecordFound": false,
      "httpResolved": false,
      "timestamp": "2026-02-08T21:35:01.234Z",
      "duration_ms": 342
    },
    {
      "domain": "dine.com",
      "verdict": "TAKEN",
      "confidence": "HIGH",
      "signals": ["dns-found", "rdap-registered"],
      "reasons": [
        "DNS A record found",
        "RDAP: Domain registered"
      ],
      "ip": "1.2.3.4",
      "rdapStatus": "registered",
      "dnsRecordFound": true,
      "httpResolved": false,
      "timestamp": "2026-02-08T21:35:01.523Z",
      "duration_ms": 287
    }
  ],
  "summary": {
    "total": 20,
    "available": 3,
    "taken": 16,
    "unknown": 1
  },
  "totalTime_ms": 5420
}
```

**Error Response**
```json
{
  "error": "Generated too many domains (>500). Please reduce count or TLDs."
}
```

**Limits**
- Max 500 total domains (enforced for serverless timeouts)
- Max 60 second request timeout (Vercel Pro Plan)

**Status Codes**
- `200 OK` - Generation and checks completed
- `400 Bad Request` - Invalid config or too many domains
- `500 Internal Server Error` - Unexpected error

---

## Signal Types

Used in check results to explain verdict.

```typescript
type CheckSignal =
  | "dns-found"      // A record resolved successfully
  | "dns-error"      // DNS lookup failed (NXDOMAIN, error, etc.)
  | "dns-timeout"    // DNS query timed out
  | "rdap-registered"// RDAP returned 200 (domain registered)
  | "rdap-available" // RDAP returned 404 (domain available)
  | "rdap-timeout"   // RDAP query timed out
  | "http-found"     // HTTP HEAD returned 2xx/3xx
  | "http-not-found" // HTTP HEAD failed or ENOTFOUND
  | "http-timeout"   // HTTP request timed out
```

---

## Verdict Logic

### For .com/.net Domains

| Scenario | Verdict | Confidence | Reason |
|----------|---------|------------|--------|
| RDAP: Registered | TAKEN | HIGH | Authoritative registry data |
| RDAP: Not Found | AVAILABLE | HIGH | Authoritative registry data |
| RDAP Timeout + DNS Found | TAKEN | MEDIUM | DNS found, no RDAP contradiction |
| RDAP Timeout + DNS Not Found | UNKNOWN | LOW | Cannot determine definitively |

### For Other TLDs

| Scenario | Verdict | Confidence |
|----------|---------|------------|
| DNS found | TAKEN | HIGH |
| DNS not found + no timeouts | AVAILABLE | MEDIUM |
| Timeouts | UNKNOWN | LOW |

---

## Rate Limiting

**External API Limits**
- Cloudflare DoH: ~100 queries/sec per IP
- Verisign RDAP: ~50 queries/sec per IP
- No rate limit headers returned; implement backoff if throttled

**Recommended Usage**
- Concurrency: 5-10 (balance speed vs rate limits)
- Timeout: 5000ms (typical response <1s)
- Batch size: 100-500 domains per request
- Wait: 1-2 seconds between large batches if needed

---

## Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Validation failed | Missing required field, value out of range |
| 400 | Too many domains | Generated >500 domains for single request |
| 500 | Internal server error | Unexpected runtime exception |
| 504 | Gateway timeout | Request exceeded 60s limit (Vercel) |

---

## Examples

### Generate 100 4-letter domains, check with RDAP

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {
      "count": 100,
      "length": 4,
      "pattern": "CVCV",
      "tlds": ["com"],
      "allowDoubles": false,
      "excludeLetters": ["q", "x", "z"]
    },
    "checkerConfig": {
      "concurrency": 10,
      "timeout_ms": 5000,
      "enableRDAP": true
    }
  }'
```

### Generate with seed for reproducibility

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 20,
    "length": 5,
    "pattern": "CVCVC",
    "tlds": ["com", "io"],
    "seed": 42
  }'
```

Same seed produces same domains every time (useful for saved batches).

### Check specific list of domains

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["mycompany.com", "mycompany.io", "mycompany.co"],
    "config": {
      "enableRDAP": true,
      "enableHTTP": true,
      "concurrency": 3
    }
  }'
```

---

## Response Schema (TypeScript)

```typescript
// Generate endpoint
interface GeneratorResult {
  domains: string[]
  config: GeneratorConfig
  generatedAt: string // ISO timestamp
  count: number
}

// Check endpoint
interface CheckResponse {
  results: CheckResult[]
  summary: {
    available: number
    taken: number
    unknown: number
  }
  totalTime_ms: number
}

interface CheckResult {
  domain: string
  verdict: "AVAILABLE" | "TAKEN" | "UNKNOWN"
  confidence: "HIGH" | "MEDIUM" | "LOW"
  signals: CheckSignal[]
  reasons: string[]
  ip?: string
  rdapStatus?: "registered" | "available" | null
  dnsRecordFound: boolean
  httpResolved: boolean
  timestamp: string // ISO timestamp
  duration_ms: number
}

// Run endpoint
interface RunResponse {
  generation: {
    count: number
    generatedAt: string
  }
  results: CheckResult[]
  summary: {
    total: number
    available: number
    taken: number
    unknown: number
  }
  totalTime_ms: number
}
```

---

For more details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
