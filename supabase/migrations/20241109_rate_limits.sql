-- Rate limit buckets for persistent distributed rate limiting
create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 1,
  expires_at timestamp with time zone not null
);

create index if not exists idx_rate_limits_expires on public.rate_limits(expires_at);

-- Cleanup function for expired rate limits
create or replace function public.cleanup_expired_rate_limits()
returns void
language sql
as $$
  delete from public.rate_limits where expires_at < now();
$$;
