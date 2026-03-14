create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  brand_primary_color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'provider', 'patient', 'staff')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create index if not exists idx_org_memberships_user_id
  on public.organization_memberships(user_id);

create index if not exists idx_org_memberships_org_id
  on public.organization_memberships(organization_id);

create or replace function public.is_member_of_org(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.default_organization_id()
returns uuid
language sql
stable
as $$
  select id
  from public.organizations
  where slug = 'default-org'
  order by created_at asc
  limit 1
$$;

insert into public.organizations (slug, name)
values ('default-org', 'Default Health Stack Organization')
on conflict (slug) do nothing;

insert into public.organization_memberships (organization_id, user_id, role)
select
  (select public.default_organization_id()),
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'role', ''), 'patient')
from auth.users u
where not exists (
  select 1
  from public.organization_memberships m
  where m.organization_id = (select public.default_organization_id())
    and m.user_id = u.id
)
on conflict (organization_id, user_id) do nothing;

alter table public.patients
  add column if not exists organization_id uuid;

alter table public.provider_availability_slots
  add column if not exists organization_id uuid;

alter table public.appointments
  add column if not exists organization_id uuid;

alter table public.encounters
  add column if not exists organization_id uuid;

alter table public.clinical_notes
  add column if not exists organization_id uuid;

alter table public.audit_logs
  add column if not exists organization_id uuid;

update public.patients p
set organization_id = coalesce(
  (
    select m.organization_id
    from public.organization_memberships m
    where m.user_id = p.user_id
    order by m.created_at asc
    limit 1
  ),
  (select public.default_organization_id())
)
where p.organization_id is null;

update public.provider_availability_slots s
set organization_id = coalesce(
  (
    select m.organization_id
    from public.organization_memberships m
    where m.user_id = s.provider_id
    order by m.created_at asc
    limit 1
  ),
  (select public.default_organization_id())
)
where s.organization_id is null;

update public.appointments a
set organization_id = coalesce(
  (
    select s.organization_id
    from public.provider_availability_slots s
    where s.id = a.slot_id
  ),
  (
    select p.organization_id
    from public.patients p
    where p.id = a.patient_id
  ),
  (select public.default_organization_id())
)
where a.organization_id is null;

update public.encounters e
set organization_id = coalesce(
  (
    select a.organization_id
    from public.appointments a
    where a.id = e.appointment_id
  ),
  (select public.default_organization_id())
)
where e.organization_id is null;

update public.clinical_notes n
set organization_id = coalesce(
  (
    select e.organization_id
    from public.encounters e
    where e.id = n.encounter_id
  ),
  (select public.default_organization_id())
)
where n.organization_id is null;

update public.audit_logs l
set organization_id = coalesce(
  (
    select m.organization_id
    from public.organization_memberships m
    where m.user_id = l.actor_id
    order by m.created_at asc
    limit 1
  ),
  (select public.default_organization_id())
)
where l.organization_id is null;

alter table public.patients
  alter column organization_id set not null;

alter table public.provider_availability_slots
  alter column organization_id set not null;

alter table public.appointments
  alter column organization_id set not null;

alter table public.encounters
  alter column organization_id set not null;

alter table public.clinical_notes
  alter column organization_id set not null;

alter table public.audit_logs
  alter column organization_id set not null;

alter table public.patients
  alter column organization_id set default public.default_organization_id();

alter table public.provider_availability_slots
  alter column organization_id set default public.default_organization_id();

alter table public.appointments
  alter column organization_id set default public.default_organization_id();

alter table public.encounters
  alter column organization_id set default public.default_organization_id();

alter table public.clinical_notes
  alter column organization_id set default public.default_organization_id();

alter table public.audit_logs
  alter column organization_id set default public.default_organization_id();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patients_organization_id_fkey'
      and conrelid = 'public.patients'::regclass
  ) then
    alter table public.patients
      add constraint patients_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_availability_slots_organization_id_fkey'
      and conrelid = 'public.provider_availability_slots'::regclass
  ) then
    alter table public.provider_availability_slots
      add constraint provider_availability_slots_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_organization_id_fkey'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'encounters_organization_id_fkey'
      and conrelid = 'public.encounters'::regclass
  ) then
    alter table public.encounters
      add constraint encounters_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'clinical_notes_organization_id_fkey'
      and conrelid = 'public.clinical_notes'::regclass
  ) then
    alter table public.clinical_notes
      add constraint clinical_notes_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_logs_organization_id_fkey'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict;
  end if;
end
$$;

create index if not exists idx_patients_organization_id
  on public.patients(organization_id);

create index if not exists idx_provider_availability_organization_id
  on public.provider_availability_slots(organization_id);

create index if not exists idx_appointments_organization_id
  on public.appointments(organization_id);

create index if not exists idx_encounters_organization_id
  on public.encounters(organization_id);

create index if not exists idx_clinical_notes_organization_id
  on public.clinical_notes(organization_id);

create index if not exists idx_audit_logs_organization_id
  on public.audit_logs(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

drop policy if exists organizations_select_members on public.organizations;
create policy organizations_select_members
on public.organizations
for select
using (public.is_member_of_org(id));

drop policy if exists organization_memberships_select_member_or_org_admin on public.organization_memberships;
create policy organization_memberships_select_member_or_org_admin
on public.organization_memberships
for select
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = organization_memberships.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists patients_select_own on public.patients;
create policy patients_select_own
on public.patients
for select
using (
  (select auth.uid()) = user_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists patients_insert_own on public.patients;
create policy patients_insert_own
on public.patients
for insert
with check (
  (select auth.uid()) = user_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists patients_update_own on public.patients;
create policy patients_update_own
on public.patients
for update
using (
  (select auth.uid()) = user_id
  and public.is_member_of_org(organization_id)
)
with check (
  (select auth.uid()) = user_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists provider_availability_select_authenticated on public.provider_availability_slots;
create policy provider_availability_select_authenticated
on public.provider_availability_slots
for select
using (
  (select auth.role()) = 'authenticated'
  and is_available = true
  and public.is_member_of_org(organization_id)
);

drop policy if exists provider_availability_insert_own on public.provider_availability_slots;
create policy provider_availability_insert_own
on public.provider_availability_slots
for insert
with check (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists provider_availability_update_own on public.provider_availability_slots;
create policy provider_availability_update_own
on public.provider_availability_slots
for update
using (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
)
with check (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists appointments_select_patient on public.appointments;
create policy appointments_select_patient
on public.appointments
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
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
using (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists appointments_insert_patient on public.appointments;
create policy appointments_insert_patient
on public.appointments
for insert
with check (
  public.is_member_of_org(organization_id)
  and exists (
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
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists encounters_select_provider on public.encounters;
create policy encounters_select_provider
on public.encounters
for select
using (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists encounters_select_patient on public.encounters;
create policy encounters_select_patient
on public.encounters
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
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
with check (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists encounters_update_provider on public.encounters;
create policy encounters_update_provider
on public.encounters
for update
using (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
)
with check (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists encounters_update_patient on public.encounters;
create policy encounters_update_patient
on public.encounters
for update
using (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists clinical_notes_select_provider on public.clinical_notes;
create policy clinical_notes_select_provider
on public.clinical_notes
for select
using (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists clinical_notes_select_patient on public.clinical_notes;
create policy clinical_notes_select_patient
on public.clinical_notes
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
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
with check (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists clinical_notes_update_provider on public.clinical_notes;
create policy clinical_notes_update_provider
on public.clinical_notes
for update
using (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
)
with check (
  (select auth.uid()) = provider_id
  and public.is_member_of_org(organization_id)
);

drop policy if exists audit_logs_insert_actor_or_anonymous on public.audit_logs;
create policy audit_logs_insert_actor_or_anonymous
on public.audit_logs
for insert
with check (
  public.is_member_of_org(organization_id)
  and (actor_id is null or actor_id = (select auth.uid()))
);

drop policy if exists audit_logs_select_actor_or_admin on public.audit_logs;
create policy audit_logs_select_actor_or_admin
on public.audit_logs
for select
using (
  public.is_member_of_org(organization_id)
  and (
    actor_id = (select auth.uid())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
);
