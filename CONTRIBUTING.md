# Contributing to Domain Finder

Thank you for your interest in contributing! This guide explains how to contribute code, documentation, and feedback.

## Code of Conduct

- Be respectful and inclusive
- No harassment, discrimination, or abusive language
- Assume good intent
- Help others learn

## Getting Started

### 1. Fork the Repository

```bash
# Go to https://github.com/peasea123/domain-finder
# Click "Fork" button
```

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/domain-finder.git
cd domain-finder
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/peasea123/domain-finder.git
```

### 4. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

Use descriptive names:
- `feature/add-whois-checking`
- `fix/generator-pattern-bug`
- `docs/api-reference`
- `test/add-checker-tests`

## Development Workflow

### Setup Environment

```bash
npm install
npm run dev
```

Opens http://localhost:3000

### Make Changes

Follow code style:
- TypeScript strict mode
- ESLint rules
- Clear naming conventions
- Comments for complex logic

### Test Locally

```bash
npm test              # Run tests
npm run lint          # Check linting
npm run build         # Build for production
```

All must pass before pushing.

### Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add RDAP support for .io domains
^--^  ^----------------------------------
|     |
|     +---> Description in imperative mood
|
+-------> Type: feat, fix, docs, test, refactor, perf, chore
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Test addition/fix
- `refactor:` - Code cleanup
- `perf:` - Performance improvement
- `chore:` - Dependency/config update

**Examples:**
```bash
git commit -m "feat: Add HTTP checker for domain presence"
git commit -m "fix: Resolve RDAP timeout on .net domains"
git commit -m "docs: Add API error codes reference"
git commit -m "test: Add coverage for verdict determination"
```

### Push to Your Fork

```bash
git push origin feature/my-feature
```

### Create Pull Request

1. Go to https://github.com/peasea123/domain-finder
2. Click "New Pull Request"
3. Select your branch
4. Fill in description:
   - What does this change?
   - Why is it needed?
   - How was it tested?

**Template:**
```markdown
## Description
Brief explanation of the changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Performance improvement
- [ ] Other (please describe)

## Related Issue
Fixes #123

## Testing
Describe what you tested:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] No breaking changes

## Checklist
- [ ] Code follows ESLint rules
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Commit messages follow conventional commits
- [ ] No console errors/warnings
```

## Types of Contributions

### Bug Reports

Found a bug? Open an issue:

```markdown
**Describe the bug**
A clear description of what happened

**Reproduce**
Steps to reproduce:
1. Click "Generate + Check"
2. Wait for results
3. See UNKNOWN for all domains

**Expected**
Should show AVAILABLE and TAKEN

**Actual**
Shows UNKNOWN for all

**Environment**
- Node: 18.17.0
- OS: macOS 13
- Browser: Chrome 120

**Error Message**
```
[paste error here]
```
```

### Feature Requests

Want a new feature? Open an issue:

```markdown
**Summary**
Brief description

**Use Case**
Why is this needed? Who would benefit?

**Proposed Solution**
How should this work?

**Alternatives**
Other approaches considered?

**Context**
Any additional information?
```

### Code Contributions

#### Adding a New Feature

1. **Create issue** for discussion first
2. **Create branch** `feature/description`
3. **Implement feature**
   - Add TypeScript types
   - Add unit tests
   - Update documentation
   - Add example usage
4. **Test thoroughly**
   ```bash
   npm test
   npm run lint
   npm run build
   ```
5. **Document changes**
   - Update [API.md](./docs/API.md) if needed
   - Update [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
   - Update README examples
6. **Create PR** with clear description

#### Fixing a Bug

1. **Create issue** if one doesn't exist
2. **Create branch** `fix/description`
3. **Write failing test** that reproduces bug
   ```typescript
   it("should handle _____ case", () => {
     expect(buggyFunction()).toBe(expectedValue)
   })
   ```
4. **Fix the bug**
5. **Verify test passes**
6. **Create PR** referencing issue

#### Adding Tests

```bash
# Find low coverage areas
npm test -- --coverage

# Add tests for crucial logic:
# - Generator patterns
# - Verdict determination
# - API validation
```

Example:
```typescript
describe("New Feature", () => {
  it("should do X when given Y", () => {
    const result = newFeature({ input: "Y" })
    expect(result).toBe("expected")
  })

  it("should handle edge case", () => {
    expect(() => newFeature({})).toThrow()
  })
})
```

#### Updating Documentation

1. **Edit .md file** in `/docs/` or root
2. **Check formatting**
   ```bash
   # Markdown should be valid
   # Links should work
   # Code blocks properly formatted
   ```
3. **Test locally** (if docs have code examples)
4. **Create PR** with `docs:` prefix

### Documentation Contributions

Update [README.md](./README.md), [DEVELOPMENT.md](./docs/DEVELOPMENT.md), etc.

**Good documentation:**
- ✅ Clear and concise
- ✅ Includes examples
- ✅ Links to related docs
- ✅ Formatted properly
- ✅ Up-to-date

**Before submitting:**
- [ ] Spell-checked
- [ ] Grammar checked
- [ ] Code examples tested
- [ ] Links verified

### Dependency Updates

Keep dependencies current:

```bash
npm outdated
npm update
npm audit fix
```

**For major version bumps:**
- Test thoroughly
- Update code if needed
- Document breaking changes
- Create PR with `chore:` prefix

## Code Style Guide

### TypeScript

```typescript
// Use explicit types
interface Config {
  count: number
  tlds: string[]
}

// Export types publicly
export type Verdict = "AVAILABLE" | "TAKEN" | "UNKNOWN"

// Use classes for stateful logic
class Generator {
  private state: State
  public generate(config: Config): string[] { }
}

// Use functions for pure logic
function determineVerdict(signals: Signal[]): Verdict { }

// No `any` types
const x: any = value  // ❌
const x: unknown = value  // ✅
```

### React Components

```typescript
// Use functional components
export function ComponentName({ prop }: Props) {
  const [state, setState] = useState(initial)
  return <div>JSX</div>
}

// Use "use client" for interactive components
"use client"

// Type your props
interface Props {
  count: number
  onChange: (count: number) => void
}
```

### File Organization

```
src/
├── app/                      # Next.js routes
├── components/               # React components (reusable)
├── lib/                      # Business logic (generator, checker)
│   ├── generator.ts
│   ├── generator.test.ts
│   └── checker.ts
└── types.ts                  # Shared types (optional)
```

### Naming

- Variables/functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`
- Files: `kebab-case` for components, `camelCase` for utils

### Comments

```typescript
// Use for "why", not "what"
// The following is needed because DNS can timeout on slow networks
const timeoutMs = 5000  // ✅

const x = 5000  // timeout in ms  ❌ Obvious from variable name
```

## Testing Requirements

All PRs must include:
- ✅ Unit tests for business logic
- ✅ All tests passing
- ✅ No decrease in coverage
- ✅ Manual testing in browser

```bash
npm test              # All pass?
npm run lint          # No errors?
npm run build         # Successful?
```

## Documentation Requirements

Update docs if your changes affect:
- [ ] API endpoints? → Update [docs/API.md](./docs/API.md)
- [ ] Configuration? → Update [docs/CONFIGURATION.md](./docs/CONFIGURATION.md)
- [ ] Architecture? → Update [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [ ] Deployment? → Update [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- [ ] Development? → Update [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## Review Process

1. **Automated Checks**
   - GitHub Actions runs tests
   - ESLint checks
   - TypeScript validation
   - Build verification

2. **Manual Review**
   - Code review by maintainers
   - Feedback on style/logic
   - Suggestions for improvement

3. **Approval & Merge**
   - 1 approval required
   - All checks passing
   - No merge conflicts
   - PR merged to master

## After Your PR is Merged

- ✨ Your code is now in main branch
- 🚀 Will deploy to Vercel on next release
- 📢 You'll be credited in CHANGELOG
- 🎉 Thank you for contributing!

## Release Process

Releases happen periodically:

1. **Version bump** (semantic versioning)
   - v1.0.0 → v1.0.1 (patch: bugfix)
   - v1.0.0 → v1.1.0 (minor: feature)
   - v1.0.0 → v2.0.0 (major: breaking change)

2. **Create release** on GitHub
3. **Deploy to Vercel** (auto on push to master)
4. **Announce** major updates

## Recognition

We value all contributions! Contributors will be:
- Added to [CONTRIBUTORS.md](./CONTRIBUTORS.md) (when created)
- Mentioned in release notes
- Thanked in README

## Community

- **Discussions**: Share ideas
- **Issues**: Report bugs, request features
- **Pull Requests**: Contribute code
- **Feedback**: Help us improve

## Legal

By contributing, you agree:
- Your contribution is your own original work
- You grant us permission to use it
- Code follows the project's LICENSE ([MIT](./LICENSE))

## Questions?

- Check [FAQ section of README](./README.md#faq)
- Search existing [GitHub Issues](https://github.com/peasea123/domain-finder/issues)
- Open new issue with question tag
- Email maintainers (if contact provided)

## Helpful Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)

---

Thank you for making Domain Finder better! 🚀
