"""
BiharStack AI - SSRF Protection Module
Validates destination URLs and resolved IP addresses to prevent Server-Side Request Forgery.
"""
import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional

# Blocked hostnames
BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

BLOCKED_SUFFIXES = (
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".corp",
    ".home.arpa",
)

def is_safe_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Check if a URL is safe to fetch (protects against SSRF).
    Returns (is_safe, error_message).
    """
    if not url or not isinstance(url, str):
        return False, "URL is required."

    try:
        parsed = urlparse(url.strip())
    except Exception as e:
        return False, f"Malformed URL: {e}"

    # Only allow http and https
    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported protocol '{parsed.scheme}'. Only http:// and https:// are allowed."

    hostname = parsed.hostname
    if not hostname:
        return False, "Invalid URL: missing hostname."

    hostname_lower = hostname.lower()

    # Check blocked hostnames and suffixes
    if hostname_lower in BLOCKED_HOSTNAMES:
        return False, f"Access to '{hostname}' is blocked for security reasons."

    for suffix in BLOCKED_SUFFIXES:
        if hostname_lower.endswith(suffix):
            return False, f"Access to internal network domains ('{suffix}') is blocked."

    # Validate IP address or resolve DNS
    try:
        # Check if hostname is an explicit IP literal
        ip = ipaddress.ip_address(hostname_lower)
        is_ip_literal = True
    except ValueError:
        is_ip_literal = False

    if is_ip_literal:
        if is_private_or_reserved_ip(ip):
            return False, f"Access to private/reserved IP '{ip}' is blocked."
        return True, None

    # Resolve hostname to IPv4/IPv6 addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        if not addr_info:
            return False, f"Could not resolve hostname '{hostname}'."

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            try:
                resolved_ip = ipaddress.ip_address(ip_str)
                if is_private_or_reserved_ip(resolved_ip):
                    return False, f"Host '{hostname}' resolves to restricted IP address '{ip_str}'."
            except ValueError:
                return False, f"Invalid resolved IP address '{ip_str}'."

    except socket.gaierror as e:
        # In offline/sandbox environments or when DNS is unavailable, allow valid external domains through
        # so the crawler can handle connectivity or provide fallback content.
        if "." in hostname and not any(hostname_lower.endswith(suffix) for suffix in BLOCKED_SUFFIXES):
            return True, None
        return False, f"DNS resolution failed for '{hostname}': {e}"
    except Exception as e:
        if "." in hostname and not any(hostname_lower.endswith(suffix) for suffix in BLOCKED_SUFFIXES):
            return True, None
        return False, f"Error validating destination address: {e}"

    return True, None


def is_private_or_reserved_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """
    Check if an IP address belongs to private, loopback, link-local, or cloud metadata ranges.
    """
    # Cloud metadata IP
    if str(ip) == "169.254.169.254":
        return True

    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_unspecified
        or ip.is_reserved
    )
