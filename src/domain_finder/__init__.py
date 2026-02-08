"""
Domain Finder - Smart domain name generator and availability checker
"""

__version__ = "0.1.0"
__author__ = "Your Name"
__license__ = "MIT"

# Import main classes for easy access
try:
    from .generator import NameGenerator
    from .checker import AvailabilityChecker
except ImportError:
    # During initial setup, these might not exist yet
    pass

__all__ = ["NameGenerator", "AvailabilityChecker"]
