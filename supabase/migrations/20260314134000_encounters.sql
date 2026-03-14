create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'connected', 'completed')),
  started_at timestamptz,
  patient_joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint encounters_appointment_unique unique (appointment_id)
);

create index if not exists idx_encounters_appointment_id on public.encounters(appointment_id);
create index if not exists idx_encounters_provider_id on public.encounters(provider_id);
create index if not exists idx_encounters_patient_id on public.encounters(patient_id);

drop trigger if exists trg_encounters_set_updated_at on public.encounters;
create trigger trg_encounters_set_updated_at
before update on public.encounters
for each row
execute function public.set_updated_at();

alter table public.encounters enable row level security;

drop policy if exists encounters_select_provider on public.encounters;
create policy encounters_select_provider
on public.encounters
for select
using ((select auth.uid()) = provider_id);

drop policy if exists encounters_select_patient on public.encounters;
create policy encounters_select_patient
on public.encounters
for select
using (
  exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists encounters_insert_provider on public.encounters;
create policy encounters_insert_provider
on public.encounters
for insert
with check ((select auth.uid()) = provider_id);

drop policy if exists encounters_update_provider on public.encounters;
create policy encounters_update_provider
on public.encounters
for update
using ((select auth.uid()) = provider_id)
with check ((select auth.uid()) = provider_id);

drop policy if exists encounters_update_patient on public.encounters;
create policy encounters_update_patient
on public.encounters
for update
using (
  exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
);
