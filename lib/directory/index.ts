import { cache } from "react";
import { summarizeDirectory } from "@/lib/directory/overview";
import type { DirectorySource } from "@/lib/directory/source";
import { snapshotDirectory } from "@/lib/directory/snapshot";
import { supabaseDirectory } from "@/lib/directory/supabase";
import { hasSupabaseConfig } from "@/lib/supabase";

/**
 * Public pages use the checked-in launch snapshot until Supabase is configured.
 * Once configured, the same routes read the latest approved provider rows.
 */
export const directory: DirectorySource = hasSupabaseConfig ? supabaseDirectory : snapshotDirectory;

/** The home page's totals, service-type counts and leading counties, from one listing read. */
export async function getDirectoryOverview() {
  return summarizeDirectory(await directory.listLocations());
}

/** One provider lookup per request, shared by a profile's metadata and its page. */
export const getProviderBySlug = cache((slug: string) => directory.getBySlug(slug));
