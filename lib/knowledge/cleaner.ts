/**
 * BiharStack AI - Text Cleaning & Normalization Pipeline
 * Cleans extracted website content while strictly preserving structural headings,
 * lists, paragraphs, and semantic information for retrieval.
 */

// Common boilerplate phrases to filter out
const BOILERPLATE_LINE_PATTERNS = [
  /^cookie (policy|settings|notice|consent)/i,
  /^accept (all )?cookies/i,
  /^we use cookies/i,
  /^all rights reserved/i,
  /^privacy policy/i,
  /^terms (of service|& conditions|of use)/i,
  /^click here to (accept|read|learn)/i,
  /^skip to (content|navigation|main)/i,
  /^subscribe to our newsletter/i,
];

// Common HTML entities to decode
const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
};

export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => ENTITY_MAP[match] || match);
}

/**
 * Clean and normalize raw extracted webpage content for RAG retrieval.
 */
export function cleanRawText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  // 1. Decode HTML entities
  let text = decodeHtmlEntities(rawText);

  // 2. Normalize Windows/Mac line endings to Unix \n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Remove zero-width spaces, control characters except \n and \t
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  text = text.replace(/[^\x20-\x7E\t\n\u00A0-\uFFFF]/g, '');

  // 4. Split into lines and filter line by line
  const rawLines = text.split('\n');
  const cleanedLines: string[] = [];
  const seenLines = new Set<string>();

  for (let line of rawLines) {
    // Collapse horizontal spaces
    line = line.replace(/[ \t]+/g, ' ').trim();

    if (!line) {
      // Allow single blank line to separate paragraphs
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
      continue;
    }

    // Skip boilerplate patterns
    let isBoilerplate = false;
    for (const pattern of BOILERPLATE_LINE_PATTERNS) {
      if (pattern.test(line)) {
        isBoilerplate = true;
        break;
      }
    }
    if (isBoilerplate) continue;

    // Check for repetitive duplicate lines (e.g. repeated navigation menus or header echoes)
    const normalizedKey = line.toLowerCase();
    if (line.length < 50 && seenLines.has(normalizedKey)) {
      continue; // Skip repeated short phrases
    }
    if (line.length < 50) {
      seenLines.add(normalizedKey);
    }

    cleanedLines.push(line);
  }

  // 5. Join and collapse multiple consecutive blank lines
  let result = cleanedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}
