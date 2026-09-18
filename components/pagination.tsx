import Link from "next/link";
import type { SearchFilters, SearchResult } from "@/lib/types";

export function hrefForPage(filters: SearchFilters, page: number) {
  const query = new URLSearchParams();
  if (filters.query) query.set("q", filters.query);
  if (filters.county) query.set("county", filters.county);
  filters.tags.forEach((tag) => query.append("tag", tag));
  if (filters.status === "all") query.set("status", "all");
  query.set("page", String(page));
  return `/search?${query.toString()}`;
}

export function Pagination({ filters, result }: { filters: SearchFilters; result: SearchResult }) {
  if (result.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Search result pages">
      {result.page > 1 ? <Link className="btn-secondary" href={hrefForPage(filters, result.page - 1)}>Previous</Link> : <span className="btn-secondary disabled-control">Previous</span>}
      <span>Page {result.page} of {result.totalPages}</span>
      {result.page < result.totalPages ? <Link className="btn-secondary" href={hrefForPage(filters, result.page + 1)}>Next</Link> : <span className="btn-secondary disabled-control">Next</span>}
    </nav>
  );
}
