create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  slot_id uuid not null references public.provider_availability_slots(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_appointments_time_range check (ends_at > starts_at)
);

create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_appointments_provider_id on public.appointments(provider_id);
create index if not exists idx_appointments_starts_at on public.appointments(starts_at);

drop trigger if exists trg_appointments_set_updated_at on public.appointments;
create trigger trg_appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

alter table public.appointments enable row level security;

drop policy if exists appointments_select_patient on public.appointments;
create policy appointments_select_patient
on public.appointments
for select
using (
  exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists appointments_select_provider on public.appointments;
create policy appointments_select_provider
on public.appointments
for select
using ((select auth.uid()) = provider_id);

drop policy if exists appointments_insert_patient on public.appointments;
create policy appointments_insert_patient
on public.appointments
for insert
with check (
  exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists appointments_update_patient on public.appointments;
create policy appointments_update_patient
on public.appointments
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
