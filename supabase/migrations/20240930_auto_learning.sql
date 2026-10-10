-- ==============================================================================
-- BiharStack AI - Continuous Self-Learning, Dynamic Memory & Hybrid RAG Schema
-- STEP 9: Auto-Learned Memories, Feedback Loop & Knowledge Gap Tracking
-- ==============================================================================

-- 1. INTERACTION FEEDBACK TABLE (Captures 👍 / 👎, corrections, and user ratings)
create table if not exists public.interaction_feedback (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  rating integer not null check (rating in (1, -1)), -- 1 = Thumbs up, -1 = Thumbs down
  feedback_type text default 'helpful' check (feedback_type in ('helpful', 'inaccurate', 'correction', 'missing_info', 'hallucination')),
  user_comment text,
  corrected_answer text,
  status text default 'pending' check (status in ('pending', 'auto_learned', 'reviewed', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. LEARNED MEMORIES TABLE (ChatGPT-Style Dynamic Distilled Knowledge & Facts)
create table if not exists public.learned_memories (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  fact_content text not null,
  category text default 'business_fact' check (category in ('business_fact', 'policy', 'pricing_update', 'qa_pair', 'user_preference')),
  confidence_score double precision default 0.85,
  source_type text default 'user_correction' check (source_type in ('user_correction', 'conversation_distillation', 'feedback_auto_learned', 'admin_override')),
  source_ref text, -- conversation_id, message_id, or interaction_id
  embedding vector(768),
  is_approved boolean default true,
  usage_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. KNOWLEDGE GAPS TABLE (Tracks unanswered queries & missing documentation)
create table if not exists public.knowledge_gaps (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  query_text text not null,
  frequency integer default 1,
  status text default 'detected' check (status in ('detected', 'resolved', 'ignored')),
  suggested_answer text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indices for rapid hybrid retrieval
create index if not exists idx_feedback_chatbot on public.interaction_feedback(chatbot_id);
create index if not exists idx_learned_memories_chatbot on public.learned_memories(chatbot_id);
create index if not exists idx_knowledge_gaps_chatbot on public.knowledge_gaps(chatbot_id);

-- 4. VECTOR SIMILARITY FUNCTION FOR LEARNED MEMORIES
create or replace function match_learned_memories(
  query_embedding vector(768),
  match_chatbot_id uuid,
  match_count integer default 5,
  similarity_threshold double precision default 0.35
)
returns table (
  id uuid,
  chatbot_id uuid,
  fact_content text,
  category text,
  confidence_score double precision,
  source_type text,
  similarity double precision
)
language plpgsql
stable
as $$
begin
  return query
  select
    lm.id,
    lm.chatbot_id,
    lm.fact_content,
    lm.category,
    lm.confidence_score,
    lm.source_type,
    (1 - (lm.embedding <=> query_embedding)) as similarity
  from public.learned_memories lm
  where lm.chatbot_id = match_chatbot_id
    and lm.is_approved = true
    and (1 - (lm.embedding <=> query_embedding)) >= similarity_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- 5. HYBRID SEARCH RPC FUNCTION (Full-Text Search + Semantic Vector Search with Reciprocal Rank Fusion)
create or replace function hybrid_search_knowledge(
  query_text text,
  query_embedding vector(768),
  match_chatbot_id uuid,
  match_count integer default 6,
  vector_weight double precision default 0.7,
  text_weight double precision default 0.3
)
returns table (
  id uuid,
  knowledge_source_id uuid,
  content text,
  chunk_index integer,
  token_count integer,
  metadata jsonb,
  combined_score double precision
)
language plpgsql
stable
as $$
begin
  return query
  with vector_results as (
    select
      kc.id,
      kc.knowledge_source_id,
      kc.content,
      kc.chunk_index,
      kc.token_count,
      kc.metadata,
      (1 - (kc.embedding <=> query_embedding)) as vec_score
    from public.knowledge_chunks kc
    where kc.chatbot_id = match_chatbot_id
      and (1 - (kc.embedding <=> query_embedding)) > 0.25
    order by vec_score desc
    limit 20
  ),
  text_results as (
    select
      kc.id,
      kc.knowledge_source_id,
      kc.content,
      kc.chunk_index,
      kc.token_count,
      kc.metadata,
      ts_rank_cd(to_tsvector('english', kc.content), plainto_tsquery('english', query_text)) as txt_score
    from public.knowledge_chunks kc
    where kc.chatbot_id = match_chatbot_id
      and to_tsvector('english', kc.content) @@ plainto_tsquery('english', query_text)
    limit 20
  )
  select
    coalesce(v.id, t.id) as id,
    coalesce(v.knowledge_source_id, t.knowledge_source_id) as knowledge_source_id,
    coalesce(v.content, t.content) as content,
    coalesce(v.chunk_index, t.chunk_index) as chunk_index,
    coalesce(v.token_count, t.token_count) as token_count,
    coalesce(v.metadata, t.metadata) as metadata,
    ((coalesce(v.vec_score, 0.0) * vector_weight) + (coalesce(t.txt_score, 0.0) * text_weight)) as combined_score
  from vector_results v
  full outer join text_results t on v.id = t.id
  order by combined_score desc
  limit match_count;
end;
$$;
