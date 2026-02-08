# Development Guide

Instructions for local development, testing, and contributing to Domain Finder.

## Prerequisites

- **Node.js**: 18.17+ (LTS recommended)
- **npm**: 9+ or **yarn**: 1.22+
- **Git**: 2.0+
- **Code Editor**: VS Code recommended (with ESLint extension)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/peasea123/domain-finder.git
cd domain-finder
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- Next.js 14 (framework)
- React 18 (UI)
- TypeScript (language)
- Tailwind CSS (styling)
- Zod (validation)
- Jest (testing)

### 3. Run Development Server

```bash
npm run dev
```

Opens http://localhost:3000 in your browser.

### 4. Make Changes

Edit files in `src/`:
- `app/page.tsx` - Main UI
- `lib/generator.ts` - Generation logic
- `lib/checker.ts` - Checking logic
- `components/*.tsx` - UI components

Changes hot-reload automatically.

### 5. Build for Production

```bash
npm run build
npm start
```

Verifies the app builds and runs locally as it would on Vercel.

---

## Project Structure

```
domain-finder/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── api/
│   │   │   ├── generate/route.ts      # Domain generation endpoint
│   │   │   ├── check/route.ts         # Domain checking endpoint
│   │   │   └── run/route.ts           # Full pipeline endpoint
│   │   ├── layout.tsx                 # Root layout wrapper
│   │   ├── page.tsx                   # Main UI page
│   │   └── globals.css                # Global Tailwind CSS
│   ├── components/                    # React components
│   │   ├── GeneratorSettings.tsx      # Generator config UI
│   │   ├── CheckerSettings.tsx        # Checker config UI
│   │   └── ResultsTabs.tsx            # Results table & export
│   └── lib/                           # Business logic
│       ├── generator.ts               # Domain name generation
│       ├── generator.test.ts          # Generator unit tests
│       ├── checker.ts                 # Domain availability checking
│       ├── checker.test.ts            # Checker unit tests
│       ├── schema.ts                  # Zod validation schemas
│       └── export.ts                  # CSV/JSON export utilities
├── docs/                              # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md (this file)
│   ├── CONFIGURATION.md
│   ├── TESTING.md
│   └── TROUBLESHOOTING.md
├── public/                            # Static assets (if any)
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
├── next.config.js                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
├── jest.config.ts                     # Jest testing configuration
├── .eslintrc.json                     # ESLint configuration
├── .gitignore                         # Git ignore rules
├── README.md                          # Main README
└── CONTRIBUTING.md                    # Contribution guidelines
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

Use naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code improvements
- `test/` - Test additions

### 2. Make Changes

Edit code following the existing patterns:

**TypeScript Conventions**
```typescript
// Always use explicit types
interface MyConfig {
  count: number
  pattern: string
}

// Use type exports for public APIs
export type CheckSignal = "dns-found" | "dns-error"

// Use classes for stateful logic
class DomainGenerator {
  private vowels: string
  constructor(seed?: number) { }
  generate(config: GeneratorConfig): string[] { }
}

// Use pure functions for stateless logic
function determineVerdict(signals: CheckSignal[]): Verdict { }
```

**React Component Conventions**
```typescript
// Use functional components with hooks
export function MyComponent({ prop1, prop2 }: Props) {
  const [state, setState] = useState(initialValue)
  
  return (
    <div>Content</div>
  )
}

// Use "use client" for interactive components
"use client"
import React, { useState } from "react"
```

### 3. Run Tests Locally

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- generator.test.ts
```

### 4. Lint and Format

```bash
# Check linting errors
npm run lint

# ESLint will auto-fix many issues
npm run lint -- --fix
```

TypeScript strict mode is enabled; all type errors must be resolved.

### 5. Build Locally

```bash
npm run build
```

This runs the same build that Vercel will run. Catch errors early.

### 6. Commit Changes

```bash
git add src/
git commit -m "feat: Add new feature

Details about the change here.
Fixes #123 (if applicable)
"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Test changes
- `refactor:` - Code improvements
- `perf:` - Performance improvements
- `chore:` - Dependency/config updates

### 7. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub with:
- Clear title
- Description of changes
- Why the change is needed
- Any testing done

---

## Testing

### Unit Tests

Located in `src/lib/*.test.ts` files.

**Running Tests**
```bash
npm test
npm test -- --watch
npm test -- --coverage
```

**Writing Tests**

Example from `generator.test.ts`:
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
  })
})
```

**Test Coverage**
- Generator: Pattern expansion, constraints, seeding
- Checker: Verdict determination, signal evaluation
- Components: (Optional) UI rendering and interactions

### Manual Testing

**Local Development**
```bash
npm run dev
# Open http://localhost:3000
```

Test workflows:
1. Generate domains (try different patterns/constraints)
2. Check availability (verify DNS, RDAP, HTTP checks)
3. Export results (CSV and JSON)
4. Try edge cases:
   - Very large count (500)
   - All forbidden bigrams
   - Seeded generation (verify reproducibility)
   - Network timeouts (disable internet, test fallback)

**Production Build**
```bash
npm run build
npm start
# Open http://localhost:3000
```

Verify the production build works (some features only work in production build).

---

## Common Development Tasks

### Add a New Pattern

1. Edit `src/lib/generator.ts`:
   - Add to `PatternTemplate` type
   - Update `_expandPattern()` method if needed

2. Update `src/components/GeneratorSettings.tsx`:
   - Add button to pattern selector

3. Add test in `src/lib/generator.test.ts`

4. Verify with local testing

### Add a New Checker Signal

1. Edit `src/lib/checker.ts`:
   - Add to `CheckSignal` type
   - Add logic to emit signal in appropriate check function

2. Update verdict logic in `determineVerdict()`

3. Add test in `src/lib/checker.test.ts`

### Fix a Bug

1. Create failing test that reproduces the bug
2. Fix the code to make test pass
3. Verify all tests still pass
4. Test manually

### Improve Performance

1. Profile locally or on Vercel
2. Identify bottleneck (DNS, RDAP, concurrency, etc.)
3. Make targeted optimization
4. Measure improvement
5. Add test to prevent regression

---

## Debugging

### VS Code Debugging

**Setup**
1. Add `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

2. Press F5 or Cmd+Shift+D to start debugging

**Console Logging**
```typescript
// In TypeScript files, use console.log/error/warn
console.log("Debug:", domain, result)

// In browser, use browser DevTools (F12)
// Network tab: See API calls
// Console: See client-side errors
```

### API Route Testing

```bash
# Test /api/generate
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "length": 4, "pattern": "CVCV", "tlds": ["com"]}'

# Test /api/check
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"domains": ["example.com", "test.io"]}'

# Test /api/run
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "generateConfig": {"count": 5, "length": 4, "pattern": "CVCV", "tlds": ["com"]},
    "checkerConfig": {"timeout_ms": 5000}
  }'
```

---

## Environment Variables

Currently **no environment variables required**. All external APIs are public.

(Future: Could add optional env vars for analytics, logging, rate limiting.)

---

## Dependencies

Key dependencies and why they're used:

| Package | Purpose | Version |
|---------|---------|---------|
| next | Framework | ^14.1.0 |
| react | UI library | ^18.3.1 |
| typescript | Language | ^5.3.3 |
| tailwindcss | Styling | ^3.4.1 |
| zod | Input validation | ^3.22.4 |
| jest | Testing | ^29.7.0 |

**Adding Dependencies**
```bash
npm install package-name
npm install --save-dev package-name-dev
```

Then add to `CONTRIBUTING.md` if it's significant.

**Removing Dependencies**
```bash
npm uninstall package-name
```

Ensure no other files import the removed package.

---

## Code Style

**ESLint**: Automatically enforces style rules.

Run before committing:
```bash
npm run lint -- --fix
```

**Type Safety**
- TypeScript `strict: true` is enabled
- All values must have explicit types
- No `any` types allowed (use `unknown` if needed)

**Naming Conventions**
- Variables/functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` (only for true constants)
- Types/Interfaces: `PascalCase`
- File names: `kebab-case` for folders, `PascalCase` for components, `camelCase` for utilities

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process using port 3000
lsof -i :3000           # macOS/Linux
netstat -ano | grep :3000  # Windows

# Or use a different port
npm run dev -- -p 3001
```

### Module Not Found Error

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Type-check without running dev server
npx tsc --noEmit

# Fix obvious issues
npm run lint -- --fix
```

### Test Failures

```bash
# Run single test file with more details
npm test -- generator.test.ts --verbose

# Update snapshots if expected
npm test -- -u
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more.

---

## Tools & Extensions

**VS Code Extensions**
- ESLint
- Prettier (optional, ESLint handles formatting)
- TypeScript Vue Plugin (if adding Vue)
- Thunder Client (for API testing)

**Browser DevTools**
- Chrome DevTools (F12)
  - Network tab: See API calls
  - Console: Client-side errors
  - Elements: DOM inspection

---

## Next Steps

- Read [TESTING.md](./TESTING.md) for comprehensive testing guide
- Check [API.md](./API.md) for endpoint details
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution rules
- View [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues

---

## Getting Help

1. **Documentation**: Check README and docs/
2. **GitHub Issues**: Search existing issues or create new one
3. **Pull Request Review**: Get feedback on your PR
4. **Discussions**: Ask questions in GitHub Discussions (if enabled)

Happy coding! 🚀
