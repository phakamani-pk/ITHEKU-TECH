-- This table is separate from any existing enquiry and portal tables.
create table public.public_leads (
  request_id uuid primary key,
  name text not null,
  email text not null,
  company text not null,
  service text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index public_leads_email_created_at_idx on public.public_leads (email, created_at desc);
alter table public.public_leads enable row level security;
revoke all on public.public_leads from public, anon, authenticated;
grant all on public.public_leads to service_role;

create function public.submit_public_lead(
  p_request_id uuid, p_name text, p_email text, p_company text, p_service text, p_message text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
begin
  if p_request_id is null or p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or p_email is null or char_length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_company is null or char_length(btrim(p_company)) > 100
    or p_service is null or char_length(btrim(p_service)) not between 1 and 100
    or p_message is null or char_length(btrim(p_message)) not between 10 and 5000 then
    raise exception 'invalid_lead';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 1));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized_email, 0));
  if exists (select 1 from public.public_leads where request_id = p_request_id) then
    if exists (
      select 1 from public.public_leads
      where request_id = p_request_id and name = btrim(p_name) and email = normalized_email
        and company = btrim(p_company) and service = btrim(p_service) and message = btrim(p_message)
    ) then
      return;
    end if;
    raise exception 'request_id_conflict';
  end if;
  if (select count(*) from public.public_leads
      where email = normalized_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'lead_rate_limit';
  end if;
  insert into public.public_leads (request_id, name, email, company, service, message)
  values (p_request_id, btrim(p_name), normalized_email, btrim(p_company), btrim(p_service), btrim(p_message));
end;
$$;

revoke all on function public.submit_public_lead(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_public_lead(uuid, text, text, text, text, text) to anon, authenticated, service_role;