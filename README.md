# Domain Finder

A smart domain name generator and availability checker that combines intelligent name generation with real-time DNS validation.

## Features

✨ **Smart Name Generation**
- CVCCVC pattern-based pronounceable names
- Customizable length, prefixes, and suffixes
- Support for multiple TLDs simultaneously

🔍 **Accurate Availability Checking**
- Uses DNS resolution (most reliable method)
- Detects taken, available, and unknown domains
- Parallel checking for speed

⚡ **Fast & Efficient**
- Batch process hundreds of domains
- Threaded/async DNS lookups
- Results caching

🎯 **Flexible Interface**
- Python library API
- Command-line interface
- (Optional) REST API for web integration

## Quick Start

### Installation

```bash
git clone https://github.com/yourusername/domain-finder.git
cd domain-finder
pip install -r requirements.txt
```

### Basic Usage

```python
from domain_finder import NameGenerator, AvailabilityChecker

# Generate some names
generator = NameGenerator()
names = generator.generate(count=20, length=4, tlds=["com", "io"])

# Check if they're available
checker = AvailabilityChecker()
results = checker.check_batch(names)

# Show results
for result in results:
    if result["status"] == "AVAILABLE":
        print(f"✓ {result['domain']} is available!")
```

### Command Line

```bash
# Generate and check 50 four-letter domains
python -m domain_finder.cli generate --count 50 --length 4 --check

# Custom specifications
python -m domain_finder.cli generate --count 100 --length 5 --prefix "br" --tlds "com,io" --check

# Save results
python -m domain_finder.cli generate --count 50 --check --output results.json
```

## How It Works

### The DNS Resolution Method

Unlike HTTP-based checks that fail on parked domains, Domain Finder uses **DNS resolution** to definitively determine availability:

1. **Taken Domain**: Successfully resolves to an IP address → Registered
2. **Available Domain**: DNS lookup fails with "nodename not found" → Available
3. **Unknown**: DNS timeout or error → Requires manual verification

This method is:
- ✓ Works on all registered domains (active, parked, squatted)
- ✓ Direct check against authoritative nameservers
- ✓ No false positives from parking pages
- ✓ Instant feedback

## Project Structure

```
domain-finder/
├── src/domain_finder/         # Main package
│   ├── __init__.py
│   ├── generator.py           # Name generation logic
│   ├── checker.py             # DNS availability checking
│   ├── models.py              # Data models
│   ├── config.py              # Configuration
│   └── utils.py               # Helper functions
├── cli.py                     # Command-line interface
├── tests/                     # Unit & integration tests
├── examples/                  # Usage examples
├── DOMAIN_FINDER_PROJECT.md   # Detailed project specification
├── requirements.txt
├── setup.py
└── README.md
```

## Development

### Setting Up Dev Environment

```bash
# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate

# Install dependencies + dev tools
pip install -r requirements.txt
pip install pytest pytest-cov black flake8
```

### Running Tests

```bash
pytest tests/
pytest tests/ --cov=src/domain_finder  # With coverage
```

### Code Style

```bash
black src/
flake8 src/
```

## Project Phases

### Phase 1: MVP (Current)
- [x] Project setup
- [ ] Name generation (CVCCVC patterns)
- [ ] DNS availability checking
- [ ] CLI interface
- [ ] Basic testing

### Phase 2: Enhancement
- [ ] Advanced generation strategies
- [ ] Async/parallel optimization
- [ ] HTML reporting
- [ ] CSV export

### Phase 3: Production
- [ ] REST API
- [ ] Web UI
- [ ] User accounts
- [ ] Advanced features (WHOIS, pricing, etc.)

See [DOMAIN_FINDER_PROJECT.md](DOMAIN_FINDER_PROJECT.md) for complete specifications.

## Examples

See the `examples/` directory for more detailed usage patterns:
- `basic_usage.py` - Simple generation and checking
- `batch_processing.py` - Processing hundreds of domains
- `custom_patterns.py` - Using custom naming patterns

## Configuration

Create a `config.json` in the project root:

```json
{
  "generation": {
    "default_count": 50,
    "max_parallel_workers": 5
  },
  "checking": {
    "timeout_seconds": 3,
    "retry_attempts": 2
  },
  "tlds": {
    "common": ["com", "io", "co"],
    "country": ["in", "uk"]
  }
}
```

## API Reference

### NameGenerator

```python
generator = NameGenerator()

# Basic generation
names = generator.generate(count=50, length=4)

# With constraints
names = generator.generate(
    count=100,
    length=5,
    pattern="CVCCVC",      # C=consonant, V=vowel
    prefix="br",
    suffix="lo",
    tlds=["com", "io", "app"]
)
```

### AvailabilityChecker

```python
checker = AvailabilityChecker(max_workers=5, timeout=3)

# Check single domain
result = checker.check("example.com")
# Returns: {"domain": "example.com", "status": "AVAILABLE|TAKEN|UNKNOWN", "ip": "xxx.xxx.xxx.xxx"}

# Check batch
results = checker.check_batch(["example.com", "test.io", "sample.co"])
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] WHOIS integration
- [ ] Domain marketplace pricing
- [ ] Alternative TLD suggestions
- [ ] Trademark checking
- [ ] Expired domain detection
- [ ] Web interface
- [ ] Package on PyPI

## Support

For issues, questions, or suggestions, please open a GitHub issue.

---

**Getting Started**: Read [DOMAIN_FINDER_PROJECT.md](DOMAIN_FINDER_PROJECT.md) for detailed project specification and implementation guide.

**Created**: February 2026
