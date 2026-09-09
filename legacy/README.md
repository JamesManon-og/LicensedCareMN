# Legacy static-site archive

`static-site/` preserves the original generated HTML, vanilla JavaScript, stylesheet, crawler files, and Python generator as historical reference material.

It is not part of the Next.js application, is not built by `npm run build`, and must not be deployed as the production site. The active application lives in `app/`, `components/`, `lib/`, `data/`, and `supabase/`.

The Next.js directory continues to use the launch snapshot at `data/locations.json`. The archived pages are intentionally retained only for comparison and recovery purposes.
