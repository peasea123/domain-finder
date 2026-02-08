# Configuration Guide

Configuration options and environment setup for Domain Finder.

## Generator Configuration

Control how domains are generated.

### Basic Settings

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `count` | number | 50 | 1-1000 | Number of domains to generate |
| `length` | number | 4 | 3-12 | Characters per domain (excluding TLD) |
| `pattern` | string | "CVCV" | See patterns | Phonetic pattern for generation |
| `tlds` | string[] | ["com"] | Any | Top-level domains to append |

### Patterns

Six phonetic patterns available:

| Pattern | Example | Use Case |
|---------|---------|----------|
| CVCV | "deco", "kino" | Short, easy to remember |
| CVCC | "bark", "helm" | Ending consonant blend |
| VCVC | "ager", "open" | Starts with vowel |
| CVCVC | "baton", "melon" | 5-letter (often unique) |
| CVVC | "bait", "coal" | Double vowel (distinctive) |
| CCVC | "blue", "grin" | Starting consonant blend |

- **C** = Consonant (b, c, d, f, etc.)
- **V** = Vowel (a, e, i, o, u)

### Constraints

Refine generation with constraints:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | string | (none) | Add to start (e.g., "my", "get") |
| `suffix` | string | (none) | Add to end (e.g., "ly", "hub") |
| `excludeLetters` | string[] | (none) | Skip letters (e.g., ["q", "x", "z"]) |
| `forbiddenBigrams` | string[] | (none) | Ban letter pairs (e.g., ["ng", "th"]) |
| `allowDoubles` | boolean | false | Allow "ss", "ll" (doubles) |
| `ensureUnique` | boolean | true | No duplicate names in output |

### Advanced Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `seed` | number | (random) | For reproducible generation |

**Seeded Generation Example**
```typescript
// Same seed produces same domains every time
const config1 = { count: 10, seed: 42, ... }
const config2 = { count: 10, seed: 42, ... }
// result1.domains === result2.domains ✓
```

Useful for:
- Saved domain lists
- Testing
- Sharing sets with team members

---

## Checker Configuration

Control how domains are verified.

### Basic Settings

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `timeout_ms` | number | 5000 | 1000-30000 | Timeout per domain (milliseconds) |
| `concurrency` | number | 5 | 1-50 | Parallel checks |
| `retries` | number | 1 | 0-3 | Retry failed checks |

### API Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableRDAP` | boolean | true | Use RDAP for .com/.net verification |
| `enableHTTP` | boolean | false | Optional HTTP HEAD check |

**RDAP** (Recommended)
- Authoritative for .com/.net
- More reliable than DNS alone
- Slightly slower (500-800ms typical)

**HTTP** (Optional)
- Detects active websites
- Not reliable for availability (many sites inactive)
- Additional time cost

### Advanced Settings

| Option | Type | Description |
|--------|------|-------------|
| `stopAfterNAvailable` | number | Stop checking after finding N available domains |
| `tlds` | string[] | Filter checks to specific TLDs |

---

## Environment Setup

### Node.js Version

**Recommended**: Node.js 18 LTS or later

Check version:
```bash
node --version
# v18.17.0 or v20.10.0+
```

### npm Configuration

**Global Settings** (optional)

```bash
# Set registry (default is npm public registry)
npm config set registry https://registry.npmjs.org/

# Set auth token (if using private packages)
npm config set //registry.npmjs.org/:_authToken=YOUR_TOKEN

# View all settings
npm config list
```

**Project Settings** (`.npmrc` file)

Create `.npmrc` in project root:
```
legacy-peer-deps=true
engine-strict=false
```

This was needed for our build. Usually not required.

---

## API Configuration

All APIs are public; no configuration needed.

### External APIs Used

| API | Endpoint | Purpose | Timeout |
|-----|----------|---------|---------|
| Cloudflare DoH | `cloudflare-dns.com` | DNS lookups (A, AAAA, CNAME, MX) | 5s |
| Verisign RDAP | `rdap.verisign.com` | .com/.net registration check | 8s |
| HTTP (Direct) | `https://[domain]` | HEAD request to check presence | 5s |

### Rate Limits (Approximate)

- **Cloudflare DoH**: 100+ req/sec per IP
- **Verisign RDAP**: 50+ req/sec per IP
- **Recommended concurrency**: 5-10 (safe from rate limiting)

---

## Vercel Configuration

### Environment Variables (Optional)

Currently, **no env vars required**.

To add optional features later:

1. **Create `.env.local` for local development**
   ```bash
   # Example (don't commit this file)
   NEXT_PUBLIC_ANALYTICS_ID=abc123
   ```

2. **Add to Vercel Dashboard**
   - Project Settings → Environment Variables
   - Set same variables
   - Select environments (Production, Preview, Development)

3. **Use in code**
   ```typescript
   const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID
   ```

   Note: `NEXT_PUBLIC_` prefix exposes to browser (safe for non-secret values)

### Build Configuration

**Next.js** (`next.config.js`)
```typescript
const nextConfig = {
  reactStrictMode: true,
  // Other options
}
module.exports = nextConfig
```

**Tailwind CSS** (`tailwind.config.ts`)
```typescript
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Other options  
}
export default config
```

**TypeScript** (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    // Other options
  }
}
```

### Vercel Project Settings

In Vercel Dashboard → Project Settings:

**General**
- Framework: Next.js
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`

**Domains**
- Add custom domain or use `*.vercel.app`

**Git**
- Repo: GitHub (peasea123/domain-finder)
- Deploy branch: master/main
- Auto-deploy on push: ✓

**Analytics**
- Monitor Web Vitals
- Track API latency

---

## Development Configuration

### TypeScript

**Strict Mode Enabled** (recommended for production)

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

All code must be properly typed.

### ESLint

**Rules** (`.eslintrc.json`)
```json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ]
}
```

Enforces:
- React best practices
- Accessibility (a11y)
- Performance optimizations
- TypeScript correctness

**Run linter**
```bash
npm run lint
npm run lint -- --fix  # Auto-fix
```

### Jest Testing

**Configuration** (`jest.config.ts`)
```typescript
const config: Config = {
  testEnvironment: "node",  // or "jsdom" for browser APIs
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

**Run tests**
```bash
npm test
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage report
```

---

## Performance Tuning

### Generator Performance

| Config | Speed | Memory |
|--------|-------|--------|
| count: 100, length: 4 | Fast (< 10ms) | Low |
| count: 1000, length: 8 | Fast (< 100ms) | Low |
| count: 1000, pattern: "*" | Fast (< 50ms) | Low |

Generator is CPU-bound, not I/O-bound → performant.

### Checker Performance

| Config | Time (50 domains) | Bottleneck |
|--------|------------------|-----------|
| DNS only | 2s | Network |
| DNS + RDAP | 5-8s | Network |
| DNS + RDAP + HTTP | 10-15s | Network |

Network is the main bottleneck. Optimize by:
- Increasing concurrency (5 → 10)
- Reducing timeout (5s → 3s)
- Disabling HTTP (if not needed)

**Vercel Limit**: 60-second timeout (Pro plan)
- Max ~500 domains with full DNS+RDAP+HTTP checks
- More with DNS+RDAP only
- Much more with DNS only

---

## Logging Configuration

### Development

In `npm run dev`, logs appear:
- Terminal: Server logs (API calls, errors)
- Browser Console (F12): Client logs

### Production (Vercel)

View logs:
```bash
vercel logs
vercel logs --follow     # Stream logs
vercel logs --function api/generate
```

Or via Vercel Dashboard:
- Deployments → [Latest] → Logs tab

### Log Levels

Currently using `console.log/error/warn`. For structured logging, consider:
- **Winston**: Popular Node.js logger
- **Pino**: High-performance logger
- **Bunyan**: JSON logging

---

## Caching Configuration

### Browser Caching

Vercel auto-caches:
- Static assets (images, CSS, JS)
- API responses (optional, not enabled by default)

**Enable API caching** (advanced):
```typescript
// In API route
res.setHeader('Cache-Control', 'public, max-age=3600')
```

### Server-Side Caching

Currently not using. Options for future:
- **Redis**: In-memory cache
- **Vercel KV**: Vercel's managed Redis
- **Next.js Cache**: Built-in React cache (advanced)

---

## Monitoring Configuration

### Vercel Analytics

Automatic insights:
- Core Web Vitals
- Page load time
- Function latency
- Error rates

In Dashboard: Project → Analytics

### Custom Monitoring (Optional)

Add error tracking:
```typescript
// Example: Sentry integration
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV,
})
```

---

## Security Configuration

### Secrets Management

**No secrets in code** ✓ (all APIs public)

**If you add secrets later:**

1. **Never commit secrets**
   ```bash
   # Add to .gitignore
   echo ".env.local" >> .gitignore
   ```

2. **Use Vercel for production**
   - Settings → Environment Variables
   - Select "Sensitive" if secret

3. **Use `.env.local` for local dev**
   ```bash
   # Create file (don't commit)
   STRIPE_KEY=sk_test_...
   DATABASE_URL=postgresql://...
   ```

### CORS Configuration

Currently using same-origin only (no CORS issues).

**If you expose API**, configure:
```typescript
// In API route
res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com')
res.setHeader('Access-Control-Allow-Methods', 'POST')
```

### Rate Limiting

**External APIs**: Built-in awareness (timeouts)

**Your API** (optional future):
```typescript
// Middleware to rate limit
const rateLimit = (req, tokens = 100) => {
  // Check request count from user IP
  // Return 429 if exceeded
}
```

---

## Database Configuration (Future)

Currently, **no database required**.

**If you add Postgres/MongoDB later:**

1. **Choose provider**
   - Vercel Postgres: Easiest with Vercel
   - MongoDB Atlas: Popular NoSQL
   - AWS RDS: More control

2. **Connection string as env var**
   ```
   DATABASE_URL=postgresql://...
   ```

3. **Use ORM** (optional)
   - Prisma: TypeScript-first ORM
   - Drizzle: Lightweight ORM
   - SQLAlchemy: Advanced SQL

4. **Migration strategy**
   - Version control migrations
   - Test migrations locally
   - Deploy migrations before code

---

## Dependency Resolution

### Lock File

`package-lock.json` (auto-generated, commit to git)
```bash
# Ensures reproducible installs
npm ci  # Instead of npm install in CI
```

### Peer Dependencies

During `npm install`, you may see peer dependency warnings. These are OK:
```bash
npm install --legacy-peer-deps  # If needed
```

### Security Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with major version bumps
npm audit fix --force
```

---

## Quick Configuration Snippets

### Generate 50 domains, check with strict settings

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {
      "count": 50,
      "length": 4,
      "pattern": "CVCV",
      "tlds": ["com"],
      "allowDoubles": false,
      "excludeLetters": ["q", "x", "z"]
    },
    "checkerConfig": {
      "timeout_ms": 5000,
      "concurrency": 5,
      "enableRDAP": true,
      "enableHTTP": false
    }
  }'
```

### Generate with seed for reproducibility

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 100,
    "length": 5,
    "pattern": "CVCVC",
    "tlds": ["com", "io"],
    "seed": 42
  }'
```

---

## Troubleshooting Configuration Issues

| Issue | Solution |
|-------|----------|
| npm install hangs | `npm cache clean --force`, try `--legacy-peer-deps` |
| TypeScript errors | `npx tsc --noEmit` to see all errors |
| ESLint errors | `npm run lint -- --fix` to auto-fix |
| Build fails | Check `npm run build` locally first |
| API timeout | Reduce batch size or increase timeout |
| Rate limited | Reduce concurrency, wait between batches |

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more.

---

For more details:
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Vercel deployment
- [API.md](./API.md) - Configuration for each endpoint
