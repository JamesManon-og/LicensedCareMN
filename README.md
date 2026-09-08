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

The public directory runs without external credentials using the committed `locations.json` launch snapshot.

## Enable operations with Supabase

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_directory.sql` through the Supabase CLI or SQL editor.
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

The importer derives URL slugs, provider tiers, primary tags, and status classes. A CSV is only publishable when every row is valid.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

`npm run typecheck` is the authoritative type check. The Next.js build intentionally skips its duplicate internal type-check step because Next 16.3.4 cannot parse TypeScript's `--showConfig` output in this environment; the separate type check remains required.
