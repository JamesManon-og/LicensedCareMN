import { isServiceTag, type SearchFilters } from "@/lib/types";

export const PAGE_SIZE = 24;

// Pages past the last one are clamped to it after searching; this cap only keeps the database
// offset ((page - 1) * PAGE_SIZE) far inside Postgres's integer range.
export const MAX_PAGE = 10_000;

/** Clamps a requested page into [1, totalPages]; an empty result still has one (empty) page. */
export function paginate(requestedPage: number, total: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, totalPages, offset: (page - 1) * pageSize };
}

/** `counties` are the accepted county values: the directory's getCounties(). */
export function parseSearchFilters(input: Record<string, string | string[] | undefined>, counties: readonly string[]): SearchFilters {
  const rawTags = input.tag;
  const tags = (Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : []).filter(isServiceTag);
  const county = typeof input.county === "string" && counties.includes(input.county) ? input.county : "";
  const query = typeof input.q === "string" ? input.q.slice(0, 120) : "";
  const status = input.status === "all" ? "all" : "active";
  const requestedPage = typeof input.page === "string" ? Number.parseInt(input.page, 10) : 1;

  return {
    query,
    county,
    tags,
    status,
    page: Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), MAX_PAGE) : 1
  };
}
