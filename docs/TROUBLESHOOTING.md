# Troubleshooting

Solutions for common issues with Domain Finder.

## Installation & Setup

### Issue: `npm install` hangs or takes forever

**Symptoms**
- Terminal appears stuck
- No output for several minutes
- Eventually times out or fails

**Solutions**

1. **Clear npm cache**
   ```bash
   npm cache clean --force
   npm install
   ```

2. **Use slower but more reliable install**
   ```bash
   npm install --verbose
   ```

3. **Use legacy peer deps** (if you have complex dependencies)
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Check internet connection**
   ```bash
   ping registry.npmjs.org
   ```

5. **Try yarn instead**
   ```bash
   yarn install
   ```

---

### Issue: `npm install` fails with error

**Symptoms**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions**

```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps

# Or force resolution
npm install --force

# Or use different Node version
nvm install 18
nvm use 18
```

---

### Issue: Port 3000 already in use

**Symptoms**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions**

**Windows (PowerShell)**
```powershell
# Find process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# Kill it
Stop-Process -Id <PID> -Force

# Or use different port
npm run dev -- -p 3001
```

**macOS/Linux**
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

---

## Development & Build

### Issue: TypeScript errors on build

**Symptoms**
```
Type 'xyz' is not assignable to type 'abc'
```

**Solutions**

1. **Check type errors**
   ```bash
   npx tsc --noEmit
   ```

2. **Fix common issues**
   ```typescript
   // ❌ Bad: implicit any
   const x = someFunction()
   
   // ✅ Good: explicit type
   const x: ReturnType<typeof someFunction> = someFunction()
   ```

3. **Verify tsconfig.json**
   ```bash
   # Should have "strict": true
   cat tsconfig.json | grep strict
   ```

4. **Use type assertions carefully**
   ```typescript
   // Last resort if type system is wrong
   const x = someValue as string
   ```

---

### Issue: ESLint errors on build

**Symptoms**
```
✗ ESLint: Parsing error: Unexpected token <
```

**Solutions**

1. **Auto-fix most issues**
   ```bash
   npm run lint -- --fix
   ```

2. **Fix common React errors**
   ```typescript
   // ❌ Unescaped quotes in JSX
   <div>It's broken</div>
   
   // ✅ Escape quotes
   <div>It&apos;s fixed</div>
   ```

3. **Fix unused imports**
   ```typescript
   // Remove unused imports
   import { unusedFunction } from 'lib'  // ❌ Delete this
   ```

4. **Check .eslintrc.json**
   ```bash
   cat .eslintrc.json
   ```

---

### Issue: Build fails with CSS error

**Symptoms**
```
error: Unexpected token '{' in CSS parser
```

**Solutions**

1. **Verify postcss.config.js**
   ```javascript
   // Should be plain JS, not TypeScript
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```

2. **Verify tailwind.config.ts**
   ```typescript
   const config: Config = {
     content: ["./src/**/*.{js,ts,jsx,tsx}"],
     theme: {},
     plugins: [],
   }
   export default config
   ```

3. **Clear cache**
   ```bash
   rm -rf .next
   npm run build
   ```

---

### Issue: `npm run build` fails

**Symptoms**
```
✗ Failed to compile
```

**Solutions**

1. **Check exact error**
   ```bash
   npm run build 2>&1 | tail -50
   ```

2. **Try clean build**
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

3. **Test locally first**
   ```bash
   npm run dev
   # Open http://localhost:3000
   # Check console for errors
   ```

4. **Check for circular imports**
   ```bash
   # generator.ts ← → checker.ts (BAD)
   # Use separate schema.ts for shared types
   ```

---

## Runtime & API Issues

### Issue: API returns 400 Bad Request

**Symptoms**
```json
{
  "error": "count must be <= 1000"
}
```

**Solutions**

1. **Check request format**
   ```bash
   # Verify JSON is valid
   curl -X POST http://localhost:3000/api/generate \
     -H "Content-Type: application/json" \
     -d '{"count": 50, "length": 4, "pattern": "CVCV", "tlds": ["com"]}'
   ```

2. **Check validation rules**
   See [CONFIGURATION.md](./CONFIGURATION.md) for valid ranges

3. **Verify Zod schema** (`src/lib/schema.ts`)
   - count: 1-1000
   - length: 3-12
   - pattern: one of 6 values
   - tlds: non-empty array

---

### Issue: Domain generation is slow

**Symptoms**
- Takes >5 seconds to generate 50 domains
- High CPU usage

**Solutions**

1. **Check constraints**
   ```typescript
   // ❌ Too many constraints slows generation
   {
     excludeLetters: "aeiou", // Most vowels excluded
     forbiddenBigrams: [...],  // Many bigrams forbidden
   }
   
   // ✅ Use fewer constraints or single TLD
   {
     excludeLetters: ["q", "x", "z"],
     tlds: ["com"],
   }
   ```

2. **Reduce count**
   ```bash
   # Instead of 1000 at once
   # Try 100 at a time
   ```

3. **Check system resources**
   ```bash
   # On macOS/Linux
   top
   # On Windows
   Get-Process | Sort -Property WS -Descending | Select -First 5
   ```

---

### Issue: Checker returns UNKNOWN for all domains

**Symptoms**
```json
{
  "verdict": "UNKNOWN",
  "confidence": "LOW",
  "signals": ["dns-timeout", "rdap-timeout", "http-timeout"]
}
```

**Solutions**

1. **Check internet connection**
   ```bash
   ping cloudflare-dns.com
   ping rdap.verisign.com
   ```

2. **Increase timeout**
   ```bash
   # Try 10000ms instead of 5000ms
   {
     "config": {
       "timeout_ms": 10000
     }
   }
   ```

3. **Disable external APIs**
   ```bash
   # Try DNS-only
   {
     "config": {
       "enableRDAP": false,
       "enableHTTP": false
     }
   }
   ```

4. **Check if APIs are down**
   - Cloudflare: https://www.cloudflare-status.com
   - Verisign: Check their status page

---

### Issue: Rate limiting (too many requests)

**Symptoms**
```
ECONNREFUSED or timeouts when checking many domains
```

**Solutions**

1. **Reduce concurrency**
   ```bash
   # Instead of 20, use 5
   {
     "config": {
       "concurrency": 5
     }
   }
   ```

2. **Add delays between batches**
   ```bash
   # Check 50 domains
   # Wait 2 seconds
   # Check next 50
   ```

3. **Reduce batch size**
   ```bash
   # Instead of 500 at once, try 100
   ```

4. **Monitor rate limit headers**
   ```bash
   curl -v https://cloudflare-dns.com/dns-query?name=example.com
   # Look for X-RateLimit-* headers
   ```

---

### Issue: Checker returns wrong verdict

**Symptoms**
```json
{
  "domain": "example.com",
  "verdict": "AVAILABLE",  // Should be "TAKEN"
  "signals": ["dns-error"]
}
```

**Solutions**

1. **Check individual DNS**
   ```bash
   # Test DNS directly
   curl "https://cloudflare-dns.com/dns-query?name=example.com&type=A"
   ```

2. **Check RDAP** (for .com/.net)
   ```bash
   # Test RDAP directly
   curl https://rdap.verisign.com/com/v1/domain/example.com
   ```

3. **Check verdict logic** (`src/lib/checker.ts`)
   - For .com/.net: RDAP should be authoritative
   - For others: DNS + HTTP heuristic
   - Timeouts cause UNKNOWN

4. **Enable all check types**
   ```bash
   {
     "config": {
       "enableRDAP": true,
       "enableHTTP": true
     }
   }
   ```

---

## Deployment Issues

### Issue: Vercel build fails

**Symptoms**
```
Build failed
```

**Solutions**

1. **Check Vercel logs**
   ```bash
   vercel logs
   # or via Vercel Dashboard → Deployments → Logs
   ```

2. **Build locally first**
   ```bash
   npm run build
   # Fix any errors locally before pushing
   ```

3. **Common Vercel issues**

   | Error | Fix |
   |-------|-----|
   | TypeScript error | npm run build locally to see error |
   | ESLint error | npm run lint --fix |
   | Missing dependency | package.json not committed |
   | Node version | Specify in package.json: "engines": {"node": "18"} |

4. **Check Node version**
   ```bash
   # In package.json
   {
     "engines": {
       "node": "18.17",
       "npm": "9"
     }
   }
   ```

---

### Issue: Vercel deployment timeout

**Symptoms**
```
Function execution timeout in X seconds
```

**Solutions**

1. **Check domain count**
   - Max 500 domains per request (enforced by code)
   - Reduces to safe limits for 60s timeout

2. **Reduce checker timeout**
   ```bash
   {
     "checkerConfig": {
       "timeout_ms": 3000  // Instead of 5000
     }
   }
   ```

3. **Reduce concurrency**
   ```bash
   {
     "checkerConfig": {
       "concurrency": 5  // Instead of 10
     }
   }
   ```

4. **Optimize API calls**
   - Disable HTTP check if not needed
   - Disable RDAP for non-.com/.net TLDs

---

### Issue: API route returns 502 Bad Gateway

**Symptoms**
```
502 Bad Gateway
```

**Solutions**

1. **Check Vercel status**
   - https://www.vercel-status.com

2. **Redeploy**
   ```bash
   git push  # Auto-deploys
   # or
   vercel --prod
   ```

3. **Check logs**
   ```bash
   vercel logs --follow
   ```

4. **Check for infinite loops**
   - Avoid recursion without base case
   - Check Promise chains

---

## Performance Issues

### Issue: Slow domain checking

**Symptoms**
- 50 domains take >30s to check
- Expected <10s

**Solutions**

1. **Increase concurrency**
   ```bash
   {
     "config": {
       "concurrency": 20  // Instead of 5
     }
   }
   ```

2. **Reduce timeout**
   ```bash
   {
     "config": {
       "timeout_ms": 3000  // Instead of 5000
     }
   }
   ```

3. **Disable slow checks**
   ```bash
   {
     "config": {
       "enableHTTP": false,  # Slowest
       "enableRDAP": true    # Fast for .com/.net
     }
   }
   ```

4. **Check network**
   ```bash
   # Test latency to external APIs
   time curl https://cloudflare-dns.com/dns-query?name=example.com
   ```

---

### Issue: High memory usage

**Symptoms**
- Process uses >500MB RAM
- System slows down

**Solutions**

1. **Reduce batch size**
   ```bash
   # Instead of 1000 domains
   # Check 100 at a time
   ```

2. **Disable detailed results**
   - Only store essential fields

3. **Stream responses**
   - Return results as they complete (not bulk)

4. **Check for memory leaks**
   ```bash
   # Monitor with
   node --inspect=9229 (app)
   # Open chrome://inspect
   ```

---

## Data & Export Issues

### Issue: CSV export is corrupted

**Symptoms**
- CSV fails to open in Excel
- Special characters mangled

**Solutions**

1. **Check encoding**
   - Should be UTF-8
   - Excel expects BOM (byte order mark) for Unicode

2. **Escape special characters**
   ```typescript
   // Quote fields with commas or quotes
   const escaped = field.includes(',') ? `"${field}"` : field
   ```

3. **Use proper CSV library**
   ```typescript
   // Basic implementation may not handle edge cases
   // Consider using 'papaparse' or 'csv-stringify'
   ```

---

### Issue: JSON export incomplete

**Symptoms**
- Some fields missing
- Unexpected object structure

**Solutions**

1. **Check schema** (`src/lib/schema.ts`)
   - Verify all required fields present

2. **Verify serialization**
   ```typescript
   const json = JSON.stringify(results, null, 2)
   // Should nest properly
   ```

3. **Check for circular references**
   ```typescript
   // Don't include self-references
   if (key === 'self') return undefined
   ```

---

## Browser Issues

### Issue: UI not loading

**Symptoms**
- Blank page
- Console errors

**Solutions**

1. **Open browser console** (F12 or Cmd+Option+I)
   - Check for error messages
   - Look for network failures

2. **Clear cache**
   - F12 → Application → Clear storage
   - Or Cmd+Shift+Delete

3. **Check JavaScript**
   ```bash
   # Verify build was successful
   npm run build
   npm start
   # Open http://localhost:3000
   ```

---

### Issue: Results not showing

**Symptoms**
- Page loads
- Click "Generate + Check"
- Nothing appears

**Solutions**

1. **Check browser console for errors**
   - F12 → Console tab
   - Look for fetch/network errors

2. **Check network tab**
   - F12 → Network tab
   - Did POST to /api/run complete?
   - What was the response?

3. **Verify API is working**
   ```bash
   curl -X POST http://localhost:3000/api/generate \
     -H "Content-Type: application/json" \
     -d '{"count": 5, "length": 4, "pattern": "CVCV", "tlds": ["com"]}'
   ```

4. **Check JavaScript errors**
   - Look for unhandled Promise rejections
   - Check state management (useState)

---

### Issue: Buttons not responding

**Symptoms**
- Click button, nothing happens
- No error in console

**Solutions**

1. **Check React strict mode**
   - Effect might be running twice
   - Check for side effects

2. **Verify event handlers**
   ```typescript
   // ❌ Missing handler
   <button>Click me</button>
   
   // ✅ Proper handler
   <button onClick={handleClick}>Click me</button>
   ```

3. **Check for disabled state**
   ```typescript
   // Is button disabled?
   <button disabled={isLoading}>Click me</button>
   ```

---

## Git & GitHub Issues

### Issue: Git push rejected

**Symptoms**
```
fatal: 'origin' does not appear to be a 'git' repository
```

**Solutions**

```bash
# Add remote
git remote add origin https://github.com/peasea123/domain-finder.git

# Or check existing
git remote -v

# Push
git push -u origin master
```

---

### Issue: Merge conflicts

**Symptoms**
```
CONFLICT (content merge): src/app/page.tsx
```

**Solutions**

```bash
# View conflicts
git status
git diff

# Edit file to resolve conflicts
# Look for <<<<<<< and >>>>>>>

# Mark as resolved
git add src/app/page.tsx
git commit -m "Resolve merge conflict"
```

---

## Getting Help

1. **Check documentation**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
   - [API.md](./API.md) - Endpoint reference
   - [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup
   - [CONFIGURATION.md](./CONFIGURATION.md) - Configuration

2. **Search GitHub Issues**
   - https://github.com/peasea123/domain-finder/issues

3. **Ask on GitHub Discussions** (if enabled)
   - Provide:
     - Steps to reproduce
     - Error message
     - Environment (Node version, OS, etc.)

4. **Check external resources**
   - Next.js Docs: https://nextjs.org/docs
   - Vercel Docs: https://vercel.com/docs
   - TypeScript Handbook: https://www.typescriptlang.org/docs

---

## Report a Bug

Create a GitHub issue with:

```markdown
## Description
Brief description of bug

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Steps to Reproduce
1. Do this
2. Then this
3. See error

## Environment
- Node: 18.17.0
- npm: 9.0.0
- OS: macOS 13
- Browser: Chrome 120

## Error Message
```
<paste full error>
```

## Additional Context
Screenshots, logs, etc.
```

---

## Performance Troubleshooting Checklist

- [ ] Check internet connection speed
- [ ] Verify external API status (Cloudflare, Verisign)
- [ ] Adjust concurrency (5-20 is optimal)
- [ ] Adjust timeout (3000-10000ms depending on network)
- [ ] Reduce batch size for large checks
- [ ] Monitor CPU/memory during execution
- [ ] Check browser DevTools (F12) for client-side slowness
- [ ] Profile with Node --inspect for server-side slowness

---

## Quick Debug Checklist

- [ ] `npm install` successfully?
- [ ] `npm test` passing?
- [ ] `npm run build` successful?
- [ ] `npm run lint` no errors?
- [ ] `npm run dev` starts on port 3000?
- [ ] Can access http://localhost:3000?
- [ ] Can generate domains?
- [ ] Can check domains?
- [ ] Can export results?

If all checks pass, the issue is likely environment-specific or external API related.
