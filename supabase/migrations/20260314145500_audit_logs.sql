create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_occurred_at
  on public.audit_logs (occurred_at desc);

create index if not exists idx_audit_logs_actor_id
  on public.audit_logs (actor_id);

create index if not exists idx_audit_logs_event_type
  on public.audit_logs (event_type);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_insert_actor_or_anonymous on public.audit_logs;
create policy audit_logs_insert_actor_or_anonymous
on public.audit_logs
for insert
with check (
  actor_id is null
  or actor_id = (select auth.uid())
);

drop policy if exists audit_logs_select_actor_or_admin on public.audit_logs;
create policy audit_logs_select_actor_or_admin
on public.audit_logs
for select
using (
  actor_id = (select auth.uid())
  or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
