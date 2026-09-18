import type { ProviderLocation, ServiceTag } from "@/lib/types";

const DHS_LICENSE_DETAILS_URL = "https://licensinglookup.dhs.state.mn.us/Details.aspx";
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/";

/** The provider's record in the official Minnesota DHS Licensing Information Lookup. */
export function dhsLicenseUrl(licenseNumber: string) {
  return `${DHS_LICENSE_DETAILS_URL}?${new URLSearchParams({ l: licenseNumber.trim() })}`;
}

/** Google Maps search for the listed street address ("address, city, MN zip"). */
export function mapsUrl({ address, city, zip }: Pick<ProviderLocation, "address" | "city" | "zip">) {
  const query = [address, city, `MN ${zip ?? ""}`]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return `${GOOGLE_MAPS_SEARCH_URL}?${new URLSearchParams({ api: "1", query })}`;
}

export function searchByTagHref(tag: ServiceTag) {
  return `/search?${new URLSearchParams({ tag })}`;
}

export function searchByCountyHref(county: string) {
  return `/search?${new URLSearchParams({ county })}`;
}

/** Free-text search; the directory has no city filter, but search matches city names. */
export function searchByTextHref(query: string) {
  return `/search?${new URLSearchParams({ q: query })}`;
}
