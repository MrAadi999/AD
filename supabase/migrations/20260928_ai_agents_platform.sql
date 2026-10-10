-- ==============================================================================
-- BiharStack AI - STEP 9: AI Agents Platform Migration
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
