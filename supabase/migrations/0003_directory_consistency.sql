-- Supabase is the source of truth for the directory: lock down publishing and serve the
-- county filter from the current listings instead of the launch snapshot.

-- 0001 revoked EXECUTE on publish_import from public only. Supabase's default privileges
-- grant it to anon and authenticated directly, so anyone holding the publishable key could
-- call this security-definer function and retire every provider missing from a draft batch.
revoke all on function public.publish_import(uuid) from public, anon, authenticated;
grant execute on function public.publish_import(uuid) to service_role;

-- Counties that have a current listing: the search page's county options and the values its
-- county filter accepts. Distinct in SQL, so the result is not cut at PostgREST's row limit.
create or replace function public.directory_counties()
returns table (county text)
language sql
stable
set search_path = public
as $$
  select distinct l.county from provider_locations l where l.is_current order by l.county;
$$;

revoke all on function public.directory_counties() from public, anon, authenticated;
grant execute on function public.directory_counties() to service_role;

notify pgrst, 'reload schema';
