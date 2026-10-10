"""
BiharStack AI - URL Normalization & Domain Detection
"""
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode, urljoin
from typing import Optional

# Marketing/tracking parameters to strip
TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "msclkid",
    "dclid",
    "ref",
    "source",
    "mc_eid",
    "_ga",
    "_gl",
    "yclid",
}

# Resource extensions to skip
EXCLUDED_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".tiff", ".bmp",
    # Documents & Archives
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".tar", ".gz", ".rar",
    # Audio & Video
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".wmv", ".webm", ".mkv",
    # Code & Styles
    ".css", ".js", ".mjs", ".json", ".xml", ".rss", ".map",
    # Fonts
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    # Executables
    ".exe", ".dmg", ".bin", ".iso",
}

def normalize_url(url: str) -> str:
    """
    Normalize a URL for deduplication and consistent crawling.
    - Strips fragment (#)
    - Lowercases scheme and hostname
    - Removes default ports (:80, :443)
    - Strips tracking parameters while preserving functional parameters
    - Normalizes trailing slash
    """
    if not url:
        return ""

    parsed = urlparse(url.strip())

    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()

    # Remove default port
    if scheme == "http" and netloc.endswith(":80"):
        netloc = netloc[:-3]
    elif scheme == "https" and netloc.endswith(":443"):
        netloc = netloc[:-4]

    # Normalize path: ensure leading slash, trim trailing slash if not root
    path = parsed.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    # Filter query parameters
    query = ""
    if parsed.query:
        params = parse_qsl(parsed.query, keep_blank_values=True)
        filtered = [(k, v) for k, v in params if k.lower() not in TRACKING_PARAMS]
        filtered.sort(key=lambda x: x[0])
        if filtered:
            query = urlencode(filtered)

    # Omit fragment completely
    return urlunparse((scheme, netloc, path, parsed.params, query, ""))


def is_same_domain(base_url: str, target_url: str, allow_subdomains: bool = False) -> bool:
    """
    Check if target_url belongs to the same domain/host as base_url.
    Treats www.domain.com and domain.com as identical.
    """
    base_host = (urlparse(base_url).hostname or "").lower()
    target_host = (urlparse(target_url).hostname or "").lower()

    if not base_host or not target_host:
        return False

    base_clean = base_host[4:] if base_host.startswith("www.") else base_host
    target_clean = target_host[4:] if target_host.startswith("www.") else target_host

    if base_clean == target_clean:
        return True

    if allow_subdomains:
        return target_clean.endswith("." + base_clean)

    return False


def is_crawlable_url(url: str) -> bool:
    """
    Check if a URL points to an HTML page and not an image, media, or excluded asset.
    """
    if not url:
        return False

    parsed = urlparse(url)

    # Must be http or https
    if parsed.scheme.lower() not in ("http", "https"):
        return False

    path = parsed.path.lower()

    # Check extension
    for ext in EXCLUDED_EXTENSIONS:
        if path.endswith(ext):
            return False

    return True


def resolve_link(current_url: str, href: str) -> Optional[str]:
    """
    Resolve a relative or absolute link found in HTML to a fully qualified URL.
    Returns None if the link is mailto, tel, javascript, or invalid.
    """
    if not href:
        return None

    cleaned = href.strip()

    # Skip non-http schemes and intra-page fragments
    lower = cleaned.lower()
    if (
        lower.startswith("mailto:")
        or lower.startswith("tel:")
        or lower.startswith("javascript:")
        or lower.startswith("data:")
        or lower.startswith("#")
    ):
        return None

    try:
        joined = urljoin(current_url, cleaned)
        return joined
    except Exception:
        return None
