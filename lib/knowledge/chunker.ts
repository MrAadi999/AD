import * as crypto from 'crypto';

export interface ChunkMetadata {
  url: string;
  title: string;
  heading?: string;
  source_type: 'website' | 'document' | 'qa';
  chunk_index: number;
  total_chunks?: number;
}

export interface TextChunk {
  content: string;
  chunk_index: number;
  token_count: number;
  content_hash: string;
  metadata: ChunkMetadata;
}

export interface ChunkOptions {
  maxTokens?: number; // Default: 600 tokens (~2400 chars)
  overlapTokens?: number; // Default: 80 tokens (~320 chars)
  minChunkWords?: number; // Minimum words for a quality chunk (default 6)
  charsPerToken?: number; // Approximation factor (default 4 chars per token)
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxTokens: 600,
  overlapTokens: 80,
  minChunkWords: 6,
  charsPerToken: 4,
};

/**
 * Estimate token count from text using standard ~4 chars/token heuristic.
 */
export function estimateTokenCount(text: string, charsPerToken = 4): number {
  if (!text) return 0;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Compute SHA-256 hash of content.
 */
export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * Intelligent heading, paragraph, and sentence-aware chunker.
 */
export function chunkDocument(
  cleanedText: string,
  docMetadata: {
    url: string;
    title: string;
    source_type?: 'website' | 'document' | 'qa';
  },
  options: ChunkOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxChars = opts.maxTokens * opts.charsPerToken;
  const overlapChars = opts.overlapTokens * opts.charsPerToken;

  if (!cleanedText || cleanedText.trim().length === 0) {
    return [];
  }

  // 1. Split into semantic sections by headings (# or ##)
  const lines = cleanedText.split('\n');
  const sections: { heading: string; text: string }[] = [];
  let currentHeading = docMetadata.title || 'Overview';
  let currentSectionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      // New heading section
      if (currentSectionLines.length > 0) {
        sections.push({
          heading: currentHeading,
          text: currentSectionLines.join('\n').trim(),
        });
        currentSectionLines = [];
      }
      currentHeading = trimmed.replace(/^#+\s*/, '');
    } else {
      currentSectionLines.push(line);
    }
  }

  if (currentSectionLines.length > 0) {
    sections.push({
      heading: currentHeading,
      text: currentSectionLines.join('\n').trim(),
    });
  }

  // 2. Chunk each section respecting paragraphs and sentence boundaries
  const rawChunks: { content: string; heading: string }[] = [];

  for (const section of sections) {
    if (!section.text) continue;

    // If section fits comfortably in a single chunk, keep it intact
    if (section.text.length <= maxChars) {
      rawChunks.push({
        content: section.text,
        heading: section.heading,
      });
      continue;
    }

    // Split section into paragraphs
    const paragraphs = section.text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if ((currentChunk + '\n\n' + trimmedPara).length <= maxChars) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      } else {
        // If currentChunk is already substantial, push it
        if (currentChunk.length > 0) {
          rawChunks.push({ content: currentChunk, heading: section.heading });

          // Calculate overlap from end of currentChunk
          const overlap = getSentenceOverlap(currentChunk, overlapChars);
          currentChunk = overlap ? `${overlap}\n\n${trimmedPara}` : trimmedPara;
        } else {
          // Paragraph itself is larger than maxChars, split by sentences
          const sentenceChunks = splitLongParagraph(trimmedPara, maxChars, overlapChars);
          for (let i = 0; i < sentenceChunks.length - 1; i++) {
            rawChunks.push({ content: sentenceChunks[i], heading: section.heading });
          }
          currentChunk = sentenceChunks[sentenceChunks.length - 1];
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      rawChunks.push({ content: currentChunk.trim(), heading: section.heading });
    }
  }

  // 3. Filter low-quality chunks and format into final TextChunks
  const finalChunks: TextChunk[] = [];
  let chunkIdx = 0;

  for (const rc of rawChunks) {
    const trimmed = rc.content.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);

    // Skip chunks below quality threshold
    if (words.length < opts.minChunkWords) {
      continue;
    }

    const tokenCount = estimateTokenCount(trimmed, opts.charsPerToken);
    const contentHash = computeContentHash(trimmed);

    finalChunks.push({
      content: trimmed,
      chunk_index: chunkIdx++,
      token_count: tokenCount,
      content_hash: contentHash,
      metadata: {
        url: docMetadata.url,
        title: docMetadata.title,
        heading: rc.heading,
        source_type: docMetadata.source_type || 'website',
        chunk_index: chunkIdx - 1,
      },
    });
  }

  // Set total_chunks in metadata
  for (const c of finalChunks) {
    c.metadata.total_chunks = finalChunks.length;
  }

  return finalChunks;
}

/**
 * Extract trailing complete sentences up to target overlap characters.
 */
function getSentenceOverlap(text: string, targetChars: number): string {
  if (!text || targetChars <= 0) return '';
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g);
  if (!sentences || sentences.length <= 1) {
    return text.slice(-targetChars).trim();
  }

  let overlap = '';
  for (let i = sentences.length - 1; i >= 0; i--) {
    const candidate = sentences[i] + overlap;
    if (candidate.length <= targetChars || overlap.length === 0) {
      overlap = candidate;
    } else {
      break;
    }
  }
  return overlap.trim();
}

/**
 * Split a large paragraph that exceeds maxChars without cutting words mid-sentence.
 */
function splitLongParagraph(paragraph: string, maxChars: number, overlapChars: number): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)/g) || [paragraph];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + s).length <= maxChars) {
      current += s;
    } else {
      if (current) {
        chunks.push(current.trim());
        const overlap = getSentenceOverlap(current, overlapChars);
        current = overlap ? `${overlap} ${s}` : s;
      } else {
        // Individual sentence is huge, split by word boundaries
        chunks.push(s.slice(0, maxChars).trim());
        current = s.slice(maxChars - overlapChars).trim();
      }
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}
