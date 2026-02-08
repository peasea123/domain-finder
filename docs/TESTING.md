# Testing Guide

Comprehensive guide to testing Domain Finder.

## Overview

Testing strategy covers:
- **Unit Tests**: Individual functions (generator, checker)
- **Integration Tests**: API routes (via curl/fetch)
- **Manual Testing**: UI workflows
- **Performance Testing**: Batch sizes and timeouts

---

## Unit Tests

### Running Unit Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run specific test file
npm test -- generator.test.ts

# Run with coverage report
npm test -- --coverage

# Run with verbose output
npm test -- --verbose
```

### Test Files Location

```
src/lib/
├── generator.ts
├── generator.test.ts       # Tests for generator
├── checker.ts
├── checker.test.ts         # Tests for checker
├── schema.ts               # (No tests, validation only)
└── export.ts               # (No tests, utilities only)
```

### Generator Tests (`src/lib/generator.test.ts`)

**Test Cases**

```typescript
describe("Domain Generator", () => {
  describe("Pattern generation", () => {
    it("should generate CVCV pattern names", () => {
      const generator = createGenerator(12345)
      const result = generator.generate({
        count: 10,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
      })
      
      expect(result.domains.length).toBe(10)
      result.domains.forEach((domain) => {
        expect(domain).toMatch(/^[a-z]{4}\.com$/)
      })
    })

    it("should expand patterns correctly for longer lengths", () => {
      // CVCV pattern expanded to length 6 = CVCVCV
      const result = generate({ length: 6, pattern: "CVCV", ... })
      result.domains.forEach((d) => {
        expect(d.split('.')[0]).toHaveLength(6)
      })
    })

    it("should respect constraint allowDoubles = false", () => {
      const result = generate({ allowDoubles: false, ... })
      result.domains.forEach((d) => {
        expect(d).not.toMatch(/([a-z])\1/)  // No "ss", "ll", etc.
      })
    })

    it("should exclude specified letters", () => {
      const result = generate({ excludeLetters: ["q", "x", "z"], ... })
      result.domains.forEach((d) => {
        expect(d.split('.')[0]).not.toMatch(/[qxz]/)
      })
    })

    it("should ban forbidden bigrams", () => {
      const result = generate({ forbiddenBigrams: ["ng", "th"], ... })
      result.domains.forEach((d) => {
        expect(d.split('.')[0]).not.toMatch(/ng|th/)
      })
    })

    it("should apply prefix and suffix", () => {
      const result = generate({ prefix: "my", suffix: "app", ... })
      result.domains.forEach((d) => {
        expect(d.split('.')[0]).toMatch(/^my.*app$/)
      })
    })

    it("should generate unique names when ensureUnique = true", () => {
      const result = generate({ count: 100, ensureUnique: true, ... })
      const unique = new Set(result.domains.map(d => d.split('.')[0]))
      expect(unique.size).toBe(result.domains.length)
    })

    it("should generate multiple TLDs", () => {
      const result = generate({ count: 6, tlds: ["com", "io", "net"], ... })
      const tlds = result.domains.map(d => d.split('.')[1])
      expect(tlds).toEqual(expect.arrayContaining(["com", "io", "net"]))
    })
  })

  describe("Seeded generation", () => {
    it("should produce same domains with same seed", () => {
      const config1 = { count: 10, seed: 42, ... }
      const config2 = { count: 10, seed: 42, ... }
      
      const result1 = generate(config1)
      const result2 = generate(config2)
      
      expect(result1.domains).toEqual(result2.domains)
    })

    it("should produce different domains with different seeds", () => {
      const config1 = { count: 10, seed: 42, ... }
      const config2 = { count: 10, seed: 43, ... }
      
      const result1 = generate(config1)
      const result2 = generate(config2)
      
      expect(result1.domains).not.toEqual(result2.domains)
    })
  })

  describe("Edge cases", () => {
    it("should handle minimum length (3)", () => {
      const result = generate({ length: 3, ... })
      // All domains should be ~3 chars
    })

    it("should handle maximum length (12)", () => {
      const result = generate({ length: 12, ... })
      // All domains should be ~12 chars
    })

    it("should handle count = 1", () => {
      const result = generate({ count: 1, ... })
      expect(result.domains).toHaveLength(1)
    })

    it("should handle large count (1000)", () => {
      const result = generate({ count: 1000, ... })
      expect(result.domains.length).toBeLessThanOrEqual(1000)
    })
  })
})
```

**Running Generator Tests**
```bash
npm test -- generator.test.ts
npm test -- generator.test.ts --watch
npm test -- generator.test.ts --coverage
```

### Checker Tests (`src/lib/checker.test.ts`)

**Test Cases**

```typescript
describe("Domain Checker", () => {
  describe("Verdict determination", () => {
    it("should return TAKEN for dns-found signal", () => {
      const signals: CheckSignal[] = ["dns-found"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("TAKEN")
      expect(verdict.confidence).toBe("HIGH")
    })

    it("should return AVAILABLE when no signals", () => {
      const signals: CheckSignal[] = []
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("AVAILABLE")
    })

    it("should return TAKEN for RDAP registered", () => {
      const signals: CheckSignal[] = ["rdap-registered"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("TAKEN")
      expect(verdict.confidence).toBe("HIGH")
    })

    it("should return AVAILABLE for RDAP available", () => {
      const signals: CheckSignal[] = ["rdap-available"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("AVAILABLE")
      expect(verdict.confidence).toBe("HIGH")
    })

    it("should return UNKNOWN for all timeouts", () => {
      const signals: CheckSignal[] = ["dns-timeout", "rdap-timeout"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("UNKNOWN")
      expect(verdict.confidence).toBe("LOW")
    })

    it("should prioritize RDAP over DNS for .com", () => {
      const signals: CheckSignal[] = ["dns-found", "rdap-available"]
      const verdict = determineVerdict(signals, "com")
      expect(verdict.verdict).toBe("AVAILABLE")  // RDAP is authoritative
    })

    it("should return MEDIUM confidence for DNS-only", () => {
      const signals: CheckSignal[] = ["dns-found"]
      const verdict = determineVerdict(signals, "io")  // Non-.com
      expect(verdict.confidence).toBe("MEDIUM")
    })

    it("should handle mixed signals (DNS found, HTTP not found)", () => {
      const signals: CheckSignal[] = ["dns-found", "http-not-found"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("TAKEN")  // DNS win
    })

    it("should handle HTTP-only signal", () => {
      const signals: CheckSignal[] = ["http-found"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("TAKEN")
    })
  })

  describe("Edge cases", () => {
    it("should handle empty signals array", () => {
      const verdict = determineVerdict([])
      expect(verdict.verdict).toBe("AVAILABLE")
    })

    it("should handle mixed timeouts and responses", () => {
      const signals: CheckSignal[] = ["dns-timeout", "rdap-registered"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("TAKEN")  // RDAP win
    })

    it("should handle all error signals", () => {
      const signals: CheckSignal[] = ["dns-error", "rdap-timeout", "http-timeout"]
      const verdict = determineVerdict(signals)
      expect(verdict.verdict).toBe("UNKNOWN")
    })
  })
})
```

**Running Checker Tests**
```bash
npm test -- checker.test.ts
npm test -- checker.test.ts --watch
```

### Test Coverage

```bash
npm test -- --coverage
```

Output:
```
File        | Statements | Branches | Functions | Lines
------------|-----------|----------|-----------|-------
generator   | 95%       | 88%      | 92%       | 94%
checker     | 91%       | 85%      | 90%       | 90%
------------|-----------|----------|-----------|-------
All files   | 93%       | 86.5%    | 91%       | 92%
```

**Goal**: >90% coverage for critical logic

---

## Integration Tests

### Testing API Routes

#### Test `/api/generate`

```bash
# Generate 10 domains
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "length": 4,
    "pattern": "CVCV",
    "tlds": ["com"]
  }'

# Expected response
{
  "domains": ["bako.com", "dine.com", ...],
  "config": {...},
  "generatedAt": "...",
  "count": 10
}
```

**Test Cases**
```bash
# Valid request → 200 OK
# Invalid count → 400 Bad Request
# Invalid pattern → 400 Bad Request
# Missing required fields → 400 Bad Request
```

#### Test `/api/check`

```bash
# Check domains
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["example.com", "verylongdomainnamethatissurelyavailable123.com"],
    "config": {
      "timeout_ms": 5000,
      "concurrency": 5
    }
  }'

# Expected response
{
  "results": [
    {
      "domain": "example.com",
      "verdict": "TAKEN",
      "confidence": "HIGH",
      "signals": ["dns-found", "rdap-registered"],
      "reasons": [...],
      ...
    },
    {
      "domain": "verylongdomainnamethatissurelyavailable123.com",
      "verdict": "AVAILABLE",
      "confidence": "HIGH",
      ...
    }
  ],
  "summary": {
    "available": 1,
    "taken": 1,
    "unknown": 0
  },
  "totalTime_ms": 3245
}
```

#### Test `/api/run`

```bash
# Full pipeline
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {
      "count": 20,
      "length": 4,
      "pattern": "CVCV",
      "tlds": ["com"]
    },
    "checkerConfig": {
      "timeout_ms": 5000,
      "concurrency": 5
    }
  }'

# Expected: 20 domains generated and checked
```

### Using Postman or Thunder Client

1. Create collection "Domain Finder API"
2. Add requests:
   - POST /api/generate
   - POST /api/check
   - POST /api/run
3. Save as reusable test suite
4. Export for team sharing

### Automated Integration Tests (Advanced)

```typescript
// tests/api.integration.test.ts
describe("API Integration", () => {
  const BASE_URL = "http://localhost:3000"

  it("should generate and check domains", async () => {
    // Generate
    const genRes = await fetch(`${BASE_URL}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        count: 10,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
      }),
    })
    const genData = await genRes.json()
    expect(genRes.status).toBe(200)
    expect(genData.domains.length).toBe(10)

    // Check those domains
    const checkRes = await fetch(`${BASE_URL}/api/check`, {
      method: "POST",
      body: JSON.stringify({
        domains: genData.domains,
      }),
    })
    const checkData = await checkRes.json()
    expect(checkRes.status).toBe(200)
    expect(checkData.results.length).toBe(10)
  })
})
```

---

## Manual Testing

### UI Workflows

#### Workflow 1: Basic Generation + Check

1. Open http://localhost:3000
2. Leave defaults (50 domains, 4 chars, CVCV, com)
3. Click "Generate + Check"
4. Wait for completion
5. Verify:
   - Stats show available/taken/unknown
   - Results table populated
   - Can switch tabs (All, Available, Taken, Unknown)

#### Workflow 2: Custom Generator Settings

1. Set count = 100
2. Set length = 5
3. Select pattern = "CVCVC"
4. Add TLD = "io"
5. Click "Generate + Check"
6. Verify:
   - 100 domains generated
   - All have 5 characters
   - All end with .com or .io

#### Workflow 3: Export Results

1. Generate + Check some domains
2. In Results, click "Download CSV"
3. Verify:
   - File downloads
   - Opens in Excel/Numbers
   - Has columns: domain, verdict, confidence, reason

#### Workflow 4: Search and Filter

1. Generate + Check domains
2. In Results, type "ba" in search box
3. Verify: Only domains containing "ba" show
4. Switch to "Available" tab
5. Verify: Only available domains with "ba" show

#### Workflow 5: Advanced Settings

1. Configure generator:
   - Prefix = "my"
   - Exclude letters = "q, x, z"
   - Allow doubles = false
2. Configure checker:
   - Timeout = 3000ms
   - Concurrency = 10
   - Enable RDAP = true
   - Enable HTTP = false
3. Generate + Check
4. Verify: Works with advanced config

### Error Testing

#### Invalid Configurations

- Count = 0 → Should show error
- Count = 10001 → Should show error
- Length = 2 → Should show error
- Invalid TLD → Should show error

#### Network Issues

- Disable internet → Should show timeout errors
- Slow network → Increase timeout to handle
- API down → Should return UNKNOWN verdicts

---

## Performance Testing

### Load Testing

**Test: Check 500 domains**
```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {"count": 500, ...},
    "checkerConfig": {"timeout_ms": 5000, "concurrency": 10}
  }'
```

**Expectations**
- Complete in <60 seconds
- Memory <128MB
- CPU <75%

### Concurrency Testing

```bash
# Sequential (concurrency: 1)
# Time: ~50s for 50 domains

# Parallel (concurrency: 5)
# Time: ~10s for 50 domains

# Max (concurrency: 50)
# Time: ~5s for 50 domains
# But may hit rate limits
```

### Timeout Testing

```bash
# Short timeout (1000ms)
# More UNKNOWN results

# Long timeout (30000ms)
# More accurate but slower
```

---

## Test Data

### Sample Domains for Testing

```json
"test_domains": [
  "example.com",      // Famous, definitely taken
  "google.com",       // Famous, definitely taken
  "facebook.com",     // Famous, definitely taken
  "verylongdomainnameintentionallyavailable.com",
  "xyzuniquedomain123.com",
  "aaabbbcccdddeeefff.io",
  "test.net"
]
```

### Edge Cases

```typescript
{
  tlds: [],              // Empty TLD list
  count: 0,              // Zero domains
  count: 100000,         // Very large count
  excludeLetters: "abcdefghijklmnopqrstuvwxyz", // All letters excluded
  forbiddenBigrams: [every bigram], // All bigrams forbidden
}
```

---

## Continuous Integration (GitHub Actions)

**Example**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint
      - run: npm run build
```

This runs tests automatically on every push/PR.

---

## Test Standards

- **Coverage**: >90% for critical paths (generator, checker)
- **Performance**: Unit tests <1s each, integration <5s
- **Readability**: Clear test names, good documentation
- **Maintenance**: Update tests when features change

---

## Troubleshooting Tests

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout or reduce batch size in test |
| Flaky tests | Check for race conditions, time-dependent code |
| Import errors | Verify paths in jest.config.ts |
| Network errors | Mock external APIs or use test fixtures |

---

For more information:
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup and running tests
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Debug test failures
