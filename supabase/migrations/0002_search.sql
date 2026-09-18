-- V2.1 directory search: typo-tolerant, ranked, filtered and paginated in one round trip.

-- Every searchable field in one string, so a single trigram index serves both the
-- substring and the fuzzy checks (0001's indexes cover program_name and company only).
create or replace function public.provider_search_text(program_name text, company text, city text, county text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select program_name || ' ' || company || ' ' || city || ' ' || county $$;

create index if not exists provider_locations_search_text_trgm_idx
  on public.provider_locations
  using gin (public.provider_search_text(program_name, company, city, county) gin_trgm_ops);

-- Every word of the query must appear in the provider's name, company, city or county,
-- either verbatim or as a close trigram match (a typo). Results rank exact names first,
-- then prefixes, then verbatim words, then typo matches. p_offset is clamped to the last
-- page, so a page is only ever empty when nothing matches.
create or replace function public.search_directory(
  p_query text default '',
  p_county text default '',
  p_tags text[] default '{}',
  p_status text default 'active',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, program_name text, company text, tier text, address text, city text,
  county text, zip text, phone text, license_status text, status_class text, license_number text,
  tags text[], primary_tag text, total_count bigint
)
language plpgsql
stable
set search_path = public
as $$
#variable_conflict use_column
declare
  v_query text := regexp_replace(lower(btrim(coalesce(p_query, ''))), '\s+', ' ', 'g');
  v_terms text[] := array_remove(string_to_array(v_query, ' '), '');
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_lead text;
  v_lead_pattern text;
  v_caller_threshold text := current_setting('pg_trgm.word_similarity_threshold', true);
begin
  -- 0.5 lets "Duluht" (0.57 to Duluth) and "Rochster" (0.58) through, which the 0.6 default
  -- rejects; at 0.4 "Minneapols" already matches 58 rows instead of Minneapolis's 33.
  -- Set at run time and restored below: a SET clause on the function is refused for Supabase's
  -- non-superuser postgres role whenever pg_trgm's library isn't loaded yet (re-runs, restores).
  perform set_config('pg_trgm.word_similarity_threshold', '0.5', true);

  -- The longest word drives an index-eligible prefilter (ILIKE and <% both use the trigram
  -- index); it is implied by the per-word check, which alone decides what matches.
  select t into v_lead from unnest(v_terms) as t order by length(t) desc limit 1;
  v_lead_pattern := '%' || replace(replace(replace(v_lead, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  with matches as (
    select l.*,
      case
        when v_query = '' then 0
        when lower(l.program_name) = v_query or lower(l.company) = v_query then 4
        when starts_with(lower(l.program_name), v_query) or starts_with(lower(l.company), v_query)
          or starts_with(lower(l.city), v_query) or starts_with(lower(l.county), v_query) then 3
        when not exists (select 1 from unnest(v_terms) as t where strpos(lower(s.search_text), t) = 0) then 2
        else 1
      end as score,
      word_similarity(v_query, s.search_text) as closeness
    from provider_locations l
    cross join lateral (select provider_search_text(l.program_name, l.company, l.city, l.county) as search_text) s
    where l.is_current
      and (p_status = 'all' or l.status_class = 'active')
      and (coalesce(p_county, '') = '' or l.county = p_county)
      and (coalesce(cardinality(p_tags), 0) = 0 or l.tags && p_tags)
      and (v_lead is null or s.search_text ilike v_lead_pattern or v_lead <% s.search_text)
      and not exists (
        select 1 from unnest(v_terms) as t
        where strpos(lower(s.search_text), t) = 0 and not (t <% s.search_text)
      )
  ),
  total as (select count(*) as n from matches)
  select m.id, m.slug, m.program_name, m.company, m.tier, m.address, m.city, m.county, m.zip, m.phone,
    m.license_status, m.status_class, m.license_number, m.tags, m.primary_tag, total.n
  from matches m cross join total
  order by m.score desc, m.closeness desc, m.program_name, m.license_number
  limit v_limit
  offset least(greatest(coalesce(p_offset, 0), 0), (greatest((select n from total), 1) - 1) / v_limit * v_limit);

  -- A NULL caller value resets the setting to its default.
  perform set_config('pg_trgm.word_similarity_threshold', v_caller_threshold, true);
end;
$$;

-- "Did you mean" for a search that matched nothing: the closest provider names, companies,
-- cities and counties among rows that pass the same filters, so every suggestion has results.
create or replace function public.suggest_directory_queries(
  p_query text,
  p_county text default '',
  p_tags text[] default '{}',
  p_status text default 'active',
  p_limit integer default 3
)
returns table (suggestion text)
language sql
stable
set search_path = public
as $$
  with candidates as (
    select distinct unnest(array[l.program_name, l.company, l.city, l.county]) as candidate
    from provider_locations l
    where l.is_current
      and (p_status = 'all' or l.status_class = 'active')
      and (coalesce(p_county, '') = '' or l.county = p_county)
      and (coalesce(cardinality(p_tags), 0) = 0 or l.tags && p_tags)
  ),
  scored as (
    select candidate, word_similarity(p_query, candidate) as closeness, similarity(p_query, candidate) as overall
    from candidates
  )
  -- 0.4 turns "Grve" into Maple, Spring and Cottage Grove; below it, "Acord" suggests "Access ...".
  select candidate from scored
  where closeness >= 0.4
  order by closeness desc, overall desc, candidate
  limit least(greatest(coalesce(p_limit, 3), 1), 10);
$$;

-- Supabase's default privileges grant EXECUTE on new functions to anon and authenticated
-- directly, so revoking from public alone would leave them able to call these.
revoke all on function public.search_directory(text, text, text[], text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_directory(text, text, text[], text, integer, integer) to service_role;
revoke all on function public.suggest_directory_queries(text, text, text[], text, integer) from public, anon, authenticated;
grant execute on function public.suggest_directory_queries(text, text, text[], text, integer) to service_role;

notify pgrst, 'reload schema';
