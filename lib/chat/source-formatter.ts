import { RetrievedChunk, ChatSourceCitation } from './types';

/**
 * Format and deduplicate citations from retrieved knowledge chunks
 * Excludes internal chunk IDs and removes duplicate URLs.
 */
export function formatSourceCitations(
  chunks: RetrievedChunk[],
  includeChunkId: boolean = false
): ChatSourceCitation[] {
  if (!chunks || chunks.length === 0) return [];

  const seenUrls = new Set<string>();
  const citations: ChatSourceCitation[] = [];

  for (const chunk of chunks) {
    let url = (chunk.url || '').trim();
    let title = (chunk.title || '').trim();

    if (!url && !title) continue;

    // Normalize URL key for deduplication
    const dedupeKey = (url || title).toLowerCase();
    if (seenUrls.has(dedupeKey)) continue;
    seenUrls.add(dedupeKey);

    // Fallback title from domain if title is missing
    if (!title && url) {
      try {
        title = new URL(url).pathname || 'Website Source';
      } catch {
        title = 'Website Source';
      }
    }

    citations.push({
      title: title || 'Website Knowledge',
      url: url || '#',
      chunk_id: includeChunkId ? chunk.id : undefined,
      similarity: Number(chunk.similarity.toFixed(3)),
    });
  }

  return citations;
}
