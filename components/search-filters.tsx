import { SERVICE_TAGS, type SearchFilters } from "@/lib/types";

export function SearchFilters({ counties, filters }: { counties: readonly string[]; filters: SearchFilters }) {
  return (
    <form action="/search" className="search-filters card" aria-label="Filter providers">
      <label className="filter-label" htmlFor="q">Search providers</label>
      <input id="q" name="q" defaultValue={filters.query} placeholder="Name, city, or county" />

      <label className="filter-label" htmlFor="county">County</label>
      <select id="county" name="county" defaultValue={filters.county}>
        <option value="">All counties</option>
        {counties.map((county) => <option value={county} key={county}>{county} County</option>)}
      </select>

      <fieldset>
        <legend className="filter-label">Service type</legend>
        {SERVICE_TAGS.map((tag) => (
          <label className="check-row" key={tag}>
            <input name="tag" type="checkbox" value={tag} defaultChecked={filters.tags.includes(tag)} />
            <span>{tag}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="filter-label">License status</legend>
        <label className="check-row"><input name="status" type="radio" value="active" defaultChecked={filters.status === "active"} /> <span>Active license only</span></label>
        <label className="check-row"><input name="status" type="radio" value="all" defaultChecked={filters.status === "all"} /> <span>All statuses</span></label>
      </fieldset>

      <div className="filter-actions">
        <button className="btn-primary" type="submit">Apply filters</button>
        <a className="btn-secondary" href="/search">Clear</a>
      </div>
    </form>
  );
}
