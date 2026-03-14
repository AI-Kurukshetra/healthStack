drop policy if exists patients_select_org_admin on public.patients;
create policy patients_select_org_admin
on public.patients
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = patients.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists appointments_select_org_admin on public.appointments;
create policy appointments_select_org_admin
on public.appointments
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = appointments.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists encounters_select_org_admin on public.encounters;
create policy encounters_select_org_admin
on public.encounters
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = encounters.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists clinical_notes_select_org_admin on public.clinical_notes;
create policy clinical_notes_select_org_admin
on public.clinical_notes
for select
using (
  public.is_member_of_org(organization_id)
  and exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = clinical_notes.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  )
);
