-- Directory search: "St." / "Saint" place names and license-number or ZIP lookups.

-- Minnesota listings spell the same places both ways ("Saint Paul", "North St Paul", "St Louis
-- Park", "St. Louis" County), so "st", "st." and "saint" match either spelling as a whole word.
-- Every other query word matches as a substring, as before.
create or replace function public.search_term_matches(p_term text, p_text text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select strpos(lower(p_text), p_term) > 0
    or (p_term in ('st', 'st.', 'saint') and lower(p_text) ~ '\m(st|saint)\M')
$$;

-- As in 0002, plus: a query that is a number of five or more digits also matches a listing's
-- license number exactly (ranked first) or the start of its ZIP code.
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
  v_number boolean := v_query ~ '^[0-9]{5,}(-[0-9]{4})?$';
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_lead text;
  v_lead_pattern text;
  v_caller_threshold text := current_setting('pg_trgm.word_similarity_threshold', true);
begin
  -- See 0002: 0.5 admits "Duluht" and "Rochster" without letting "Minneapols" over-match.
  perform set_config('pg_trgm.word_similarity_threshold', '0.5', true);

  -- The longest word drives an index-eligible prefilter. "St"/"Saint" can match a spelling that
  -- does not contain the word itself, so they never lead; with only those words there is no
  -- prefilter and the per-word check alone decides.
  select t into v_lead from unnest(v_terms) as t where t not in ('st', 'st.', 'saint') order by length(t) desc limit 1;
  v_lead_pattern := '%' || replace(replace(replace(v_lead, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  with matches as (
    select l.*,
      case
        when v_query = '' then 0
        when v_number and l.license_number = v_query then 5
        when lower(l.program_name) = v_query or lower(l.company) = v_query then 4
        when starts_with(lower(l.program_name), v_query) or starts_with(lower(l.company), v_query)
          or starts_with(lower(l.city), v_query) or starts_with(lower(l.county), v_query) then 3
        when not exists (select 1 from unnest(v_terms) as t where not search_term_matches(t, s.search_text)) then 2
        else 1
      end as score,
      word_similarity(v_query, s.search_text) as closeness
    from provider_locations l
    cross join lateral (select provider_search_text(l.program_name, l.company, l.city, l.county) as search_text) s
    where l.is_current
      and (p_status = 'all' or l.status_class = 'active')
      and (coalesce(p_county, '') = '' or l.county = p_county)
      and (coalesce(cardinality(p_tags), 0) = 0 or l.tags && p_tags)
      and (
        (v_number and (l.license_number = v_query or starts_with(btrim(l.zip), v_query)))
        or (
          (v_lead is null or s.search_text ilike v_lead_pattern or v_lead <% s.search_text)
          and not exists (
            select 1 from unnest(v_terms) as t
            where not search_term_matches(t, s.search_text) and not (t <% s.search_text)
          )
        )
      )
  ),
  total as (select count(*) as n from matches)
  select m.id, m.slug, m.program_name, m.company, m.tier, m.address, m.city, m.county, m.zip, m.phone,
    m.license_status, m.status_class, m.license_number, m.tags, m.primary_tag, total.n
  from matches m cross join total
  order by m.score desc, m.closeness desc, m.program_name, m.license_number
  limit v_limit
  offset least(greatest(coalesce(p_offset, 0), 0), (greatest((select n from total), 1) - 1) / v_limit * v_limit);

  perform set_config('pg_trgm.word_similarity_threshold', v_caller_threshold, true);
end;
$$;

-- Supabase's default privileges grant EXECUTE on new functions to anon and authenticated directly.
revoke all on function public.search_term_matches(text, text) from public, anon, authenticated;
grant execute on function public.search_term_matches(text, text) to service_role;
revoke all on function public.search_directory(text, text, text[], text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_directory(text, text, text[], text, integer, integer) to service_role;

notify pgrst, 'reload schema';
