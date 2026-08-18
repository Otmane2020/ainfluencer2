create table if not exists public.generation_billing_reservations (
  request_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'higgsfield',
  endpoint text not null,
  credits integer not null check (credits > 0),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_billing_reservations_user_id_idx
  on public.generation_billing_reservations(user_id, created_at desc);

alter table public.generation_billing_reservations enable row level security;

-- Users may inspect their own billing reservations. Writes are performed by
-- service-role Edge Functions so credit charging/refunds cannot be forged client-side.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generation_billing_reservations'
      and policyname = 'Users can view own generation billing reservations'
  ) then
    create policy "Users can view own generation billing reservations"
      on public.generation_billing_reservations
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
