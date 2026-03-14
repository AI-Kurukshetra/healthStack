create table if not exists public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  note_type text not null check (note_type in ('soap', 'progress')),
  content text not null check (char_length(content) > 0),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (encounter_id)
);

create index if not exists idx_clinical_notes_patient_id
  on public.clinical_notes (patient_id);

create index if not exists idx_clinical_notes_provider_id
  on public.clinical_notes (provider_id);

create index if not exists idx_clinical_notes_updated_at
  on public.clinical_notes (updated_at desc);

drop trigger if exists trg_clinical_notes_set_updated_at on public.clinical_notes;
create trigger trg_clinical_notes_set_updated_at
before update on public.clinical_notes
for each row
execute function public.set_updated_at();

alter table public.clinical_notes enable row level security;

drop policy if exists clinical_notes_select_provider on public.clinical_notes;
create policy clinical_notes_select_provider
on public.clinical_notes
for select
using ((select auth.uid()) = provider_id);

drop policy if exists clinical_notes_select_patient on public.clinical_notes;
create policy clinical_notes_select_patient
on public.clinical_notes
for select
using (
  exists (
    select 1
    from public.patients p
    where p.id = clinical_notes.patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists clinical_notes_insert_provider on public.clinical_notes;
create policy clinical_notes_insert_provider
on public.clinical_notes
for insert
with check ((select auth.uid()) = provider_id);

drop policy if exists clinical_notes_update_provider on public.clinical_notes;
create policy clinical_notes_update_provider
on public.clinical_notes
for update
using ((select auth.uid()) = provider_id)
with check ((select auth.uid()) = provider_id);
