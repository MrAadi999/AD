import { runNativeCrawl } from '../lib/crawler/native-crawler';
import { readJobStateFromFile, inMemoryKnowledgeSources } from '../lib/crawler/runner';

async function main() {
  const jobId = 'crawl-hqq6ftmd';
  const chatbotId = 'bot-u6fmom6';
  const workspaceId = 'ws-demo-01';
  const websiteUrl = 'https://biharstack.com';

  console.log('Testing Native Crawler for:', { websiteUrl, chatbotId });
  await runNativeCrawl(jobId, chatbotId, workspaceId, websiteUrl);

  const state = readJobStateFromFile(jobId);
  console.log('Final Job State:', {
    status: state?.status,
    pages_discovered: state?.pages_discovered,
    pages_processed: state?.pages_processed,
    pages_count: state?.pages?.length,
  });

  const sources = inMemoryKnowledgeSources.get(chatbotId) || [];
  console.log(`Knowledge Sources for ${chatbotId}:`, sources.length);
  for (const s of sources) {
    console.log(`- [${s.status}] ${s.title} (${s.url}) - ${s.word_count} words`);
  }
}

main().catch(console.error);
