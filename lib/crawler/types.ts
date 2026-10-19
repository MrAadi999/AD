export interface KnowledgeSource {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  source_type: 'website' | 'document' | 'qa';
  url: string;
  title: string | null;
  content: string;
  content_hash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  word_count: number;
  chunks_count?: number;
  entities?: {
    phones?: string[];
    emails?: string[];
    whatsapp?: string[];
    addresses?: string[];
    pricing?: string[];
    faqs?: Array<{ question: string; answer: string }>;
    buttons?: Array<{ label: string; action: string; type: string }>;
    policies?: Record<string, string>;
    socials?: Record<string, string>;
  };
  crawled_at: string;
  created_at: string;
  updated_at: string;
}

export interface CrawlJob {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  start_url: string;
  status: 'queued' | 'crawling' | 'completed' | 'failed' | 'cancelled';
  pages_discovered: number;
  pages_processed: number;
  pages_failed: number;
  current_page?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  current_action?: string | null;
  discovered_buttons?: Array<{ label: string; action: string; type: string; page_url?: string }>;
  created_at: string;
  updated_at: string;
}

export interface CrawlStatusResponse {
  job: CrawlJob;
  percent_complete: number;
  knowledge_sources?: KnowledgeSource[];
}
