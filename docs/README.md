# Documentation Index

Complete guide to Domain Finder documentation. Use this to find what you need.

## Quick Navigation

### For Everyone
- 📖 [README.md](../README.md) - Project overview, quick start, features
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy to Vercel in minutes

### For Users
- 🔧 [CONFIGURATION.md](./CONFIGURATION.md) - Customize generator and checker settings
- 📡 [API.md](./API.md) - REST API reference with examples
- 🐛 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Solutions to common problems

### For Developers
- 💻 [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development setup
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and components
- ✅ [TESTING.md](./TESTING.md) - Writing and running tests

### For Contributors
- 🤝 [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute code and docs
- 📝 [CHANGELOG.md](../CHANGELOG.md) - Version history and changes

---

## By Use Case

### I want to...

#### Deploy Domain Finder
1. Read [README Quick Start](../README.md#quick-start)
2. Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Done! 🎉

#### Use the API
1. Check [API.md Endpoints](./API.md#endpoints)
2. Copy curl examples
3. See [CONFIGURATION.md](./CONFIGURATION.md) for advanced options

#### Set up locally
1. Follow [DEVELOPMENT.md Setup](./DEVELOPMENT.md#quick-start)
2. Run `npm run dev`
3. Open http://localhost:3000

#### Understand the code
1. Read [ARCHITECTURE.md Overview](./ARCHITECTURE.md#overview)
2. Browse component descriptions
3. Check relevant source files

#### Fix an issue
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for similar issues
2. If not found, open GitHub issue with details

#### Contribute code
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Follow development workflow
3. Create pull request

#### Configure generation/checking
1. Read [CONFIGURATION.md Generator](./CONFIGURATION.md#generator-configuration)
2. Read [CONFIGURATION.md Checker](./CONFIGURATION.md#checker-configuration)
3. Update settings in UI or API calls

---

## Documentation Files

### Root Level

| File | Purpose | Audience |
|------|---------|----------|
| [README.md](../README.md) | Project overview, features, quick start | Everyone |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute | Contributors |
| [CHANGELOG.md](../CHANGELOG.md) | Version history | Everyone |
| [LICENSE](../LICENSE) | MIT license | Legal |

### `/docs/` Folder

| File | Purpose | Read Time |
|------|---------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, component overview | 15 min |
| [API.md](./API.md) | REST API reference | 10 min |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local setup and development | 15 min |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deployment guide | 20 min |
| [CONFIGURATION.md](./CONFIGURATION.md) | Configuration options | 15 min |
| [TESTING.md](./TESTING.md) | Testing strategies | 20 min |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions | Reference |

---

## Common Questions

### How do I deploy this?
→ [DEPLOYMENT.md](./DEPLOYMENT.md) - One-click or manual deploy to Vercel

### How do I use the API?
→ [API.md Endpoint Reference](./API.md#endpoints) - Complete with curl examples

### How do I set up locally?
→ [DEVELOPMENT.md Quick Start](./DEVELOPMENT.md#quick-start) - 5 minutes

### What are the configuration options?
→ [CONFIGURATION.md](./CONFIGURATION.md) - All generator and checker settings

### How do I test my changes?
→ [TESTING.md](./TESTING.md) - Unit, integration, and manual testing

### How do I fix [error]?
→ [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Search by error message or symptom

### How do I contribute?
→ [CONTRIBUTING.md](../CONTRIBUTING.md) - Full workflow with examples

### What changed in the latest version?
→ [CHANGELOG.md](../CHANGELOG.md) - All releases and updates

---

## Architecture Overview

```
Domain Finder = Generator + Checker + UI

Generator
  ├── Patterns (CVCV, CVCC, VCVC, CVCVC, CVVC, CCVC)
  ├── Constraints (prefix, suffix, excludeLetters, forbiddenBigrams)
  ├── Seeded RNG (reproducibility)
  └── Multiple TLDs support

Checker
  ├── DNS via Cloudflare DoH
  ├── RDAP via Verisign (for .com/.net)
  ├── HTTP (optional)
  └── Verdict Engine (AVAILABLE/TAKEN/UNKNOWN)

UI (React + TypeScript + Tailwind)
  ├── Generator Settings Panel
  ├── Checker Settings Panel
  ├── Results Table with Export
  └── Stats Display

API Routes
  ├── POST /api/generate
  ├── POST /api/check
  └── POST /api/run

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams.
```

---

## Technology Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel (serverless)
- **External APIs**: Cloudflare DoH, Verisign RDAP

See [ARCHITECTURE.md Technology](./ARCHITECTURE.md) for details.

---

## Development Workflow

```
1. Read DEVELOPMENT.md
2. npm install
3. npm run dev
4. Make changes
5. npm test (ensure tests pass)
6. npm run lint (ensure ESLint passes)
7. npm run build (ensure build succeeds)
8. git commit (follow conventional commits)
9. git push (create PR)
10. Review by maintainers
11. Merge to master (auto-deploys to Vercel)
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full workflow.

---

## Key Concepts

### Check Signals
What each check finds about a domain.
- `dns-found` - DNS resolves to IP
- `dns-error` - DNS lookup failed
- `rdap-registered` - RDAP says registered
- `rdap-available` - RDAP says available
- `http-found` - HTTP response successful

See [API.md Signal Types](./API.md#signal-types) for all.

### Verdict Logic
How signals combine to create verdicts.
- **AVAILABLE**: Domain free to register
- **TAKEN**: Domain already registered
- **UNKNOWN**: Cannot determine (timeouts, errors)

See [ARCHITECTURE.md Verdict Engine](./ARCHITECTURE.md#3-checker-module) for rules.

### Patterns
Phonetic patterns for generation.
- **CVCV**: "deco", "kino" (short, easy)
- **CVCC**: "bark", "helm" (consonant ending)
- **VCVC**: "ager", "open" (starts with vowel)
- **CVCVC**: "baton", "melon" (5-letter)
- **CVVC**: "bait", "coal" (double vowel)
- **CCVC**: "blue", "grin" (consonant blend)

See [CONFIGURATION.md Patterns](./CONFIGURATION.md#patterns) for examples.

---

## Getting Help

### If you have a question
1. Check relevant documentation (linked above)
2. Search [GitHub Issues](https://github.com/peasea123/domain-finder/issues)
3. Open new issue with question

### If you found a bug
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Open GitHub issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (Node version, OS, etc.)
   - Error message/screenshot

### If you want to suggest a feature
1. Check existing [GitHub Issues](https://github.com/peasea123/domain-finder/issues)
2. Open issue describing:
   - What feature you want
   - Why you need it
   - How it would work

### If you want to contribute
Read [CONTRIBUTING.md](../CONTRIBUTING.md) first!

---

## Documentation Standards

This documentation follows these standards:
- ✅ Clear and concise language
- ✅ Practical examples for each topic
- ✅ Links to related documentation
- ✅ Code syntax highlighting
- ✅ Table of contents for long documents
- ✅ Indexed and searchable

---

## Learning Path

**Complete beginner?**
1. [README.md](../README.md) - What is Domain Finder?
2. [DEPLOYMENT.md](./DEPLOYMENT.md) - Try it live
3. Play with UI at https://domain-finder.vercel.app

**Want to use the API?**
1. [API.md Endpoints](./API.md#endpoints) - Learn the endpoints
2. [API.md Examples](./API.md#examples) - Try curl examples
3. [CONFIGURATION.md](./CONFIGURATION.md) - Tune parameters

**Want to develop locally?**
1. [DEVELOPMENT.md](./DEVELOPMENT.md) - Set up environment
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the code
3. [TESTING.md](./TESTING.md) - Write tests

**Want to contribute?**
1. [CONTRIBUTING.md](../CONTRIBUTING.md) - Learn the process
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Set up locally
3. [TESTING.md](./TESTING.md) - Ensure quality

---

## Search by Topic

### Configuration
- [CONFIGURATION.md](./CONFIGURATION.md) - All configuration options
- [API.md Request Body](./API.md#request-body) - API payload structure
- [DEVELOPMENT.md Environment](./DEVELOPMENT.md#environment-variables) - Environment setup

### APIs & Integration
- [API.md](./API.md) - Complete REST API reference
- [ARCHITECTURE.md Data Flow](./ARCHITECTURE.md#data-flow) - How data flows through system
- [DEPLOYMENT.md Custom Domains](./DEPLOYMENT.md#custom-domain) - Custom domain setup

### Performance
- [CONFIGURATION.md Performance Tuning](./CONFIGURATION.md#performance-tuning) - Optimize speed
- [ARCHITECTURE.md Performance Optimizations](./ARCHITECTURE.md#performance-optimizations) - System optimizations
- [TROUBLESHOOTING.md Performance Issues](./TROUBLESHOOTING.md#performance-issues) - Debug slowness

### Security
- [ARCHITECTURE.md Security](./ARCHITECTURE.md#security-considerations) - Security measures
- [DEPLOYMENT.md Security](./DEPLOYMENT.md#security-best-practices) - Production security

### Testing
- [TESTING.md](./TESTING.md) - Complete testing guide
- [DEVELOPMENT.md Testing](./DEVELOPMENT.md#testing) - Testing during development
- [CONTRIBUTING.md Testing Requirements](../CONTRIBUTING.md#testing-requirements) - PR requirements

### Deployment
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Vercel deployment (main guide)
- [README.md Deployment](../README.md#deployment) - Quick deployment steps

### Troubleshooting
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Comprehensive troubleshooting guide
- [DEVELOPMENT.md Debugging](./DEVELOPMENT.md#debugging) - Debug during development

---

## Document Version

Last Updated: February 8, 2026

For the latest version, visit:
https://github.com/peasea123/domain-finder/blob/master/docs/

---

**Start here**: [README.md](../README.md) for quick overview, then jump to specific docs for your needs.
