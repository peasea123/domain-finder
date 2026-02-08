# Domain Name Generator & Availability Checker

## Project Overview

A comprehensive domain name discovery and validation tool that combines intelligent name generation with real-time availability checking. This service helps users rapidly discover available domain names by generating pronounceable, brandable domain candidates and validating their registration status against live DNS records.

### Core Value Proposition

- **Smart Generation**: Create pronounceable, memorable domain names based on user specifications
- **Accurate Validation**: Check actual DNS resolution to definitively determine availability (not HTTP-based checks)
- **Flexible Constraints**: Filter by length, prefixes, suffixes, patterns, and TLDs
- **Rapid Discovery**: Batch check multiple candidates in seconds
- **Detailed Reporting**: Show registration status and IP resolution data

---

## How It Works: Technical Approach

### Availability Detection Method

Based on rigorous testing, **DNS resolution is the gold standard for domain availability checking**:

1. **Method**: Attempt to resolve the domain to an IP address using Python's `socket` module
2. **Success Case**: If `socket.gethostbyname(domain)` returns an IP → domain is **TAKEN**
   - Works for active websites, parked domains, and squatted domains
   - Unaffected by HTTP response codes or parking page content
3. **Failure Case**: If resolution throws `socket.gaierror` with "nodename not found" → domain is **AVAILABLE**
   - Definitive indicator that domain is not registered
4. **Reliability**: This method queries authoritative nameservers, not intermediary services

### Why This Approach?

- ❌ **HTTP status codes fail**: Parked domains return 200 OK, but they're taken
- ❌ **WHOIS APIs fail**: Require command-line tools on Windows, inconsistent data
- ✅ **DNS resolution succeeds**: Direct check against root nameservers, instant feedback, works everywhere

---

## System Architecture

### High-Level Flow

```
User Input (Specifications)
        ↓
Name Generation Engine
        ↓
Candidate List (e.g., 100 names)
        ↓
Availability Checker (Parallel DNS Lookups)
        ↓
Results Report (Available vs Taken)
        ↓
User Output (JSON, CSV, or Formatted Table)
```

### Core Components

#### 1. **Name Generation Engine**

Generates pronounceable domain candidates based on constraints.

**Input Parameters:**
```python
{
    "count": 50,                    # Number of names to generate
    "length": 4,                    # 3-8 character domains
    "tlds": ["com", "io", "co"],   # Which TLDs to generate for
    "pattern": "CVCCVC",            # C=consonant, V=vowel (optional)
    "prefix": "br",                 # Must start with this (optional)
    "suffix": "ly",                 # Must end with this (optional)
    "exclude_patterns": ["dr", "tr"] # Letter combos to skip (optional)
}
```

**Generation Strategies:**
1. **Vowel-Consonant Patterns**: Generate based on phonetic rules (easy to pronounce)
2. **Dictionary-Based**: Use word lists to create real English words
3. **Prefix/Suffix Combinations**: Combine common prefixes with suffixes
4. **Random Pronounceable**: Apply linguistic rules for natural-sounding names

**Example Output:**
```
fexo.com
vinto.io
bravo.co
```

#### 2. **Availability Checker**

Validates domains against live DNS records.

**Input:** List of domain names

**Process:**
```python
def check_domain(domain):
    try:
        ip = socket.gethostbyname(domain)
        return {"domain": domain, "status": "TAKEN", "ip": ip}
    except socket.gaierror as e:
        if "nodename nor servname provided" in str(e):
            return {"domain": domain, "status": "AVAILABLE", "ip": None}
        else:
            return {"domain": domain, "status": "UNKNOWN", "ip": None}
```

**Optimization:**
- Use threading/asyncio for parallel checks (5-10 concurrent requests)
- Implement retry logic with exponential backoff
- Cache results to avoid duplicate lookups

**Output:**
```json
{
  "results": [
    {"domain": "vinto.io", "status": "AVAILABLE", "ip": null},
    {"domain": "bravo.co", "status": "TAKEN", "ip": "52.123.45.67"},
    {"domain": "fexo.com", "status": "TAKEN", "ip": "172.237.146.38"}
  ],
  "available_count": 1,
  "taken_count": 2,
  "check_duration_seconds": 3.2
}
```

---

## API/Interface Design

### Option A: Python Library (Recommended for Flexibility)

```python
from domain_finder import NameGenerator, AvailabilityChecker

# Generate names
generator = NameGenerator()
names = generator.generate(
    count=50,
    length=4,
    tlds=["com", "io"],
    pattern="CVCCVC",
    prefix="br"
)

# Check availability
checker = AvailabilityChecker(max_workers=5)  # Parallel checking
results = checker.check_batch(names)

# Show results
available = [r for r in results if r["status"] == "AVAILABLE"]
print(f"Found {len(available)} available domains:")
for domain in available:
    print(f"  ✓ {domain['domain']}")
```

### Option B: CLI Application (User-Friendly)

```bash
# Simple usage
$ domain-finder generate --count 50 --length 4 --prefix "br" --check

# With specific patterns
$ domain-finder generate --length 5 --pattern "CVCCVC" --tlds "io,co" --check

# Custom naming strategy
$ domain-finder generate --strategy "dictionary" --suffix "ly" --check

# Output to file
$ domain-finder generate --count 100 --check --output results.json
```

### Option C: Web API (Scalability)

```
POST /api/generate-and-check
Content-Type: application/json

{
  "count": 50,
  "length": 4,
  "tlds": ["com", "io"],
  "pattern": "CVCCVC",
  "prefix": "br",
  "check_availability": true
}

Response:
{
  "available": [
    {"domain": "briex.com", "ip": null},
    {"domain": "brivo.io", "ip": null}
  ],
  "taken": [
    {"domain": "bravo.com", "ip": "52.123.45.67"}
  ]
}
```

---

## Implementation Roadmap

### Phase 1: MVP (Week 1-2)

- [ ] **Name Generation**
  - Implement CVCCVC pattern generator
  - Create basic vowel-consonant dictionary
  - Support simple constraints (length, prefix, suffix)

- [ ] **Availability Checking**
  - Implement socket-based DNS resolution
  - Add threading for parallel checks
  - Build results aggregation

- [ ] **CLI Interface**
  - Simple command-line tool
  - Output to console and JSON file
  - Basic error handling

- [ ] **Testing**
  - Unit tests for name generation
  - Integration tests for DNS checking
  - Validate against test domain list

### Phase 2: Enhancement (Week 3-4)

- [ ] **Advanced Name Generation**
  - Implement dictionary-based strategy
  - Add linguistic pattern support
  - Create phonetic validation

- [ ] **performance Optimization**
  - Implement async DNS lookups (asyncio)
  - Add result caching
  - Support batch processing of 1000+ domains

- [ ] **Reporting**
  - Generate HTML reports with charts
  - Export to CSV/Excel
  - Show metrics (availability rate, check duration)

### Phase 3: Production (Week 5+)

- [ ] **Web API**
  - FastAPI or Flask backend
  - Rate limiting and authentication
  - Redis caching layer

- [ ] **Web UI**
  - React/Vue frontend
  - Real-time checking visualizations
  - Saved search history

- [ ] **Advanced Features**
  - Batch keyword/constraint presets
  - WHOIS integration for registration info
  - Price estimation per TLD
  - Direct purchase integration (GoDaddy API, etc.)

---

## Technology Stack

### Core Libraries

```python
# DNS Resolution (Built-in)
import socket

# Concurrency for parallel checks
import asyncio
# or
import concurrent.futures

# Data validation & configuration
import pydantic

# CLI interface
import click
# or
import typer

# API (if needed)
from fastapi import FastAPI

# Data processing
import pandas as pd
```

### Optional Enhancements

- **phonetics**: nltk, metaphone (better name generation)
- **caching**: redis (for frequent lookups)
- **web**: FastAPI + Uvicorn (API backend)
- **frontend**: React + TypeScript (web UI)
- **database**: PostgreSQL (store results, user preferences)

---

## Code Structure

```
domain-finder/
├── src/
│   ├── domain_finder/
│   │   ├── __init__.py
│   │   ├── generator.py          # Name generation logic
│   │   ├── checker.py            # Availability checking
│   │   ├── models.py             # Data models (Pydantic)
│   │   ├── config.py             # Configuration
│   │   └── utils.py              # Helper functions
│   ├── cli.py                    # Command-line interface
│   └── api.py                    # (Optional) FastAPI server
├── tests/
│   ├── test_generator.py
│   ├── test_checker.py
│   └── test_integration.py
├── examples/
│   ├── basic_usage.py
│   └── batch_processing.py
├── requirements.txt
├── setup.py
└── README.md
```

---

## Example Usage Scenarios

### Scenario 1: Find Short, Pronounceable Tech Domains

```
User Request: "Generate 100 four-letter domains that sound tech-y, 
               check .com, .io, and .co for availability"

System Process:
1. Generates 100 CVCCVC pattern names
2. Creates candidates for all 3 TLDs (300 total)
3. Checks DNS resolution in parallel
4. Returns 15 available domains

Results:
✓ voxio.io
✓ nexo.co
✓ zelix.io
```

### Scenario 2: Brand-Specific Domain Search

```
User Request: "I want domains starting with 'br', 5 letters total, 
               ending in 'o', check only .com"

System Process:
1. Generates names matching: br****o pattern
2. Validates pronunciation
3. Filters to .com only
4. Checks availability

Results:
✓ bravo.com (TAKEN)
✓ brino.com (AVAILABLE)
✓ brevo.com (AVAILABLE)
```

### Scenario 3: Language-Based Domain Finding

```
User Request: "Generate domains using Indian/Hindi-derived words, 
               4-5 letters, check .com and .in"

System Process:
1. Uses Indian word list for generation
2. Applies pronunciation rules
3. Checks .com and .in TLDs
4. Returns mixed Indian/English domain options

Results:
✓ raavi.in (AVAILABLE)
✓ kavi.com (TAKEN)
✓ asha.in (TAKEN)
```

---

## Configuration Examples

### JSON Config File

```json
{
  "generation": {
    "strategies": ["pattern", "dictionary"],
    "default_count": 50,
    "default_length": 4,
    "min_length": 3,
    "max_length": 12
  },
  "checking": {
    "max_parallel_workers": 5,
    "timeout_seconds": 3,
    "retry_attempts": 2,
    "retry_backoff": 1.5
  },
  "tlds": {
    "common": ["com", "io", "co"],
    "country": ["in", "uk", "de"],
    "new": ["app", "dev", "tech"]
  }
}
```

### Command-Line Presets

```bash
# Save a preset for future use
$ domain-finder preset save --name "tech-startup" \
    --length 4 \
    --pattern "CVCCVC" \
    --tlds "com,io,app" \
    --check

# Use saved preset
$ domain-finder generate --preset tech-startup --count 100
```

---

## Error Handling & Edge Cases

### Domain Resolution Errors

```python
socket.gaierror:
  - "nodename nor servname provided" → Available ✓
  - "Temporary failure in name resolution" → Timeout (retry)
  - "Name or service not known" → Available ✓
  - Other → Unknown (log for review)
```

### Invalid Inputs

```
- Length < 3 or > 12 → Rejected
- Empty TLD list → Default to ['com']
- Invalid pattern → Use fallback strategy
- Rate limiting → Queue and batch
```

### Timeout Handling

```python
# DNS lookup timeout = 3 seconds
# If no response in 3 seconds → Mark as "UNKNOWN"
# Retry with exponential backoff
# Max retries = 2

# Parallel check timeout = (count of domains / max_workers * 3) + 5 seconds
```

---

## Future Enhancements

### Short-Term (1-2 months)

- [ ] WHOIS data integration (registrar, expiration date)
- [ ] Alternative nameserver checks (Google DNS, Cloudflare)
- [ ] Domain marketplace price suggestions
- [ ] Similar-sounding domain detection (typosquatting prevention)

### Medium-Term (2-3 months)

- [ ] Add to WHOIS search to find expired/dropping domains
- [ ] Bulk purchase integration (GoDaddy, Namecheap APIs)
- [ ] Search analytics (which patterns are most available)
- [ ] User accounts with saved searches

### Long-Term (3-6 months)

- [ ] AI-powered naming (GPT-based generation)
- [ ] Trademark/SEO analysis
- [ ] International domain support (IDN)
- [ ] Predictive expiration tracking
- [ ] Domain portfolio management
- [ ] REST API with rate limiting (SaaS potential)

---

## Testing Strategy

### Unit Tests

```python
# test_generator.py
def test_cvccvc_pattern_generation():
    generator = NameGenerator()
    names = generator.generate(pattern="CVCCVC", count=10)
    assert all(len(n) == 5 for n in names)

# test_checker.py
def test_available_domain():
    checker = AvailabilityChecker()
    result = checker.check("nonexistent-domain-12345.com")
    assert result["status"] == "AVAILABLE"

def test_taken_domain():
    checker = AvailabilityChecker()
    result = checker.check("google.com")
    assert result["status"] == "TAKEN"
```

### Integration Tests

```python
def test_full_pipeline():
    # Generate 10 names
    generator = NameGenerator()
    names = generator.generate(count=10, length=4)
    
    # Check all
    checker = AvailabilityChecker()
    results = checker.check_batch(names)
    
    # Validate results format
    assert len(results) == 10
    assert all("status" in r for r in results)
```

---

## Performance Metrics to Track

- **Generation Speed**: Names per second
- **Check Speed**: Domains checked per second (with parallelization)
- **Availability Rate**: % of available vs taken
- **False Positive Rate**: Should be ~0% with DNS method
- **API Response Time**: < 5 seconds for batch of 50 domains

---

## Getting Started Checklist

- [ ] Create project repository
- [ ] Set up Python environment (3.9+)
- [ ] Implement name generator (Phase 1)
- [ ] Implement DNS checker (Phase 1)
- [ ] Create CLI interface (Phase 1)
- [ ] Write comprehensive tests
- [ ] Create documentation
- [ ] Deploy and gather user feedback

---

## Resources & References

### DNS & Networking
- Python `socket` documentation: [https://docs.python.org/3/library/socket.html](https://docs.python.org/3/library/socket.html)
- DNS fundamentals: [https://en.wikipedia.org/wiki/Domain_Name_System](https://en.wikipedia.org/wiki/Domain_Name_System)

### Name Generation
- Phonetic algorithms: Soundex, Metaphone, Levenshtein
- CVCCVC pattern explanation: C=Consonant, V=Vowel (natural syllable structure)

### Async Python
- asyncio documentation: [https://docs.python.org/3/library/asyncio.html](https://docs.python.org/3/library/asyncio.html)
- Threading vs asyncio comparison

### Frameworks (if building Web API)
- FastAPI: [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- Click (CLI): [https://click.palletsprojects.com](https://click.palletsprojects.com)

---

## Conclusion

This project solves a real problem: finding available domains quickly and accurately. By leveraging DNS resolution instead of flawed HTTP-based checks, it provides reliable results. The modular architecture supports everything from a simple CLI tool to a full-featured web service, allowing you to scale based on user demand.

**Start with Phase 1, validate the concept, then expand based on user feedback.**

---

*Document Version: 1.0*  
*Last Updated: February 8, 2026*  
*Author: Development Team*
