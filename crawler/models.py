"""
BiharStack AI - Crawler Models and Configuration
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import time

@dataclass
class CrawlConfig:
    max_pages: int = 50
    max_depth: int = 3
    timeout: float = 10.0
    rate_limit_delay: float = 1.0  # seconds between requests
    user_agent: str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    allow_subdomains: bool = True

@dataclass
class ExtractedPage:
    url: str
    title: str
    meta_description: str
    content: str
    content_hash: str
    word_count: int
    discovered_links: List[str] = field(default_factory=list)
    status: str = "completed"
    error_message: Optional[str] = None
    entities: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CrawlJobProgress:
    job_id: str
    chatbot_id: str
    workspace_id: str
    start_url: str
    status: str  # 'queued', 'crawling', 'completed', 'failed', 'cancelled'
    pages_discovered: int = 0
    pages_processed: int = 0
    pages_failed: int = 0
    current_page: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
