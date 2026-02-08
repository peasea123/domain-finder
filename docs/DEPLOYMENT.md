# Deployment Guide

Complete instructions for deploying Domain Finder to production on Vercel.

## Prerequisites

- GitHub account with Domain Finder repository
- Vercel account (free tier sufficient)
- Node.js 18+ and npm locally (for testing before deploy)

## One-Click Deploy (Recommended)

### Option 1: Deploy Button

Click the Vercel Deploy Button in your repository:

```
🔗 https://vercel.com/new/clone?repository-url=https://github.com/peasea123/domain-finder
```

This will:
1. Create a fork on your GitHub
2. Create a new Vercel project
3. Deploy automatically
4. Provide a live URL

### Option 2: Manual Vercel Connect

1. **Create Vercel Account**
   - Go to https://vercel.com/signup
   - Sign up with GitHub

2. **Import Project**
   - Go to https://vercel.com/new
   - Select "Import Git Repository"
   - Paste: `https://github.com/peasea123/domain-finder`
   - Click "Import"

3. **Configure Project**
   - Framework: Next.js (auto-detected)
   - Root Directory: ./ (default)
   - Build Command: `next build` (default)
   - Output Directory: `.next` (default)
   - Environment Variables: None required
   - Click "Deploy"

4. **Wait for Build**
   - Vercel will build and deploy
   - You'll get a live URL (e.g., `https://domain-finder-xyz.vercel.app`)

---

## Manual CLI Deployment

If you prefer command-line deployment:

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

Opens browser to authenticate with GitHub.

### 3. Deploy

```bash
# Deploy to staging (preview)
vercel

# Deploy to production
vercel --prod
```

### 4. Configure (if first time)

Vercel will prompt:
```
? Set up and deploy "~/domain-finder"? [Y/n] y
? Which scope should contain your project? [Your Name]
? Link to existing project? [y/N] N
? What's your project's name? domain-finder
? In which directory is your code? ./
? Want to modify these settings? [y/N] N
```

### 5. View Live

```bash
vercel list
# Shows all your deployments with URLs
```

---

## Environment Configuration

### Environment Variables (Optional)

Currently, **no environment variables are required** to run Domain Finder.

All external APIs (Cloudflare DoH, Verisign RDAP) are public and require no authentication.

**Future optional variables** (for enhancements):
```
NEXT_PUBLIC_ANALYTICS_ID=          # Future: Analytics tracking
RATE_LIMIT_ENABLED=true            # Future: Enable rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100 # Future: Rate limit threshold
```

To add environment variables in Vercel:
1. Go to Project Settings → Environment Variables
2. Add variable name and value
3. Select which environments (Production, Preview, Development)
4. Click "Save"
5. Redeploy project

---

## Project Settings

### Vercel Project Configuration

Once deployed, configure in Vercel dashboard:

**Settings → General**
- Framework: Next.js
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`

**Settings → Domains**
- Add custom domain (e.g., `domain-finder.yourdomain.com`)
- Follow Vercel's DNS configuration

**Settings → Git**
- Connected GitHub repository
- Deploy on commit to `main`/`master` branch
- Auto-deploy Preview Deployments for PRs

**Settings → Limits**
- Function timeout: 60 seconds (Pro plan)
- Memory: 3GB
- Note: 500 domain limit enforced by code (not Vercel limit)

### Automatic Deployments

By default, Vercel deploys:
- **Production**: When you push to main/master branch
- **Preview**: When you create a Pull Request
- **Staging**: When you run `vercel` (without `--prod`)

This means:
1. Make changes locally
2. Push to GitHub
3. Vercel automatically builds and deploys
4. Get live URL instantly

---

## Performance Optimization

### Build Optimization

Vercel automatically optimizes for production:
- Minifies JavaScript and CSS
- Tree-shakes unused code
- Compiles TypeScript to optimized JavaScript
- Caches static assets

### Runtime Performance

The app is designed for fast execution:
- API routes respond in <1s typical
- DNS check: <500ms
- RDAP check: <800ms
- HTTP check: <1s
- Total batch of 50 domains: 5-10 seconds

**Monitoring Performance**
1. Go to Project → Analytics
2. View Real User Monitoring (RUM)
3. Check Core Web Vitals
4. Monitor API response times

### Serverless Function Limits

- **Max Duration**: 60 seconds (Pro) / 10 seconds (Hobby)
- **Max Memory**: 3GB
- **Max Payload**: 5MB
- **Code Limit**: 250MB uncompressed

Domain Finder respects these:
- Enforces 500 domain max per request
- Streams responses (no large payloads)
- Completes in <60s for typical usage

---

## Scaling & Rate Limiting

### Vercel Auto-Scaling

Vercel automatically scales serverless functions:
- Spins up new instances for concurrent requests
- Scales down when idle
- No manual configuration needed
- You only pay for execution time

### Rate Limiting

**External API Rate Limits**
- Cloudflare DoH: ~100 req/sec per IP
- Verisign RDAP: ~50 req/sec per IP

**Recommendations**
- Keep concurrency at 5-10 (default 5)
- Batch domains in groups of 100-500
- Wait 1-2 seconds between large batches if needed

**Implementing Rate Limiting** (optional future)
```javascript
// In API route
const RATE_LIMIT = 100 // requests per minute
// Track using Redis or in-memory store
// Return 429 Too Many Requests if exceeded
```

---

## Monitoring & Logging

### Vercel Analytics

In Vercel Dashboard:

**Deployments → Analytics**
- Page load times
- API endpoint latency
- Error rates
- Lighthouse scores

**Function Analytics**
- API route execution times
- Cold starts
- Memory usage
- Errors

### Logs

**View Real-Time Logs**
```bash
vercel logs
```

**View Logs in Dashboard**
1. Go to Project → Deployments
2. Click latest deployment
3. View "Logs" tab

### Error Tracking (Optional)

Integrate with error tracking service:
- Sentry
- LogRocket
- NewRelic
- DataDog

---

## Rollbacks & Versions

### Deployed Versions

All your deployments are kept:

```bash
vercel list
# Shows all deployments with URLs and timestamps
```

### Rollback to Previous Version

**Via CLI**
```bash
vercel list
# Find the deployment URL/ID you want
vercel rollback <deployment-id>
```

**Via Dashboard**
1. Go to Deployments tab
2. Click the deployment to restore
3. Click "Use as Production"

### View Previous URLs

Every deployment gets a unique URL:
- Production: `https://domain-finder.vercel.app`
- Preview: `https://domain-finder-git-feature-xyz.vercel.app`
- Staging: `https://domain-finder-staging-abc.vercel.app`

---

## Database / Persistence (Future)

Currently, Domain Finder **does not persist data**. All results are computed on-demand.

**If you add a database later:**

1. **Choose database provider**
   - Vercel Postgres (recommended)
   - MongoDB Atlas
   - AWS DynamoDB
   - Firebase Firestore

2. **Add connection string as environment variable**
   ```
   DATABASE_URL=postgresql://...
   ```

3. **Update API routes to read/write database**

4. **Deploy to Vercel**
   - Vercel handles database connections in serverless functions
   - Connection pooling managed by provider

---

## Custom Domain

### Add Custom Domain

1. **In Vercel Dashboard**
   - Go to Settings → Domains
   - Enter domain name (e.g., `domain-finder.mycompany.com`)
   - Click "Add"

2. **Update DNS**
   - In your domain registrar, add CNAME record:
     ```
     Name: domain-finder
     Type: CNAME
     Value: cname.vercel-dns.com
     ```
   - Or follow Vercel's specific DNS instructions

3. **Wait for DNS Propagation**
   - Usually 5-10 minutes
   - Check with: `nslookup domain-finder.mycompany.com`

4. **Enable SSL/TLS**
   - Vercel auto-provisions certificate
   - Automatic renewal

---

## SSL/TLS Certificate

Vercel automatically:
- Provisions free SSL/TLS certificate (Let's Encrypt)
- Renews automatically before expiration
- Enables HTTPS by default
- Redirects HTTP to HTTPS

No action needed on your part.

---

## Backup & Data Retention

Since Domain Finder doesn't store persistent data:
- No backups needed
- Results are computed on-demand
- User preferences stored only in browser (localStorage)

**If you add database**, implement:
- Daily backups (provider-dependent)
- Point-in-time recovery
- Disaster recovery plan

---

## Troubleshooting Deployment

### Build Failures

**Check build logs**
```bash
vercel logs --follow
```

**Common issues**
- TypeScript errors: Fix with `npm run build` locally first
- Missing dependencies: Ensure all imports are in package.json
- Environment variables: Add missing vars in Vercel dashboard

### Runtime Errors

**Check function logs**
1. Deploy → Click latest deployment → Logs tab
2. Or use: `vercel logs --function api/generate`

**Common issues**
- Module not found: Ensure path aliases are correct
- Network errors: Check external API endpoints (Cloudflare, Verisign)
- Timeout: Reduce batch size or concurrency

### Cold Starts

Vercel warms functions automatically. First request takes longer:
- Average: 500ms-1s
- Subsequent: 50-100ms

**Reduce cold start impact**
- Keep bundle small (currently ~92KB)
- Avoid heavy libraries
- Use Web APIs where possible

---

## Cost Estimation

**Vercel Pricing** (as of Feb 2026)

| Plan | Price | Features |
|------|-------|----------|
| Hobby | Free | 100 GB bandwidth/month, 12 serverless function invocations/second |
| Pro | $20/month | Unlimited bandwidth, 100 invocations/second, custom domains |
| Enterprise | Custom | SLA, dedicated support, etc. |

**For Domain Finder**
- Free tier sufficient for small usage (<1000 checks/month)
- Pro tier for production usage
- Function executions: $0.50 per 1M function invocations

**Estimate for 1000 domains checked**
- Execution time: ~500ms average
- Cost: ~$0.0005 (very cheap)
- Bandwidth: Minimal (JSON responses)

---

## Security Best Practices

✅ **Already implemented**
- HTTPS/TLS default
- No secrets in code
- Input validation (Zod)
- Rate limiting awareness
- Stateless functions (no file system)

✅ **Best practices to follow**
- Don't commit `.env` files
- Rotate custom domain SSL certs annually (automatic)
- Monitor error logs for attacks
- Update dependencies regularly: `npm audit`

---

## Updates & Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all to latest minor/patch
npm update

# Update to latest major version (may break)
npm install next@latest
```

Then:
1. Run `npm test` to verify
2. Commit: `git commit -am "chore: update dependencies"`
3. Push to GitHub (auto-deploys on Vercel)

### Security Updates

```bash
# Check for security vulnerabilities
npm audit

# Auto-fix where possible
npm audit fix
```

### Monitor Vercel Platform Updates

Vercel occasionally updates Node.js, TypeScript versions in their environment. Monitor:
- Vercel Blog: https://vercel.com/docs
- GitHub Releases: Next.js, React
- npm Security Advisories

---

## Production Checklist

Before going live:

- [ ] All tests passing locally (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Docs updated (README, API docs)
- [ ] CONTRIBUTING.md in place
- [ ] LICENSE file included
- [ ] .gitignore properly configured
- [ ] Environment variables set (if any)
- [ ] Custom domain configured (if using one)
- [ ] Analytics set up
- [ ] Error tracking configured (optional)
- [ ] Monitored first few deployments for errors

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Status**: https://www.vercel-status.com
- **GitHub Issues**: Report bugs in your repo

---

For more information, see:
- [README.md](../README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [API.md](./API.md) - API reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development
