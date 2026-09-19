# Licensed Care MN

Licensed Care MN is a performance-first Next.js directory for Minnesota DHS-derived Community Residential Setting provider records.

## What is implemented

- Public directory, guide, FAQ, and 945 statically generated provider profiles
- Server-rendered, paginated search with county, tag, status, and text filters
- Legacy `.html` URL redirects and generated sitemap/robots metadata
- Launch-snapshot disclosure on public search and profile pages
- Supabase migration, seed script, CSV-import preview/publish endpoints, provider claim queue, and owner-profile tools
- No monetization, payment processing, advertising workflow, scheduled imports, or automated DHS fetching

## Run locally

```bash
npm install
npm run dev
```

The public directory runs without external credentials using the committed `data/locations.json` launch snapshot.

## Repository layout

- `app/`, `components/`, and `lib/` contain the active Next.js application.
- `data/locations.json` is the V1 provider-data snapshot used by the public directory.
- `supabase/` and `scripts/` support the manual, approved data-import workflow.
- `legacy/static-site/` preserves the retired static HTML prototype and is not part of the Next.js build or deployment.

## Enable operations with Supabase

1. Create a Supabase project.
2. Apply every file in `supabase/migrations/`, in filename order, through the Supabase CLI or SQL editor.
3. Copy `.env.example` to `.env.local` and add the project URL, publishable key, and server-only service-role key.
4. Create the first authentication user, then add its UUID to `public.app_roles` with the `admin` role.
5. Run `npm run seed:supabase` to publish the existing 945-location snapshot to Postgres.

Once configured, public server routes read current approved provider rows from Supabase. The `/admin` area supports CSV validation and publishing; `/admin/claims` reviews provider claims; `/owner` lets an approved claimant edit provider-supplied content only.

## Normalized CSV contract

The importer requires these headers:

```text
license_number,program_name,company,address,city,county,zip,phone,license_status,tags
```

Use a pipe (`|`) between multiple service tags. Allowed tags are:

- Foster Care / Supported Living
- Crisis Respite
- Out-of-Home Respite
- Remote Overnight Supervision
- Adult Mental Health Certification

ZIP codes must be five digits or ZIP+4, and a trailing " County" is dropped from county names. The importer derives URL slugs, provider tiers, primary tags, and status classes. A CSV is only publishable when every row is valid.

Publishing replaces the directory: every current listing that is not in the file is retired. The preview therefore counts the listings the file adds, updates, leaves unchanged, and retires, and names each listing it would retire. Publishing a file that retires anything requires ticking a confirmation, and the publish endpoint re-counts the retirements and refuses the request (409) unless they match the confirmed number.

## Conventions

Database reads follow one error-handling rule:

- **Required data throws.** A page or route that cannot read what it is about (search results, a listing, the claim queue, an owner's listings, an approval check) fails. Pages then show the error page in `app/error.tsx`, with a Try again button, and a regenerating static page keeps its last good version.
- **Optional extras log and are left out.** Related providers, search suggestions, "claimed" badges and a profile's provider-supplied content log the error, and the page renders without them.
- **A failed read never returns an empty result.** An empty list means there really is nothing there; it never stands in for "the database could not be reached". Otherwise an outage reads as "no claims to review" or, on the owner page, as empty forms that would erase the saved content on the next save.

`tests/outage.test.ts` checks the rule offline by pointing Supabase at a port where nothing listens.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

`npm run typecheck` is the authoritative type check. The Next.js build intentionally skips its duplicate internal type-check step because Next 16.3.4 cannot parse TypeScript's `--showConfig` output in this environment; the separate type check remains required.
