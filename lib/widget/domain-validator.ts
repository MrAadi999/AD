/**
 * Normalize a domain string to clean hostname (lowercase, no protocol, no port, no path)
 */
export function normalizeDomain(rawUrlOrDomain: string): string {
  if (!rawUrlOrDomain) return '';

  let cleaned = rawUrlOrDomain.trim().toLowerCase();

  // If starts with protocol, parse using URL
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const parsed = new URL(cleaned);
      cleaned = parsed.hostname;
    } catch {
      cleaned = cleaned.replace(/^https?:\/\//i, '').split('/')[0];
    }
  } else {
    // Strip ports and paths if any
    cleaned = cleaned.split('/')[0].split(':')[0];
  }

  return cleaned.replace(/^www\./, '');
}

/**
 * Validates if a request Origin or Referer is permitted by the chatbot's allowed_domains configuration
 */
export function isOriginAllowed(
  originOrReferer: string | null | undefined,
  allowedDomains?: string[]
): boolean {
  // If no allowed domains configured, access is open to all domains
  if (!allowedDomains || !Array.isArray(allowedDomains) || allowedDomains.length === 0) {
    return true;
  }

  // Filter non-empty configured domains
  const normalizedAllowed = allowedDomains
    .map(normalizeDomain)
    .filter(Boolean);

  if (normalizedAllowed.length === 0) {
    return true;
  }

  if (!originOrReferer) {
    // If domain restrictions are active, requests without Origin/Referer (e.g. direct curl) are blocked
    return false;
  }

  const incomingHost = normalizeDomain(originOrReferer);
  if (!incomingHost) return false;

  // Check for exact match or subdomain match
  return normalizedAllowed.some((allowed) => {
    if (incomingHost === allowed) return true;
    if (incomingHost.endsWith('.' + allowed)) return true;
    return false;
  });
}
