create table if not exists public.patient_prescriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_patient_prescriptions_patient_id
  on public.patient_prescriptions (patient_id);

create index if not exists idx_patient_prescriptions_org_id
  on public.patient_prescriptions (organization_id);

create index if not exists idx_patient_prescriptions_created_at
  on public.patient_prescriptions (created_at desc);

alter table public.patient_prescriptions enable row level security;

drop policy if exists patient_prescriptions_select_patient on public.patient_prescriptions;
create policy patient_prescriptions_select_patient
on public.patient_prescriptions
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.patients p
    where p.id = patient_prescriptions.patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists patient_prescriptions_insert_patient on public.patient_prescriptions;
create policy patient_prescriptions_insert_patient
on public.patient_prescriptions
for insert
with check (
  public.is_member_of_org(organization_id)
  and uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.patients p
    where p.id = patient_prescriptions.patient_id
      and p.user_id = (select auth.uid())
      and p.organization_id = patient_prescriptions.organization_id
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-prescriptions',
  'patient-prescriptions',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists patient_prescriptions_storage_insert on storage.objects;
create policy patient_prescriptions_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'patient-prescriptions'
  and name like ((select auth.uid())::text || '/%')
);

drop policy if exists patient_prescriptions_storage_select on storage.objects;
create policy patient_prescriptions_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-prescriptions'
  and name like ((select auth.uid())::text || '/%')
);
