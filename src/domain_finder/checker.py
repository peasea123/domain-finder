"""
Availability checking module - checks if domains are registered using DNS
"""

import socket
from typing import Dict, List, Any
from concurrent.futures import ThreadPoolExecutor, as_completed


class AvailabilityChecker:
    """Checks domain availability using DNS resolution."""
    
    def __init__(self, max_workers: int = 5, timeout: int = 3):
        """
        Initialize the availability checker.
        
        Args:
            max_workers: Maximum parallel DNS lookups
            timeout: DNS lookup timeout in seconds
        """
        self.max_workers = max_workers
        self.timeout = timeout
    
    def check(self, domain: str) -> Dict[str, Any]:
        """
        Check if a single domain is available.
        
        Args:
            domain: Domain name to check (with or without TLD)
        
        Returns:
            Dictionary with keys:
            - domain: The domain checked
            - status: "AVAILABLE", "TAKEN", or "UNKNOWN"
            - ip: IP address if TAKEN, None otherwise
        """
        try:
            # Attempt DNS resolution
            ip = socket.gethostbyname(domain)
            return {
                "domain": domain,
                "status": "TAKEN",
                "ip": ip
            }
        except socket.gaierror as e:
            error_msg = str(e).lower()
            # Check if domain not found
            if "nodename nor servname provided" in error_msg or "name or service not known" in error_msg:
                return {
                    "domain": domain,
                    "status": "AVAILABLE",
                    "ip": None
                }
            else:
                return {
                    "domain": domain,
                    "status": "UNKNOWN",
                    "ip": None
                }
        except socket.timeout:
            return {
                "domain": domain,
                "status": "UNKNOWN",
                "ip": None
            }
        except Exception as e:
            return {
                "domain": domain,
                "status": "UNKNOWN",
                "ip": None
            }
    
    def check_batch(self, domains: List[str]) -> List[Dict[str, Any]]:
        """
        Check multiple domains in parallel.
        
        Args:
            domains: List of domain names to check
        
        Returns:
            List of check results
        """
        results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_domain = {
                executor.submit(self.check, domain): domain 
                for domain in domains
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_domain):
                result = future.result()
                results.append(result)
        
        # Return results in original order (optional, for consistency)
        return sorted(results, key=lambda x: x["domain"])
    
    def get_summary(self, results: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Get a summary of check results.
        
        Args:
            results: List of check results from check_batch()
        
        Returns:
            Dictionary with counts by status
        """
        summary = {
            "total": len(results),
            "available": 0,
            "taken": 0,
            "unknown": 0
        }
        
        for result in results:
            status = result.get("status", "unknown").lower()
            if status in summary:
                summary[status] += 1
        
        return summary
