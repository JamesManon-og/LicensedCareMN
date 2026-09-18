-- Provider-supplied content and claims: close direct reads of profile content, record revoked
-- claims, and keep one open claim per claimant and listing.

-- Provider-supplied content is public only while its listing has an approved claim, which the app
-- checks when it renders a profile (lib/owner-content.ts). The "using (true)" select policy let
-- anyone holding the publishable key read every row through the Data API instead, including
-- content from pending, rejected and revoked claims. The app reads this table with the service
-- role only, so the public roles need no access.
drop policy if exists "public reads provider supplied profiles" on public.provider_profiles;
revoke all on public.provider_profiles from anon, authenticated;

-- An administrator can revoke an approved claim; it gets its own status so the review history
-- still shows that the claim was once approved.
alter table public.provider_claims drop constraint if exists provider_claims_status_check;
alter table public.provider_claims add constraint provider_claims_status_check
  check (status in ('pending', 'approved', 'rejected', 'revoked'));

-- A repeated submission (a double click, or the same person asking again) is not a new request:
-- one pending or approved claim per claimant and listing. Fails if duplicates already exist;
-- resolve them in the claim queue first.
create unique index if not exists provider_claims_open_claimant_idx
  on public.provider_claims (license_number, claimant_email)
  where status in ('pending', 'approved');

notify pgrst, 'reload schema';
