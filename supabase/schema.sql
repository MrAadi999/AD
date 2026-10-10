-- ==============================================================================
-- BiharStack AI - Multi-Tenant Authentication & Database Foundation
-- STEP 3: Complete Schema with Extended Chatbot Onboarding Table & RLS
-- ==============================================================================

-- Enable UUID and pgvector extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 2. WORKSPACES TABLE (Multi-Tenancy Root)
-- ==============================================================================
create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  plan text default 'free' not null check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 3. WORKSPACE MEMBERS TABLE
-- ==============================================================================
create table if not exists public.workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'owner' not null check (role in ('owner', 'admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (workspace_id, user_id)
);

-- ==============================================================================
-- 4. CHATBOTS TABLE (Extended for Step 3 Onboarding Flow)
-- ==============================================================================
create table if not exists public.chatbots (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  website_url text not null,
  industry text default 'Technology',
  language text default 'English',
  assistant_name text,
  welcome_message text default 'Hi! 👋 How can I help you today?',
  tone text default 'Friendly' check (tone in ('Friendly', 'Professional', 'Helpful', 'Casual', 'Formal')),
  response_style text default 'Balanced' check (response_style in ('Concise', 'Balanced', 'Detailed')),
  lead_collection_enabled boolean default false,
  lead_fields jsonb default '{"name": true, "email": true, "phone": false}'::jsonb,
  avatar_url text,
  avatar_type text default 'default_icon' check (avatar_type in ('upload', 'initial', 'default_icon')),
  brand_color text default '#2563EB',
  public_id text unique,
  widget_enabled boolean default true,
  allowed_domains jsonb default '[]'::jsonb,
  widget_position text default 'bottom-right' check (widget_position in ('bottom-right', 'bottom-left')),
  widget_theme jsonb default '{"theme": "light"}'::jsonb,
  status text default 'draft' not null check (status in ('draft', 'active', 'paused', 'live')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. KNOWLEDGE SOURCES TABLE (Website content & extracted pages)
-- ==============================================================================
create table if not exists public.knowledge_sources (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  source_type text default 'website' not null check (source_type in ('website', 'document', 'qa')),
  url text not null,
  title text,
  content text not null,
  content_hash text not null,
  status text default 'completed' not null check (status in ('pending', 'processing', 'completed', 'failed')),
  word_count integer default 0,
  crawled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (chatbot_id, url)
);

-- ==============================================================================
-- 6. CRAWL JOBS TABLE (Website Crawl Progress & Telemetry)
-- ==============================================================================
create table if not exists public.crawl_jobs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  start_url text not null,
  status text default 'queued' not null check (status in ('queued', 'crawling', 'completed', 'failed', 'cancelled')),
  pages_discovered integer default 0,
  pages_processed integer default 0,
  pages_failed integer default 0,
  current_page text,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 7. KNOWLEDGE CHUNKS TABLE (Vector Embedding Storage for RAG)
-- ==============================================================================
create table if not exists public.knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  knowledge_source_id uuid references public.knowledge_sources(id) on delete cascade not null,
  content text not null,
  chunk_index integer not null,
  token_count integer default 0,
  content_hash text not null,
  embedding vector(768),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 8. CONVERSATIONS & MESSAGES TABLES (Chat History & Observability)
-- ==============================================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete cascade not null,
  session_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indices for rapid querying
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_chatbots_workspace_id on public.chatbots(workspace_id);
create index if not exists idx_chatbots_public_id on public.chatbots(public_id);
create index if not exists idx_knowledge_sources_chatbot on public.knowledge_sources(chatbot_id);
create index if not exists idx_knowledge_sources_workspace on public.knowledge_sources(workspace_id);
create index if not exists idx_knowledge_sources_status on public.knowledge_sources(status);
create index if not exists idx_crawl_jobs_chatbot on public.crawl_jobs(chatbot_id);
create index if not exists idx_crawl_jobs_workspace on public.crawl_jobs(workspace_id);
create index if not exists idx_crawl_jobs_status on public.crawl_jobs(status);
create index if not exists idx_knowledge_chunks_chatbot on public.knowledge_chunks(chatbot_id);
create index if not exists idx_knowledge_chunks_workspace on public.knowledge_chunks(workspace_id);
create index if not exists idx_knowledge_chunks_source on public.knowledge_chunks(knowledge_source_id);
create index if not exists idx_knowledge_chunks_hash on public.knowledge_chunks(content_hash);
create index if not exists idx_knowledge_chunks_embedding on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists idx_conversations_workspace on public.conversations(workspace_id);
create index if not exists idx_conversations_chatbot on public.conversations(chatbot_id);
create index if not exists idx_conversations_session on public.conversations(session_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.chatbots enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.crawl_jobs enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id or auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- WORKSPACES POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view workspaces they belong to"
  on public.workspaces for select
  using (
    id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

create policy "Owners and admins can update workspace"
  on public.workspaces for update
  using (
    id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Only owners can delete workspace"
  on public.workspaces for delete
  using (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- WORKSPACE MEMBERS POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view members of their workspaces"
  on public.workspace_members for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert workspace members"
  on public.workspace_members for insert
  with check (
    user_id = auth.uid()
    or workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can remove members"
  on public.workspace_members for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- CHATBOTS POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------
create policy "Users can view chatbots of their workspaces"
  on public.chatbots for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert chatbots into their workspaces"
  on public.chatbots for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can update chatbots in their workspaces"
  on public.chatbots for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can delete chatbots in their workspaces"
  on public.chatbots for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- KNOWLEDGE SOURCES POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------
create policy "Users can view knowledge sources of their workspaces"
  on public.knowledge_sources for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert knowledge sources in their workspaces"
  on public.knowledge_sources for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can update knowledge sources in their workspaces"
  on public.knowledge_sources for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can delete knowledge sources in their workspaces"
  on public.knowledge_sources for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- CRAWL JOBS POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------
create policy "Users can view crawl jobs of their workspaces"
  on public.crawl_jobs for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert crawl jobs in their workspaces"
  on public.crawl_jobs for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can update crawl jobs in their workspaces"
  on public.crawl_jobs for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can delete crawl jobs in their workspaces"
  on public.crawl_jobs for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- KNOWLEDGE CHUNKS POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------
create policy "Users can view knowledge chunks of their workspaces"
  on public.knowledge_chunks for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert knowledge chunks in their workspaces"
  on public.knowledge_chunks for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can update knowledge chunks in their workspaces"
  on public.knowledge_chunks for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can delete knowledge chunks in their workspaces"
  on public.knowledge_chunks for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- CONVERSATIONS & MESSAGES POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view conversations in their workspaces"
  on public.conversations for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert conversations in their workspaces"
  on public.conversations for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can update conversations in their workspaces"
  on public.conversations for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Users can delete conversations in their workspaces"
  on public.conversations for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Users can view messages in their workspace conversations"
  on public.messages for select
  using (
    conversation_id in (
      select c.id from public.conversations c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their workspace conversations"
  on public.messages for insert
  with check (
    conversation_id in (
      select c.id from public.conversations c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid()
    )
  );


-- ==============================================================================
-- VECTOR SIMILARITY SEARCH RPC FUNCTION (Tenant Isolated)
-- ==============================================================================
create or replace function public.match_knowledge_chunks (
  query_embedding vector(768),
  match_chatbot_id uuid,
  match_count int default 5,
  similarity_threshold float default 0.4
)
returns table (
  id uuid,
  content text,
  similarity float,
  url text,
  title text,
  heading text,
  metadata jsonb
)
language plpgsql
security definer
as $$
declare
  v_workspace_id uuid;
begin
  -- Resolve workspace ID for requested chatbot
  select workspace_id into v_workspace_id
  from public.chatbots
  where id = match_chatbot_id;

  if v_workspace_id is null then
    return;
  end if;

  -- Ensure strict workspace isolation: user must be an active workspace member
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = v_workspace_id and user_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    kc.id,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::float as similarity,
    coalesce(kc.metadata->>'url', ks.url) as url,
    coalesce(kc.metadata->>'title', ks.title) as title,
    kc.metadata->>'heading' as heading,
    kc.metadata
  from public.knowledge_chunks kc
  join public.knowledge_sources ks on ks.id = kc.knowledge_source_id
  where kc.chatbot_id = match_chatbot_id
    and kc.workspace_id = v_workspace_id
    and (1 - (kc.embedding <=> query_embedding)) >= similarity_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ==============================================================================
-- AUTOMATIC USER & WORKSPACE PROVISIONING FUNCTION & TRIGGER
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_workspace_id uuid;
  v_company_name text;
  v_slug text;
begin
  insert into public.profiles (id, user_id, full_name, avatar_url)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    null
  );

  v_company_name := coalesce(new.raw_user_meta_data->>'company_name', 'My Workspace');
  v_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug, owner_id, plan)
  values (v_company_name, v_slug, new.id, 'free')
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- STEP 8: API KEYS & DEVELOPER PLATFORM TABLES
-- ==============================================================================

-- 1. API Keys Table
create table if not exists public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  environment text not null default 'live' check (environment in ('live', 'test')),
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_api_keys_workspace on public.api_keys(workspace_id);
create index if not exists idx_api_keys_hash on public.api_keys(key_hash);
create index if not exists idx_api_keys_prefix on public.api_keys(key_prefix);

alter table public.api_keys enable row level security;

create policy "Workspace members can view their API keys"
  on public.api_keys for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = api_keys.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can create API keys"
  on public.api_keys for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = api_keys.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can update their API keys"
  on public.api_keys for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = api_keys.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can delete their API keys"
  on public.api_keys for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = api_keys.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- 2. API Usage Tracking Table
create table if not exists public.api_usage (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  chatbot_id uuid references public.chatbots(id) on delete set null,
  request_id text not null,
  endpoint text not null,
  method text not null,
  status_code int not null,
  input_tokens int default 0 not null,
  output_tokens int default 0 not null,
  total_tokens int default 0 not null,
  latency_ms int default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_api_usage_workspace on public.api_usage(workspace_id);
create index if not exists idx_api_usage_api_key on public.api_usage(api_key_id);
create index if not exists idx_api_usage_created_at on public.api_usage(created_at);

alter table public.api_usage enable row level security;

create policy "Workspace members can view API usage"
  on public.api_usage for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = api_usage.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- 3. API Request Logs Table
create table if not exists public.api_request_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  chatbot_id uuid references public.chatbots(id) on delete set null,
  request_id text not null,
  method text not null,
  path text not null,
  status_code int not null,
  latency_ms int not null,
  error_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_api_request_logs_workspace on public.api_request_logs(workspace_id);
create index if not exists idx_api_request_logs_req_id on public.api_request_logs(request_id);
create index if not exists idx_api_request_logs_created_at on public.api_request_logs(created_at);

alter table public.api_request_logs enable row level security;

create policy "Workspace members can view API request logs"
  on public.api_request_logs for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = api_request_logs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- STEP 9: AI AGENTS PLATFORM TABLES
-- ==============================================================================

-- 1. AI Agents Table
create table if not exists public.ai_agents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  chatbot_id uuid references public.chatbots(id) on delete set null,
  name text not null,
  description text,
  purpose text not null,
  system_instructions text not null,
  model text default 'gemini-1.5-flash' not null,
  temperature numeric default 0.2 not null check (temperature >= 0.0 and temperature <= 1.0),
  max_steps int default 5 not null check (max_steps >= 1 and max_steps <= 15),
  status text default 'active' check (status in ('draft', 'active', 'paused', 'archived')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_ai_agents_workspace on public.ai_agents(workspace_id);
create index if not exists idx_ai_agents_status on public.ai_agents(status);
create index if not exists idx_ai_agents_chatbot on public.ai_agents(chatbot_id);

alter table public.ai_agents enable row level security;

create policy "Workspace members can view AI agents"
  on public.ai_agents for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = ai_agents.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can create AI agents"
  on public.ai_agents for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = ai_agents.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can update AI agents"
  on public.ai_agents for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = ai_agents.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can delete AI agents"
  on public.ai_agents for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = ai_agents.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- 2. Agent Tools Table
create table if not exists public.agent_tools (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  agent_id uuid references public.ai_agents(id) on delete cascade not null,
  tool_type text not null check (tool_type in ('knowledge_search', 'calculator', 'http_request', 'configured_api', 'custom')),
  name text not null,
  description text not null,
  configuration jsonb default '{}'::jsonb not null,
  enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_agent_tools_agent on public.agent_tools(agent_id);
create index if not exists idx_agent_tools_workspace on public.agent_tools(workspace_id);
create index if not exists idx_agent_tools_type on public.agent_tools(tool_type);

alter table public.agent_tools enable row level security;

create policy "Workspace members can view agent tools"
  on public.agent_tools for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_tools.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can manage agent tools"
  on public.agent_tools for all
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_tools.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- 3. Agent Runs & Execution Trace Table
create table if not exists public.agent_runs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  agent_id uuid references public.ai_agents(id) on delete cascade not null,
  conversation_id text,
  status text default 'completed' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')) not null,
  input text not null,
  output text,
  steps jsonb default '[]'::jsonb not null,
  tool_calls_count int default 0 not null,
  input_tokens int default 0 not null,
  output_tokens int default 0 not null,
  total_tokens int default 0 not null,
  latency_ms int default 0 not null,
  error_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

create index if not exists idx_agent_runs_workspace on public.agent_runs(workspace_id);
create index if not exists idx_agent_runs_agent on public.agent_runs(agent_id);
create index if not exists idx_agent_runs_created_at on public.agent_runs(created_at);

alter table public.agent_runs enable row level security;

create policy "Workspace members can view agent runs"
  on public.agent_runs for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can insert agent runs"
  on public.agent_runs for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );


