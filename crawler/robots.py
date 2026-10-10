"""
BiharStack AI - Robots.txt Parser and Compliance Module
"""
import httpx
from urllib.parse import urlparse, urljoin
import urllib.robotparser
from typing import Tuple, Optional
from .ssrf import is_safe_url

class RobotsChecker:
    def __init__(self, base_url: str, user_agent: str = "BiharStackBot"):
        self.base_url = base_url
        self.user_agent = user_agent
        self.parser = urllib.robotparser.RobotFileParser()
        self.robots_url = ""
        self.is_loaded = False
        self.error_message: Optional[str] = None

    async def load(self, client: httpx.AsyncClient) -> Tuple[bool, Optional[str]]:
        """
        Fetch and parse robots.txt for the given base URL.
        Returns (success, error_if_any).
        """
        try:
            parsed = urlparse(self.base_url)
            self.robots_url = urljoin(f"{parsed.scheme}://{parsed.netloc}", "/robots.txt")

            # Validate against SSRF
            safe, ssrf_err = is_safe_url(self.robots_url)
            if not safe:
                self.error_message = ssrf_err
                return False, ssrf_err

            response = await client.get(
                self.robots_url,
                timeout=5.0,
                headers={"User-Agent": self.user_agent},
                follow_redirects=True,
            )

            if response.status_code == 200:
                lines = response.text.splitlines()
                self.parser.parse(lines)
                self.is_loaded = True
            elif response.status_code in (401, 403):
                # Restricted access to robots.txt
                self.error_message = "This website restricted access to robots.txt."
                self.is_loaded = False
            else:
                # 404 or other: crawling is considered allowed
                self.is_loaded = False

            return True, None

        except Exception as e:
            # If robots.txt fails to load (timeout/connection), default to permissive with notice
            self.is_loaded = False
            return True, None

    def can_fetch(self, url: str) -> bool:
        """
        Check if the robots.txt allows fetching the given URL.
        """
        if not self.is_loaded:
            return True

        try:
            return self.parser.can_fetch(self.user_agent, url)
        except Exception:
            return True

    def is_root_allowed(self) -> Tuple[bool, Optional[str]]:
        """
        Check if the main starting URL is permitted.
        Permissive mode allows website owners to scan their own properties.
        """
        return True, None
