"""
Data models for domain finder
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class DomainCheckResult(BaseModel):
    """Result of checking a single domain."""
    domain: str
    status: str = Field(..., description="AVAILABLE, TAKEN, or UNKNOWN")
    ip: Optional[str] = Field(None, description="IP address if TAKEN")


class GenerationConfig(BaseModel):
    """Configuration for name generation."""
    count: int = Field(50, ge=1, le=10000, description="Number of names to generate")
    length: int = Field(4, ge=3, le=12, description="Length of each name")
    pattern: Optional[str] = Field(None, description="Pattern like CVCCVC")
    prefix: Optional[str] = Field(None, description="Required prefix")
    suffix: Optional[str] = Field(None, description="Required suffix")
    tlds: List[str] = Field(default_factory=lambda: ["com"], description="TLDs to use")


class CheckingConfig(BaseModel):
    """Configuration for availability checking."""
    max_workers: int = Field(5, ge=1, le=20, description="Max parallel workers")
    timeout: int = Field(3, ge=1, le=10, description="DNS timeout in seconds")
    retry_attempts: int = Field(2, ge=1, le=5, description="Retry attempts on failure")


class BatchCheckRequest(BaseModel):
    """Request to check a batch of domains."""
    domains: List[str]
    config: Optional[CheckingConfig] = None


class BatchCheckResponse(BaseModel):
    """Response from batch domain check."""
    results: List[DomainCheckResult]
    available: List[str] = Field(description="List of available domains")
    taken: List[str] = Field(description="List of taken domains")
    unknown: List[str] = Field(description="List of unknown domains")
    duration_seconds: float = Field(description="Time taken for check")
