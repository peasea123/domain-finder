"""
Name generation module - generates pronounceable domain names
"""

import random
from typing import List, Optional


class NameGenerator:
    """Generates pronounceable domain names based on specified patterns."""
    
    # Basic vowel and consonant sets
    VOWELS = "aeiou"
    CONSONANTS = "bcdfghjklmnpqrstvwxyz"
    
    def __init__(self):
        """Initialize the name generator."""
        self.vowels = self.VOWELS
        self.consonants = self.CONSONANTS
    
    def generate(
        self,
        count: int = 50,
        length: int = 4,
        pattern: Optional[str] = None,
        prefix: Optional[str] = None,
        suffix: Optional[str] = None,
        tlds: Optional[List[str]] = None,
    ) -> List[str]:
        """
        Generate pronounceable domain names.
        
        Args:
            count: Number of names to generate
            length: Length of each name (not including TLD)
            pattern: Optional pattern (e.g., "CVCCVC" where C=consonant, V=vowel)
            prefix: Optional prefix that names must start with
            suffix: Optional suffix that names must end with
            tlds: List of TLDs to use (e.g., ["com", "io", "co"])
        
        Returns:
            List of domain names (with TLDs)
        """
        if tlds is None:
            tlds = ["com"]
        
        names = []
        
        for _ in range(count):
            if pattern:
                name = self._generate_by_pattern(length, pattern)
            else:
                name = self._generate_cvccvc(length)
            
            # Apply constraints
            if prefix and not name.startswith(prefix):
                name = prefix + name[len(prefix):]
            
            if suffix and not name.endswith(suffix):
                name = name[:-len(suffix)] + suffix
            
            # Add TLDs
            for tld in tlds:
                names.append(f"{name}.{tld}")
        
        return names
    
    def _generate_cvccvc(self, length: int) -> str:
        """Generate a name using alternating consonant-vowel pattern."""
        name = ""
        use_consonant = random.choice([True, False])
        
        for _ in range(length):
            if use_consonant:
                name += random.choice(self.consonants)
            else:
                name += random.choice(self.vowels)
            use_consonant = not use_consonant
        
        return name
    
    def _generate_by_pattern(self, length: int, pattern: str) -> str:
        """Generate a name by a specific pattern (e.g., CVCCVC)."""
        if len(pattern) != length:
            # Fallback if pattern length doesn't match
            return self._generate_cvccvc(length)
        
        name = ""
        for char in pattern.upper():
            if char == 'C':
                name += random.choice(self.consonants)
            elif char == 'V':
                name += random.choice(self.vowels)
            else:
                name += char
        
        return name
