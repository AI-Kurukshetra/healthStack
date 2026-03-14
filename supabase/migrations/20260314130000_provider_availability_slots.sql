create table if not exists public.provider_availability_slots (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_provider_availability_time_range check (ends_at > starts_at),
  constraint uq_provider_availability_unique_slot unique (provider_id, starts_at, ends_at)
);

create index if not exists idx_provider_availability_starts_at
on public.provider_availability_slots(starts_at);

create index if not exists idx_provider_availability_provider_id
on public.provider_availability_slots(provider_id);

drop trigger if exists trg_provider_availability_set_updated_at on public.provider_availability_slots;
create trigger trg_provider_availability_set_updated_at
before update on public.provider_availability_slots
for each row
execute function public.set_updated_at();

alter table public.provider_availability_slots enable row level security;

drop policy if exists provider_availability_select_authenticated on public.provider_availability_slots;
create policy provider_availability_select_authenticated
on public.provider_availability_slots
for select
using ((select auth.role()) = 'authenticated' and is_available = true);

drop policy if exists provider_availability_insert_own on public.provider_availability_slots;
create policy provider_availability_insert_own
on public.provider_availability_slots
for insert
with check ((select auth.uid()) = provider_id);

drop policy if exists provider_availability_update_own on public.provider_availability_slots;
create policy provider_availability_update_own
on public.provider_availability_slots
for update
using ((select auth.uid()) = provider_id)
with check ((select auth.uid()) = provider_id);
