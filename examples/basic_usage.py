"""
Basic usage example of domain finder
"""

import sys
sys.path.insert(0, '../src')

from domain_finder.generator import NameGenerator
from domain_finder.checker import AvailabilityChecker


def main():
    print("=" * 60)
    print("Domain Finder - Basic Usage Example")
    print("=" * 60)
    
    # Step 1: Generate domain names
    print("\n[1] Generating 20 four-letter domain names...\n")
    generator = NameGenerator()
    domains = generator.generate(
        count=20,
        length=4,
        tlds=["com", "io"]
    )
    
    print(f"Generated {len(domains)} domains:")
    for domain in domains[:10]:  # Show first 10
        print(f"  - {domain}")
    print(f"  ... ({len(domains)} total)\n")
    
    # Step 2: Check availability
    print("[2] Checking availability...\n")
    checker = AvailabilityChecker(max_workers=5)
    results = checker.check_batch(domains)
    
    # Step 3: Display results
    print("[3] Results:\n")
    available = []
    taken = []
    unknown = []
    
    for result in results:
        if result["status"] == "AVAILABLE":
            available.append(result["domain"])
            print(f"✓ {result['domain']:<20} AVAILABLE")
        elif result["status"] == "TAKEN":
            taken.append(result["domain"])
            print(f"✗ {result['domain']:<20} TAKEN (IP: {result['ip']})")
        else:
            unknown.append(result["domain"])
            print(f"? {result['domain']:<20} UNKNOWN")
    
    # Step 4: Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Available: {len(available)}")
    print(f"Taken:     {len(taken)}")
    print(f"Unknown:   {len(unknown)}")
    
    if available:
        print(f"\n🎉 Available domains:")
        for domain in available:
            print(f"   - {domain}")


if __name__ == "__main__":
    main()
