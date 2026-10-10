-- ==============================================================================
-- BiharStack AI - STEP 8: API Keys & Developers Platform Migration
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
