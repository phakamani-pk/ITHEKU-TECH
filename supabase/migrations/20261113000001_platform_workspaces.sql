-- Separate workspace tables; existing portal tables are left untouched.
create table public.platform_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default ''
);

create table public.platform_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.platform_profiles(id),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  description text not null default '' check (char_length(description) <= 5000),
  status text not null default 'planning' check (status in ('planning', 'in_progress', 'review', 'completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.platform_projects(id) on delete cascade,
  author_id uuid not null references public.platform_profiles(id),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.platform_project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.platform_projects(id) on delete cascade,
  sender_id uuid not null references public.platform_profiles(id),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index platform_projects_client_id_idx on public.platform_projects (client_id);
create index platform_updates_project_idx on public.platform_project_updates (project_id, created_at desc);
create index platform_messages_project_idx on public.platform_project_messages (project_id, created_at);

create function public.platform_sync_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.platform_profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email, display_name = excluded.display_name;
  return new;
end;
$$;
revoke all on function public.platform_sync_profile() from public, anon, authenticated;

create trigger platform_sync_auth_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.platform_sync_profile();

insert into public.platform_profiles (id, email, display_name)
select id, coalesce(email, ''), coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

create function public.platform_is_staff() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'staff'), false) $$;
revoke all on function public.platform_is_staff() from public, anon;
grant execute on function public.platform_is_staff() to authenticated;

alter table public.platform_profiles enable row level security;
alter table public.platform_projects enable row level security;
alter table public.platform_project_updates enable row level security;
alter table public.platform_project_messages enable row level security;

revoke all on public.platform_profiles, public.platform_projects, public.platform_project_updates, public.platform_project_messages from public, anon, authenticated;
grant select on public.platform_profiles to authenticated;
grant select, insert on public.platform_projects to authenticated;
grant update (name, description, status, progress, updated_at) on public.platform_projects to authenticated;
grant select, insert on public.platform_project_updates, public.platform_project_messages to authenticated;
grant all on public.platform_profiles, public.platform_projects, public.platform_project_updates, public.platform_project_messages to service_role;

create policy platform_profiles_read on public.platform_profiles for select to authenticated
using (id = auth.uid() or public.platform_is_staff());
create policy platform_projects_read on public.platform_projects for select to authenticated
using (client_id = auth.uid() or public.platform_is_staff());
create policy platform_projects_insert on public.platform_projects for insert to authenticated
with check (public.platform_is_staff());
create policy platform_projects_update on public.platform_projects for update to authenticated
using (public.platform_is_staff()) with check (public.platform_is_staff());
create policy platform_updates_read on public.platform_project_updates for select to authenticated
using (exists (select 1 from public.platform_projects p where p.id = project_id and (p.client_id = auth.uid() or public.platform_is_staff())));
create policy platform_updates_insert on public.platform_project_updates for insert to authenticated
with check (public.platform_is_staff() and author_id = auth.uid());
create policy platform_messages_read on public.platform_project_messages for select to authenticated
using (exists (select 1 from public.platform_projects p where p.id = project_id and (p.client_id = auth.uid() or public.platform_is_staff())));
create policy platform_messages_insert on public.platform_project_messages for insert to authenticated
with check (sender_id = auth.uid() and exists (select 1 from public.platform_projects p where p.id = project_id and (p.client_id = auth.uid() or public.platform_is_staff())));
