# Licensed Care MN Roadmap

## V1 — Static public directory

Launch Licensed Care MN as a fast, public, SEO-ready provider directory using the current 945-provider Minnesota DHS dataset as a fixed launch snapshot.

### V1 decisions

- Rebuild the prototype with Next.js, TypeScript, Vercel, and Supabase Postgres.
- Faithfully modernize the current homepage, search, guide, FAQ, and provider-profile experience.
- Keep search server-rendered and paginated; do not send the whole provider directory to each visitor's browser.
- Pre-render public pages and provider profiles for speed and search visibility.
- Do **not** build data updates, accounts, provider claims, billing, advertising workflows, or operational dashboards in V1.
- State clearly that the directory is a launch snapshot and that visitors should verify current licensing information with Minnesota DHS.

### Launch validation

After launch, monitor:

- Search terms and zero-result searches
- Search-to-profile and phone-link clicks
- Broken links, crawl errors, and mobile performance
- Requests to correct provider information
- Provider requests to claim listings
- Feedback from families, case managers, and providers

The findings determine which later phase should be prioritized.

## V1.1 — Controlled data updates

The first major post-launch capability should be a secure, admin-uploaded CSV workflow.

```text
Authorized admin
  -> Upload prepared DHS CSV
  -> Validate records and fields
  -> Preview additions, changes, retirements, and errors
  -> Approve publish
  -> Update public directory and refresh cached pages
```

### Requirements

- Private source-file storage
- Admin-only access
- Import history, timestamps, and audit records
- Validation for required fields, duplicate licenses, tags, and statuses
- Publish preview with record-by-record change summary
- Atomic publishing: failed imports cannot change public data
- Rollback to the previous approved import
- Public "last updated" information

Do not automate the source import yet. First validate the source format, review process, and operational ownership through manual imports.

## V2 — Provider claims and owner tools

Introduce a limited, review-first provider claim process rather than immediate self-service editing.

```text
Provider representative
  -> Requests a claim
  -> Provides verification information
  -> Admin reviews request
  -> Approved owner manages permitted profile content
```

### Boundaries

Keep DHS facts separate from provider-supplied content.

| DHS-controlled facts | Provider-controlled content |
| --- | --- |
| License number and status | Description |
| Licensed address | Website and preferred contacts |
| Service categories | Photos and service details |
| Operator identity | Availability or contact notes |

### Requirements

- Authentication and provider/admin roles
- Row-level access controls
- Claim-review queue and audit trail
- Content moderation workflow
- Clear labels distinguishing DHS data from provider-supplied content

## V2.1 — Search and data-quality improvements

Use real visitor behavior to prioritize improvements such as:

- Typo-tolerant provider-name search
- Better city and county matching
- Search suggestions and useful no-result guidance
- Data-quality correction reports
- Updated-status messaging
- Ranking improvements for exact provider, city, and county matches

Defer maps, radius search, saved searches, alerts, and AI search until user demand justifies their complexity.

## V3 — Monetization

Validate the business model manually before building subscriptions or payments.

```text
Talk with providers
  -> Test a limited paid placement manually
  -> Define value, placement, disclosures, and support rules
  -> Build billing only after the model is validated
```

### Non-negotiable trust rule

Always distinguish:

```text
DHS-verified licensing facts
!= provider-supplied profile content
!= paid featured placement
```

Before payment implementation, define plan benefits, sponsorship labeling, ranking rules, cancellation/refund handling, and advertiser-content approval.

## V4 — Automated DHS refreshes

Automate only after the manual import workflow has proven the data source, field mapping, validation rules, and error process.

```text
Scheduled job
  -> Fetch approved DHS source
  -> Validate and compare data
  -> Create a draft import
  -> Notify an administrator of notable changes or failures
  -> Human approval or carefully defined auto-publish
  -> Refresh affected public pages
```

Early automation should create a reviewable draft, not silently publish licensing changes.

## Guiding principle

Each phase should solve a demonstrated data, user, or business problem. V1 proves public directory value; later phases add operational complexity only when evidence supports it.
