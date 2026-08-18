create table if not exists public.deployment_events (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('success','error')),
  commit_sha text,
  actor text,
  run_url text,
  created_at timestamptz not null default now()
);

alter table public.deployment_events enable row level security;
revoke all on public.deployment_events from anon, authenticated;
grant all on public.deployment_events to service_role;
