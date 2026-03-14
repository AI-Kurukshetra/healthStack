create extension if not exists "pgcrypto";

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_patients_user_id on public.patients(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_patients_set_updated_at on public.patients;
create trigger trg_patients_set_updated_at
before update on public.patients
for each row
execute function public.set_updated_at();

alter table public.patients enable row level security;

drop policy if exists patients_select_own on public.patients;
create policy patients_select_own
on public.patients
for select
using ((select auth.uid()) = user_id);

drop policy if exists patients_insert_own on public.patients;
create policy patients_insert_own
on public.patients
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists patients_update_own on public.patients;
create policy patients_update_own
on public.patients
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
