create extension if not exists pg_trgm;

create table if not exists public.app_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_operators (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_locations (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references public.provider_operators(id) on delete set null,
  license_number text not null unique,
  slug text not null unique,
  program_name text not null,
  company text not null,
  tier text not null,
  address text not null,
  city text not null,
  county text not null,
  zip text not null,
  phone text,
  license_status text not null,
  status_class text not null check (status_class in ('active', 'caution', 'critical')),
  tags text[] not null default '{}',
  primary_tag text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_locations_status_county_idx on public.provider_locations (is_current, status_class, county);
create index if not exists provider_locations_tags_idx on public.provider_locations using gin (tags);
create index if not exists provider_locations_search_idx on public.provider_locations using gin (to_tsvector('english', coalesce(program_name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(city, '') || ' ' || coalesce(county, '')));
create index if not exists provider_locations_name_trgm_idx on public.provider_locations using gin (program_name gin_trgm_ops);
create index if not exists provider_locations_company_trgm_idx on public.provider_locations using gin (company gin_trgm_ops);

create table if not exists public.service_tags (
  name text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.location_service_tags (
  location_id uuid not null references public.provider_locations(id) on delete cascade,
  tag_name text not null references public.service_tags(name) on delete cascade,
  primary key (location_id, tag_name)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('draft', 'invalid', 'published', 'failed')),
  source_filename text not null,
  storage_path text not null,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  issues jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_claims (
  id uuid primary key default gen_random_uuid(),
  license_number text not null references public.provider_locations(license_number) on delete cascade,
  claimant_name text not null,
  claimant_email text not null,
  claimant_role text not null,
  claimant_phone text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_profiles (
  license_number text primary key references public.provider_locations(license_number) on delete cascade,
  description text,
  website text,
  contact_email text,
  contact_phone text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.app_roles where user_id = auth.uid() and role = 'admin') $$;

alter table public.app_roles enable row level security;
alter table public.provider_locations enable row level security;
alter table public.provider_operators enable row level security;
alter table public.service_tags enable row level security;
alter table public.location_service_tags enable row level security;
alter table public.import_batches enable row level security;
alter table public.provider_claims enable row level security;
alter table public.provider_profiles enable row level security;

revoke all on public.app_roles, public.provider_locations, public.provider_operators, public.service_tags, public.location_service_tags, public.import_batches, public.provider_claims, public.provider_profiles from anon, authenticated;
grant select on public.provider_locations, public.provider_operators, public.service_tags, public.location_service_tags, public.provider_profiles to anon, authenticated;

create policy "public reads current provider locations" on public.provider_locations for select using (is_current = true);
create policy "public reads provider operators" on public.provider_operators for select using (true);
create policy "public reads service tags" on public.service_tags for select using (true);
create policy "public reads provider tag assignments" on public.location_service_tags for select using (true);
create policy "public reads provider supplied profiles" on public.provider_profiles for select using (true);

insert into storage.buckets (id, name, public) values ('imports', 'imports', false) on conflict (id) do nothing;
create policy "administrators manage import files" on storage.objects for all to authenticated using (bucket_id = 'imports' and public.is_admin()) with check (bucket_id = 'imports' and public.is_admin());

create or replace function public.publish_import(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.import_batches%rowtype;
  v_row jsonb;
  v_operator_id uuid;
  v_location_id uuid;
  v_tags text[];
  v_tag text;
  v_licenses text[] := '{}';
begin
  select * into v_batch from public.import_batches where id = p_batch_id for update;
  if not found then raise exception 'Import batch not found'; end if;
  if v_batch.status <> 'draft' or jsonb_array_length(v_batch.snapshot) = 0 then raise exception 'Only a non-empty valid draft can be published'; end if;

  for v_row in select value from jsonb_array_elements(v_batch.snapshot)
  loop
    v_tags := array(select jsonb_array_elements_text(v_row->'tags'));
    v_licenses := array_append(v_licenses, v_row->>'license_number');
    insert into public.provider_operators (name, normalized_name)
    values (v_row->>'company', lower(v_row->>'company'))
    on conflict (name) do update set normalized_name = excluded.normalized_name, updated_at = now()
    returning id into v_operator_id;

    insert into public.provider_locations (operator_id, license_number, slug, program_name, company, tier, address, city, county, zip, phone, license_status, status_class, tags, primary_tag, is_current, updated_at)
    values (v_operator_id, v_row->>'license_number', v_row->>'slug', v_row->>'program_name', v_row->>'company', v_row->>'tier', v_row->>'address', v_row->>'city', v_row->>'county', v_row->>'zip', nullif(v_row->>'phone', ''), v_row->>'license_status', v_row->>'status_class', v_tags, v_row->>'primary_tag', true, now())
    on conflict (license_number) do update set operator_id = excluded.operator_id, slug = excluded.slug, program_name = excluded.program_name, company = excluded.company, tier = excluded.tier, address = excluded.address, city = excluded.city, county = excluded.county, zip = excluded.zip, phone = excluded.phone, license_status = excluded.license_status, status_class = excluded.status_class, tags = excluded.tags, primary_tag = excluded.primary_tag, is_current = true, updated_at = now()
    returning id into v_location_id;

    delete from public.location_service_tags where location_id = v_location_id;
    foreach v_tag in array v_tags loop
      insert into public.service_tags (name) values (v_tag) on conflict (name) do nothing;
      insert into public.location_service_tags (location_id, tag_name) values (v_location_id, v_tag) on conflict do nothing;
    end loop;
  end loop;

  update public.provider_locations set is_current = false, updated_at = now() where is_current = true and not (license_number = any(v_licenses));
  update public.import_batches set status = 'published', published_at = now() where id = p_batch_id;
exception when others then
  update public.import_batches set status = 'failed' where id = p_batch_id;
  raise;
end;
$$;

revoke all on function public.publish_import(uuid) from public;
grant execute on function public.publish_import(uuid) to service_role;
