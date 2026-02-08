# Domain Finder

A smart domain name generator and availability checker web app built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**, deployed on **Vercel**.

## Features

✨ **Smart Name Generation**
- Customizable phonetic patterns: CVCV, CVCC, VCVC, CVCVC, CVVC, CCVC (C=Consonant, V=Vowel)
- Configurable length, prefixes, suffixes, and TLDs
- Excluded letters and forbidden bigrams support
- Reproducible generation with seed option
- Perfect for generating pronounceable brand names

🔍 **Multi-Stage Availability Checking**
- **DNS**: Cloudflare DoH JSON API for instant A/AAAA/CNAME/MX record lookup
- **RDAP**: Verisign RDAP for authoritative .com/.net registration data (most reliable)
- **HTTP**: Optional HEAD request to detect live web presence
- Confidence levels: HIGH/MEDIUM/LOW based on check results

⚡ **Fast & Scalable**
- Parallel concurrency control (1-50 concurrent checks)
- Configurable timeouts and retries
- Vercel serverless-friendly chunking (max 500 domains per request)
- Real-time progress and detailed result summaries

📊 **Results Management**
- Tabular results with sorting and filtering (Available/Taken/Unknown)
- Search across results
- Export to CSV and JSON
- Per-domain check reasons and signals
- Confidence indicators

🎨 **Clean UI**
- Modern design with Tailwind CSS
- Responsive layout (settings left/right, results below)
- Form controls for all generator/checker options
- Info boxes explaining how checks work

## How It Works

### Generation Pipeline
1. Configure patterns, length, constraints
2. Generate pronounceable names using phonetic rules
3. Apply prefixes, suffixes, excluded letters, forbidden bigrams
4. Add TLDs (com, io, co, etc.)

### Checking Pipeline (Multi-Stage for High Confidence)

#### Stage 1: DNS (Fastest)
Uses **Cloudflare DoH JSON API**: `https://cloudflare-dns.com/dns-query?name=example.com&type=A`
- Query types: A, AAAA, CNAME, MX
- If Answer records exist → DNS configured → likely TAKEN
- If NXDOMAIN (Status 3) → no DNS → might be AVAILABLE

#### Stage 2: RDAP (Most Authoritative for .com/.net)
Uses **Verisign RDAP**: `https://rdap.verisign.com/com/v1/domain/example.com`
- **200 OK** → Domain registered → TAKEN (HIGH confidence)
- **404** → Domain NOT found in registry → AVAILABLE (HIGH confidence)
- Only for .com/.net (most reliable registries)

#### Stage 3: HTTP (Optional, Supporting Evidence)
HEAD request to `https://domain.tld`
- If resolves → TAKEN (supporting evidence)
- If timeout/error → AVAILABLE (supporting evidence)
- **Note**: Not definitive on its own; used as tiebreaker

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Form Validation**: Zod
- **External APIs**: Cloudflare DoH, Verisign RDAP
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel

## Installation & Local Development

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

### Setup

```bash
# Clone the repo
git clone https://github.com/peasea123/domain-finder.git
cd domain-finder

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development Commands

```bash
# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Watch tests
npm run test:watch

# Lint code
npm run lint
```

## Usage

### Web UI (Recommended)

1. **Configure Generator Settings**
   - Set count (how many domains to generate)
   - Choose name length (3-12 characters)
   - Select pattern template (CVCV, CVCC, etc.)
   - Add TLDs (com, io, co, net, etc.)
   - Optional: prefix, suffix, excluded letters, forbidden bigrams, allow doubles

2. **Configure Checker Settings**
   - Set timeout per check (1-30 seconds)
   - Concurrency limit (1-50 parallel)
   - Enable/disable RDAP (recommended ON for .com/.net)
   - Enable/disable HTTP check (optional, slower)
   - Set retries for failed checks

3. **Click "Generate + Check"**
   - Domains are generated and checked in parallel
   - Real-time statistics (Available/Taken/Unknown)
   - Results table with sorting and filtering

4. **Export Results**
   - Download as CSV (spreadsheet-friendly)
   - Download as JSON (for script processing)

### API Usage

#### Generate Domains

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 50,
    "length": 4,
    "pattern": "CVCV",
    "tlds": ["com", "io"],
    "allowDoubles": false
  }'
```

#### Check Domains

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["example.com", "test.io"],
    "config": {
      "timeout_ms": 5000,
      "concurrency": 5,
      "enableRDAP": true,
      "enableHTTP": false
    }
  }'
```

#### Generate + Check (Full Pipeline)

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {
      "count": 50,
      "length": 4,
      "pattern": "CVCV",
      "tlds": ["com"]
    },
    "checkerConfig": {
      "timeout_ms": 5000,
      "concurrency": 5,
      "enableRDAP": true
    }
  }'
```

## Deployment on Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpeasea123%2Fdomain-finder)

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Notes

- **Serverless Functions**: Configured with 60-second timeout (Vercel Pro plan)
- **API Calls**: All external calls are to public endpoints (Cloudflare, Verisign)
- **No Secrets Required**: No API keys, tokens, or auth headers needed
- **Rate Limiting**: Cloudflare and Verisign may rate-limit if checking excessive domains

### Limits & Recommendations

- **Max Domains per Request**: 500 (enforced by serverless timeout)
- **Recommended Concurrency**: 5-10 (balances speed vs. rate limiting)
- **Timeout per Check**: 5 seconds (Cloudflare + RDAP responsive in <1s typically)
- **Stop-After-N**: Use to find available domains faster without checking all

## Privacy & Security

✅ **Privacy Guarantees**
- No user secrets, keys, or sensitive data required
- Domains are only sent to public DNS, RDAP, and HTTP endpoints
- No tracking, analytics, or storage of results
- All computation happens server-side on your Vercel instance or locally

✅ **Public APIs Used**
- Cloudflare DoH JSON (public, no auth)
- Verisign RDAP (public, no auth)
- Standard HTTPS for all connections

## Testing

Unit tests for generator patterns and checker verdict logic:

```bash
npm test
```

Tests cover:
- Pattern generation (CVCV, CVCC, etc.)
- Constraints (prefixes, suffixes, excluded letters, forbidden bigrams)
- Seeded reproducibility
- Verdict determination from signals (DNS, RDAP, HTTP)
- Confidence level calculation

## Architecture

```
src/
  ├── app/
  │   ├── api/
  │   │   ├── generate/route.ts    # POST /api/generate
  │   │   ├── check/route.ts       # POST /api/check
  │   │   └── run/route.ts         # POST /api/run
  │   ├── layout.tsx
  │   ├── page.tsx                 # Main UI
  │   └── globals.css
  ├── components/
  │   ├── GeneratorSettings.tsx    # Generator config UI
  │   ├── CheckerSettings.tsx      # Checker config UI
  │   └── ResultsTabs.tsx          # Results table & export
  └── lib/
      ├── generator.ts            # Core generation logic
      ├── generator.test.ts
      ├── checker.ts              # Core checker logic
      ├── checker.test.ts
      ├── schema.ts               # Zod validation schemas
      └── export.ts               # CSV/JSON export utilities
```

## Future Enhancements

- [ ] RDAP bootstrap for other TLDs (.io, .co, etc.)
- [ ] Bulk import from CSV/paste
- [ ] Save/load presets for generation & checking configs
- [ ] Advanced filtering: by TLD, by length, by pattern similarity
- [ ] Pricing lookup integration (WHOIS price quotes)
- [ ] Email notifications for findings
- [ ] Database storage of checked domains (optional backend)

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

Contributions welcome! Please open issues or submit PRs on GitHub.

## Support

For issues, questions, or feature requests, open an issue on [GitHub Issues](https://github.com/peasea123/domain-finder/issues).

---

**Built with ❤️ using Next.js 14, TypeScript, Tailwind CSS, and public APIs.**
