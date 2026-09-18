import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { hrefForPage, Pagination } from "@/components/pagination";
import { ProviderCard } from "@/components/provider-card";
import { SearchFilters } from "@/components/search-filters";
import { getDirectoryCounties, parseSearchFilters, searchDirectory, suggestDirectoryQueries } from "@/lib/locations";
import { describeResultCount } from "@/lib/text";

export const metadata: Metadata = { title: "Browse providers", description: "Search the Licensed Care MN launch directory by provider, county, service type, and listed license status." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const counties = await getDirectoryCounties();
  const filters = parseSearchFilters(params, counties);
  const result = await searchDirectory(filters);
  const suggestions = result.total ? [] : await suggestDirectoryQueries(filters);
  return (
    <section className="wrap page-section">
      <div className="page-heading">
        <span className="eyebrow">Provider directory</span><h1 className="display">Browse Minnesota CRS providers</h1>
        <p>Search the launch dataset by provider name, city, county, service type, and listed license status.</p>
      </div>
      <div className="snapshot-inline"><strong>Launch snapshot:</strong> License status can change. Verify current information with Minnesota DHS before making a care decision.</div>
      <div className="search-grid search-layout">
        <aside><SearchFilters counties={counties} filters={filters} /></aside>
        <div>
          <p className="result-count">{describeResultCount(result.total)}</p>
          {result.items.length ? <div className="results-list">{result.items.map((location) => <ProviderCard location={location} key={location.license_number} />)}</div> : <div className="empty-state card"><h2>No providers match those filters</h2>{suggestions.length ? <p>Did you mean {suggestions.map((suggestion, index) => <Fragment key={suggestion}>{index ? ", " : ""}<Link href={hrefForPage({ ...filters, query: suggestion }, 1)}>{suggestion}</Link></Fragment>)}?</p> : null}<p>Try a broader search, another county, or clear one of the service filters.</p></div>}
          <Pagination filters={filters} result={result} />
        </div>
      </div>
    </section>
  );
}
