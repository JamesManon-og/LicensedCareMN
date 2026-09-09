import json, os, re, html
from collections import Counter, defaultdict

with open("site/data/locations.json") as f:
    LOCS = json.load(f)

N_LOC = len(LOCS)
COMPANIES = sorted(set(l["company"] for l in LOCS))
N_CO = len(COMPANIES)
COUNTIES = sorted(set(l["county"] for l in LOCS))
TAGS = ["Foster Care / Supported Living", "Crisis Respite", "Out-of-Home Respite",
        "Remote Overnight Supervision", "Adult Mental Health Certification"]
TAG_META = {
    "Foster Care / Supported Living": {"icon": "building", "desc": "Licensed foster care and supported independent-living settings."},
    "Crisis Respite": {"icon": "lifebuoy", "desc": "Short-term crisis stabilization and respite care."},
    "Out-of-Home Respite": {"icon": "home", "desc": "Planned respite care provided outside the family home."},
    "Remote Overnight Supervision": {"icon": "moon", "desc": "Overnight supervision provided remotely rather than on-site."},
    "Adult Mental Health Certification": {"icon": "check-circle", "desc": "DHS-certified adult mental health service sites."},
}
tag_counts = Counter()
tag_counts_active = Counter()
for l in LOCS:
    for t in l["tags"]:
        tag_counts[t] += 1
        if l["status_class"] == "active":
            tag_counts_active[t] += 1
county_counts = Counter(l["county"] for l in LOCS)
county_counts_active = Counter(l["county"] for l in LOCS if l["status_class"] == "active")
active_count = sum(1 for l in LOCS if l["status_class"] == "active")
# Homepage category/county tiles link into search.html, which defaults to the
# "Active license only" filter -- so tile counts must match that default (active-only),
# or the number on the tile won't match what search.html shows after the click.

ICONS = {
"shield": '<path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z"/><path d="M8.7 12.2l2.3 2.3 4.3-4.6"/>',
"search": '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
"phone": '<path d="M7 3.5H4.5A1.5 1.5 0 0 0 3 5c0 9.4 7.6 17 17 17a1.5 1.5 0 0 0 1.5-1.5V18c0-.6-.4-1.1-1-1.2-1.2-.3-2.3-.7-3.4-1.2-.5-.2-1 0-1.4.4l-1.7 1.7a15.3 15.3 0 0 1-6.2-6.2l1.7-1.7c.4-.4.5-.9.4-1.4a12 12 0 0 1-1.2-3.4c-.1-.6-.6-1-1.2-1Z"/>',
"mappin": '<path d="M12 21s7-6.2 7-11.6A7 7 0 0 0 5 9.4C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.4" r="2.3"/>',
"check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8.2 12.3l2.5 2.5 5-5.4"/>',
"alert": '<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none"/>',
"x-circle": '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
"chevron-r": '<path d="M9 5l7 7-7 7"/>',
"chevron-d": '<path d="M5 9l7 7 7-7"/>',
"nav": '<path d="M12 2l7 19-7-4-7 4 7-19Z"/>',
"clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
"camera": '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"/><circle cx="12" cy="13" r="3.2"/>',
"building": '<rect x="5" y="3.5" width="14" height="17" rx="1"/><rect x="8" y="7" width="2.2" height="2.2"/><rect x="13.8" y="7" width="2.2" height="2.2"/><rect x="8" y="11.4" width="2.2" height="2.2"/><rect x="13.8" y="11.4" width="2.2" height="2.2"/><rect x="9.4" y="16.2" width="5.2" height="4.3"/>',
"sliders": '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="1.8"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="1.8"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="10.5" cy="18" r="1.8"/>',
"home": '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10.3V20h12v-9.7"/><path d="M10 20v-5.5h4V20"/>',
"lifebuoy": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><line x1="12" y1="3.5" x2="12" y2="8.8"/><line x1="12" y1="15.2" x2="12" y2="20.5"/><line x1="3.5" y1="12" x2="8.8" y2="12"/><line x1="15.2" y1="12" x2="20.5" y2="12"/>',
"moon": '<path d="M19.5 14.8A8.5 8.5 0 1 1 9.2 4.5a7 7 0 0 0 10.3 10.3Z"/>',
"megaphone": '<path d="M3 10v4a1 1 0 0 0 1 1h2l1 5h2l-1-5h2l8 4V6l-8 4H6a1 1 0 0 0-1 1v0Z"/><path d="M18 9v6"/>',
"star": '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z"/>',
}
def icon(name, cls="icon", extra=""):
    return f'<svg class="{cls}" {extra} viewBox="0 0 24 24" fill="none">{ICONS[name]}</svg>'

# ---------- brand mark ----------
# Two overlapping "connection" circles (family + provider) with a solid roof
# notch cut into the top -- a home watching over the meeting point. Merges the
# two concepts the client picked out of all the rounds explored. The roof is a
# SOLID fill (not a stroked outline) deliberately: an outline in the tile's own
# navy vanished against the navy tile background at 17-20px favicon scale: a
# solid wedge stays legible at every size because it always sits on the white
# and red circles, never on the navy background itself.
#
# Second circle is red (Red Cross red, #da291c) per client request -- scoped
# to the logo mark ONLY. The sitewide --accent teal token in style.css (used
# for links, buttons, badges, etc. everywhere else) is untouched.
def logo_svg(px=17):
    return (f'<svg viewBox="0 0 40 40" width="{px}" height="{px}" style="stroke:none;flex:none;" '
             f'aria-hidden="true"><circle cx="15" cy="23" r="10.5" fill="#ffffff" fill-opacity="0.95"/>'
             f'<circle cx="25" cy="23" r="10.5" fill="#da291c"/>'
             f'<path d="M20 13 L27.5 22 L12.5 22 Z" fill="#1a2540"/></svg>')

# Standalone favicon: same mark on a rounded navy tile, as a data-URI SVG so no
# separate asset file is needed. Literal hex (not the CSS oklch tokens) since
# this renders outside any stylesheet context.
FAVICON_HREF = (
    "data:image/svg+xml,"
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E"
    "%3Crect width='40' height='40' rx='9' fill='%231a2540'/%3E"
    "%3Ccircle cx='15' cy='23' r='10.5' fill='%23ffffff' fill-opacity='0.95'/%3E"
    "%3Ccircle cx='25' cy='23' r='10.5' fill='%23da291c'/%3E"
    "%3Cpath d='M20 13 L27.5 22 L12.5 22 Z' fill='%231a2540'/%3E"
    "%3C/svg%3E"
)

STATUS_LABEL = {"active": "Active License", "caution": "Provisional / Conditional", "critical": "Not Currently Licensed"}

# ---------- SEO / AI-crawler metadata ----------
# TODO: replace with the real production domain before this site goes live.
# Every canonical / og:url / JSON-LD "url" field is built from this one constant.
SITE_DOMAIN = "https://example-licensedcaremn.com"

def esc(s):
    return html.escape(str(s or ""), quote=True)

def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + '</script>'

def seo_meta(title, description, path, jsonld_blocks=None):
    """Builds <head> metadata: meta description, canonical, Open Graph, Twitter
    card, and JSON-LD structured data -- the layer search engines and AI
    systems (ChatGPT, Perplexity, Google AI Overviews, etc.) read to understand
    and cite a page, per platform-spec/docs/07-seo-strategy.md."""
    url = f"{SITE_DOMAIN}/{path.lstrip('/')}"
    d, t = esc(description), esc(title)
    parts = [
        f'<meta name="description" content="{d}">',
        f'<link rel="canonical" href="{url}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Licensed Care MN">',
        f'<meta property="og:title" content="{t}">',
        f'<meta property="og:description" content="{d}">',
        f'<meta property="og:url" content="{url}">',
        '<meta name="twitter:card" content="summary">',
        f'<meta name="twitter:title" content="{t}">',
        f'<meta name="twitter:description" content="{d}">',
        '<meta name="robots" content="index, follow">',
    ]
    for block in (jsonld_blocks or []):
        parts.append(jsonld(block))
    return "\n".join(parts)

def header(prefix=""):
    return f'''<header class="site">
  <div class="headerbar">
    <a class="logo" href="{prefix}index.html" style="align-items:center;">
      <div class="logo-mark">{logo_svg(17)}</div>
      <div><div class="logo-word">Licensed Care MN</div><div class="logo-sub">CRS PROVIDER DIRECTORY &middot; LAUNCH COHORT PROTOTYPE</div></div>
    </a>
    <nav class="mainnav">
      <a href="{prefix}search.html">Browse Providers</a>
      <a href="{prefix}guide.html">CRS Guide</a>
      <a href="{prefix}faq.html">FAQ</a>
      <a href="{prefix}index.html#about">About this prototype</a>
    </nav>
  </div>
</header>'''

def footer(prefix=""):
    return f'''<footer class="site">
  <div class="wrap footcols">
    <div>
      <div class="logo" style="margin-bottom:10px;"><div class="logo-mark" style="width:26px;height:26px;">{logo_svg(14)}</div><div class="logo-word" style="font-size:14px;">Licensed Care MN</div></div>
      <p style="font-size:12.5px;color:var(--ink-3);line-height:1.6;max-width:280px;">Data sourced from the Minnesota Department of Human Services (DHS) public CRS licensing lookup. Not affiliated with or endorsed by DHS. This prototype covers the {N_CO}-operator, {N_LOC}-location launch cohort only &mdash; not the full statewide list.</p>
    </div>
    <div>
      <div class="label" style="margin-bottom:10px;">Browse</div>
      <a href="{prefix}search.html">All providers</a>
      <a href="{prefix}index.html">Home</a>
    </div>
    <div>
      <div class="label" style="margin-bottom:10px;">About</div>
      <a href="{prefix}guide.html">CRS licensing guide</a>
      <a href="{prefix}faq.html">FAQ</a>
      <a href="{prefix}index.html#about">Prototype notes</a>
    </div>
    <div>
      <div class="label" style="margin-bottom:10px;">Dashboards</div>
      <a href="{prefix}owner-dashboard.html">Owner dashboard (demo)</a>
      <a href="{prefix}admin-dashboard.html">Admin dashboard (demo)</a>
    </div>
  </div>
  <div class="wrap footbottom">&copy; 2026 Licensed Care MN &middot; Working prototype, not a live product.</div>
</footer>'''

PAGE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{meta_extra}
<link rel="icon" type="image/svg+xml" href="{favicon}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap">
<link rel="stylesheet" href="{prefix}assets/style.css">
</head>
<body>
{header}
{body}
{footer}
<script>
(function(){{
  document.querySelectorAll('details.card').forEach(function(d){{
    var content = d.querySelector(':scope > div');
    if(!content) return;
    content.style.overflow = 'hidden';
    d.addEventListener('toggle', function(){{
      if(d.open){{
        var h = content.scrollHeight;
        content.style.maxHeight = '0px';
        requestAnimationFrame(function(){{
          content.style.transition = 'max-height .25s ease';
          content.style.maxHeight = h + 'px';
        }});
        content.addEventListener('transitionend', function te(){{
          content.style.maxHeight = 'none';
          content.removeEventListener('transitionend', te);
        }});
      }}
    }});
  }});
}})();
</script>
</body>
</html>'''

os.makedirs("site/profiles", exist_ok=True)

# ---------- index.html ----------
tag_grid_items = "\n".join(f'''
    <a href="search.html?tag={t.replace(" ", "+")}" class="topic-tile">
      <div class="topic-icon">{icon(TAG_META[t]["icon"], extra='style="width:22px;height:22px;stroke:var(--accent-ink)"')}</div>
      <div class="topic-title">{t}</div>
      <div class="topic-desc">{TAG_META[t]["desc"]}</div>
      <div class="topic-count">{tag_counts_active[t]} active locations {icon("chevron-r", extra='style="width:13px;height:13px;stroke:var(--brand)"')}</div>
    </a>''' for t in TAGS)

top_counties = county_counts_active.most_common(8)
_max_top_county = top_counties[0][1]
county_top_cards = "\n".join(f'''
    <a href="search.html?county={c.replace(" ", "+")}" class="county-top-card{' lead' if i == 0 else ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
        <div class="county-tile-icon" style="margin:0;">{icon("mappin", extra='style="width:16px;height:16px;stroke:var(--brand)"')}</div>
        {'<span class="badge badge-dhs" style="font-size:10px;padding:3px 8px;">TOP COUNTY</span>' if i == 0 else f'<span class="tabular" style="font-size:11.5px;font-weight:800;color:var(--ink-3);">#{i + 1}</span>'}
      </div>
      <div style="font-weight:700;font-size:14.5px;margin-bottom:2px;">{c}</div>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:11px;">{n} active locations</div>
      <div class="progress"><div style="width:{round(n / _max_top_county * 100)}%;"></div></div>
    </a>''' for i, (c, n) in enumerate(top_counties))

county_chips = "\n".join(
    f'<a href="search.html?county={c.replace(" ", "+")}" class="county-chip" data-name="{c.lower()}"><span>{c}</span><span class="tabular" style="color:var(--ink-3);font-weight:700;">{n}</span></a>'
    for c, n in sorted(county_counts_active.items())
)
COUNTY_FILTER_JS = """document.getElementById('countyFilter').oninput = function(e){
  var q = e.target.value.trim().toLowerCase();
  var any = false;
  document.querySelectorAll('#countyChipGrid .county-chip').forEach(function(el){
    var show = !q || el.dataset.name.indexOf(q) !== -1;
    el.style.display = show ? '' : 'none';
    if (show) any = true;
  });
  document.getElementById('countyChipEmpty').style.display = any ? 'none' : 'block';
};"""

# ---------- homepage ad carousel (AD_SLOT_HOME_FEATURED_CAROUSEL) ----------
# Edit ADS below to change what's advertised in this slot — each slide is one
# object: tier label, headline, subhead, button text/link, and a background
# tint. Swap in a real paying customer's info here; no other code changes needed.
ADS = [
    {
        "tier": "FEATURED &middot; EXAMPLE",
        "tint": "var(--accent-soft)",
        "ink": "var(--accent-ink)",
        "headline": "This is a Featured placement.",
        "body": "Featured providers ($19.99/mo) get top-of-category visibility and a highlighted profile. Example shown &mdash; not a live advertiser.",
        "cta": "See advertising options",
    },
    {
        "tier": "SPOTLIGHT &middot; EXAMPLE",
        "tint": "var(--brand-soft)",
        "ink": "var(--brand)",
        "headline": "This is a Spotlight placement.",
        "body": "Spotlight providers ($29.99/mo) get first position in their county and on the homepage. Example shown &mdash; not a live advertiser.",
        "cta": "See advertising options",
    },
    {
        "tier": "ADVERTISE HERE",
        "tint": "var(--surface-2)",
        "ink": "var(--ink-2)",
        "headline": "Own a licensed CRS location?",
        "body": "Claim your listing and get featured placement in front of case managers and families searching your county.",
        "cta": "Learn how to advertise",
    },
]
ad_slides = "\n".join(f'''
    <div class="ad-slide{' active' if i==0 else ''}" style="background:{a['tint']};">
      <div class="ad-badge" style="color:{a['ink']};border-color:{a['ink']};">{icon("megaphone", extra=f'style="width:12px;height:12px;stroke:{a["ink"]}"')}{a['tier']}</div>
      <div class="ad-headline">{a['headline']}</div>
      <div class="ad-body">{a['body']}</div>
      <button class="btn-secondary ad-cta" type="button" title="Advertising signup isn't wired up in this prototype yet">{a['cta']}</button>
    </div>''' for i, a in enumerate(ADS))
ad_dots = "\n".join(f'<button class="ad-dot{" active" if i==0 else ""}" data-i="{i}" aria-label="Show ad {i+1}"></button>' for i in range(len(ADS)))

sample = sorted(LOCS, key=lambda l: (-county_counts[l["county"]], l["program_name"]))[:3]
def bcard(l, prefix=""):
    tagline = " &middot; ".join(l["tags"][:2]) if l["tags"] else "Community Residential Setting"
    return f'''<div class="bcard" style="flex-direction:column;">
      <div style="display:flex;gap:12px;">
        <div class="avatar-init">{(l["program_name"][:2]).upper()}</div>
        <div><div class="bcard-title">{l["program_name"]}</div><div class="bcard-meta">{tagline} &middot; {l["county"]} County</div></div>
      </div>
      <div class="bcard-tags">
        <div class="badge badge-dhs">{icon("shield", extra='style="width:12px;height:12px"')}DHS-Verified</div>
        <div class="status status-{l["status_class"]}">{icon("check-circle" if l["status_class"]=="active" else "alert", extra='style="width:12px;height:12px"')}{STATUS_LABEL[l["status_class"]]}</div>
      </div>
      <div class="bcard-cta"><a class="btn-primary" href="{prefix}profiles/{l["slug"]}.html">View profile</a></div>
    </div>'''

index_body = f'''
<section class="hero">
  <div class="hero-glow a"></div>
  <div class="hero-glow b"></div>
  <div class="wrap" style="padding:76px 24px 64px;text-align:center;">
    <div style="display:inline-flex;align-items:center;gap:7px;background:oklch(38% 0.08 255);color:oklch(88% 0.03 255);border-radius:999px;padding:6px 14px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:26px;">
      {icon("shield", extra='style="width:13px;height:13px;stroke:oklch(88% 0.03 255)"')} Sourced directly from Minnesota DHS
    </div>
    <h1 class="display" style="color:#fff;font-size:47px;line-height:1.13;letter-spacing:-.01em;margin:0 0 17px;">Find licensed care,<br>verified by the state.</h1>
    <p style="color:oklch(85% 0.02 255);font-size:15.5px;max-width:540px;margin:0 auto 32px;">Launch cohort: {N_CO} Minnesota operators, {N_LOC} DHS-licensed locations across {len(COUNTIES)} counties.</p>
    <form action="search.html" method="get" class="search-bar" style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;padding:7px 7px 7px 18px;display:flex;align-items:center;gap:10px;box-shadow:var(--shadow-lg);transition:box-shadow .2s ease;">
      {icon("search", extra='style="stroke:var(--ink-3)"')}
      <input name="q" placeholder="Search by provider name, city, or county&hellip;" style="flex:1;border:none;outline:none;font-size:14.5px;font-family:inherit;color:var(--ink);padding:9px 0;">
      <button class="btn-primary" type="submit">Search</button>
    </form>
  </div>
</section>

<section style="background:var(--surface-2);border-bottom:1px solid var(--border);border-top:1px solid var(--border);">
  <div class="wrap" style="padding:22px 24px;display:flex;justify-content:center;gap:48px;text-align:center;flex-wrap:wrap;">
    <div><div class="display tabular" style="font-size:23px;font-weight:600;">{N_LOC}</div><div class="label">DHS-licensed locations</div></div>
    <div style="width:1px;background:var(--border);"></div>
    <div><div class="display tabular" style="font-size:23px;font-weight:600;">{N_CO}</div><div class="label">Operator providers</div></div>
    <div style="width:1px;background:var(--border);"></div>
    <div><div class="display tabular" style="font-size:23px;font-weight:600;">{active_count}</div><div class="label">Active licenses</div></div>
    <div style="width:1px;background:var(--border);"></div>
    <div><div class="display" style="font-size:23px;font-weight:600;">{len(COUNTIES)}</div><div class="label">Counties covered</div></div>
  </div>
</section>

<section class="wrap" style="padding:44px 24px 8px;">
  <h2 class="display" style="font-size:22px;margin:0 0 10px;max-width:640px;">Why start here instead of calling around, county by county?</h2>
  <p style="color:var(--ink-2);font-size:14.5px;line-height:1.65;margin:0 0 26px;max-width:680px;">Because you deserve a straight answer, fast &mdash; not an afternoon of hold music. Every one of the {N_LOC} Minnesota DHS-licensed group homes, foster care sites, and crisis respite locations below comes straight from the state's own Community Residential Setting (CRS) licensing lookup &mdash; not a scraped listing, not a pay-to-appear directory. Filter by county, service type, and real license status before you make your first call, so every call you do make is one worth making.</p>
  <div class="grid-topics">
    <div class="topic-tile" style="cursor:default;">
      <div class="topic-icon">{icon("shield", extra='style="width:22px;height:22px;stroke:var(--accent-ink)"')}</div>
      <div class="topic-title">Sourced directly from DHS</div>
      <div class="topic-desc">Every license number, address, and status shown is pulled from Minnesota's own public CRS licensing export &mdash; nothing here is scraped, guessed, or user-submitted.</div>
    </div>
    <div class="topic-tile" style="cursor:default;">
      <div class="topic-icon">{icon("check-circle", extra='style="width:22px;height:22px;stroke:var(--accent-ink)"')}</div>
      <div class="topic-title">Real license status, not a guess</div>
      <div class="topic-desc">{active_count} of {N_LOC} locations show an Active license today. Provisional, conditional, and lapsed statuses are labeled plainly &mdash; never hidden to make a listing look better.</div>
    </div>
    <div class="topic-tile" style="cursor:default;">
      <div class="topic-icon">{icon("search", extra='style="width:22px;height:22px;stroke:var(--accent-ink)"')}</div>
      <div class="topic-title">Free to search, no account needed</div>
      <div class="topic-desc">No login wall, no lead-gen form between you and a phone number. Search and filtering run in your browser against the published dataset.</div>
    </div>
    <div class="topic-tile" style="cursor:default;">
      <div class="topic-icon">{icon("mappin", extra='style="width:22px;height:22px;stroke:var(--accent-ink)"')}</div>
      <div class="topic-title">Statewide, not just the metro</div>
      <div class="topic-desc">Coverage spans all {len(COUNTIES)} counties in this launch cohort, from Hennepin County to Yellow Medicine County &mdash; see the full breakdown below.</div>
    </div>
  </div>
</section>

<section class="wrap" style="padding:28px 24px 8px;">
  <div class="ad-carousel" id="adCarousel">
    <div class="ad-slide-track">{ad_slides}</div>
    <button class="ad-nav ad-nav-prev" type="button" aria-label="Previous ad">{icon("chevron-r", extra='style="width:16px;height:16px;stroke:var(--ink-2);transform:scaleX(-1)"')}</button>
    <button class="ad-nav ad-nav-next" type="button" aria-label="Next ad">{icon("chevron-r", extra='style="width:16px;height:16px;stroke:var(--ink-2)"')}</button>
    <div class="ad-dots">{ad_dots}</div>
  </div>
</section>

<section class="wrap" style="padding:36px 24px 8px;">
  <h2 class="display" style="font-size:22px;margin:0 0 6px;">Browse by service type</h2>
  <p style="color:var(--ink-3);font-size:14px;margin:0 0 20px;">Categories reflect the actual Minnesota DHS license sub-types on file for this cohort.</p>
  <div class="grid-topics">{tag_grid_items}</div>
</section>

<section class="wrap" style="padding:48px 24px 8px;">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:24px;">
    <div>
      <h2 class="display" style="font-size:24px;margin:0 0 6px;">Statewide coverage, county by county</h2>
      <p style="color:var(--ink-3);font-size:14px;margin:0;max-width:480px;">Real DHS-licensed locations across all {len(COUNTIES)} counties in this launch cohort &mdash; not just the metro.</p>
    </div>
    <div style="display:flex;gap:30px;">
      <div style="text-align:right;"><div class="display tabular" style="font-size:27px;font-weight:700;color:var(--brand);">{len(COUNTIES)}</div><div class="label">Counties</div></div>
      <div style="text-align:right;"><div class="display tabular" style="font-size:27px;font-weight:700;color:var(--brand);">{active_count}</div><div class="label">Active licenses</div></div>
    </div>
  </div>

  <div class="county-top-grid">{county_top_cards}</div>

  <div class="card" style="margin-top:20px;padding:20px 22px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="font-weight:800;font-size:14.5px;">Browse all {len(COUNTIES)} counties</div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:8px 8px 8px 12px;min-width:220px;">
        {icon("search", extra='style="width:14px;height:14px;stroke:var(--ink-3)"')}
        <input id="countyFilter" placeholder="Filter counties&hellip;" style="flex:1;border:none;outline:none;background:transparent;font-size:13px;font-family:inherit;color:var(--ink);">
      </div>
    </div>
    <div class="county-chip-grid" id="countyChipGrid">{county_chips}</div>
    <div id="countyChipEmpty" class="empty-state" style="display:none;">No counties match that filter.</div>
  </div>
</section>
<script>{COUNTY_FILTER_JS}</script>

<section class="wrap" style="padding:44px 24px 8px;">
  <h2 class="display" style="font-size:22px;margin:0 0 16px;">Example listings</h2>
  <div class="grid-3">{"".join(bcard(l) for l in sample)}</div>
</section>

<section id="about" class="wrap" style="padding:48px 24px 20px;">
  <div class="card" style="padding:22px 24px;background:var(--surface-2);">
    <div style="font-weight:800;font-size:15px;margin-bottom:8px;">About this prototype</div>
    <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6;margin:0;">This is a working demo built from real Minnesota DHS licensing data, scoped to the {N_CO}-operator launch cohort (all operators with fewer than 9 licensed locations). Every location, address, phone number, license number, and license status shown is real public licensing data. Nothing has been claimed yet &mdash; there are no photos, descriptions, or reviews beyond what DHS provides, by design. Search and filtering run entirely in your browser against a static data file; there is no backend, login, or payment processing in this build. The sponsored banner above is a working example of a paid ad slot (<code>AD_SLOT_HOME_FEATURED_CAROUSEL</code> in the platform spec) &mdash; the three example cards are illustrative, not paying customers.</p>
  </div>
</section>

<script>
(function(){{
  var root = document.getElementById("adCarousel");
  if (!root) return;
  var slides = root.querySelectorAll(".ad-slide");
  var dots = root.querySelectorAll(".ad-dot");
  var i = 0, timer;
  function show(n){{
    i = (n + slides.length) % slides.length;
    slides.forEach(function(s, idx){{ s.classList.toggle("active", idx === i); }});
    dots.forEach(function(d, idx){{ d.classList.toggle("active", idx === i); }});
  }}
  function start(){{ stop(); timer = setInterval(function(){{ show(i + 1); }}, 7000); }}
  function stop(){{ clearInterval(timer); }}
  root.querySelector(".ad-nav-prev").onclick = function(){{ show(i - 1); start(); }};
  root.querySelector(".ad-nav-next").onclick = function(){{ show(i + 1); start(); }};
  dots.forEach(function(d){{ d.onclick = function(){{ show(+d.dataset.i); start(); }}; }});
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  show(0); start();
}})();
</script>
'''

index_title = "Licensed Care MN | Minnesota DHS-Licensed CRS Search"
index_desc = f"Search {N_LOC} DHS-licensed group homes, foster care & crisis respite providers across {len(COUNTIES)} Minnesota counties. Free, with real license status on every listing."

def _plain(s):
    return html.unescape(re.sub("<[^<]+?>", "", s)).strip()

# FAQ content now lives on its own page (faq.html) -- see below, right after
# guide.html. The homepage just teases it with 2 questions and a link, to
# avoid splitting one FAQPage's worth of schema across multiple pages.
FAQ_TEASER = [
    ("Is this directory affiliated with Minnesota DHS?",
     "No. This site is built from Minnesota DHS's public Community Residential Setting (CRS) licensing lookup, but it is an independent directory &mdash; not operated, endorsed, or reviewed by the Minnesota Department of Human Services."),
    ("Is it free to search?",
     f"Yes. Searching, filtering by county or service type, and viewing every one of the {N_LOC} listed locations is free and does not require an account. Filtering runs entirely in your browser against the published dataset."),
]
faq_teaser_html = "".join(f'''
  <details class="card" style="padding:16px 20px;margin-bottom:10px;">
    <summary style="cursor:pointer;font-weight:700;font-size:14.5px;color:var(--ink);">{q}</summary>
    <div style="margin-top:10px;font-size:13.5px;color:var(--ink-2);line-height:1.65;">{a}</div>
  </details>''' for q, a in FAQ_TEASER)
faq_section = f'''
<section class="wrap" style="padding:44px 24px 8px;">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:6px;">
    <h2 class="display" style="font-size:22px;margin:0;">Frequently asked questions</h2>
    <a href="faq.html" style="font-size:13px;font-weight:700;color:var(--brand);">See all FAQs &rsaquo;</a>
  </div>
  <p style="color:var(--ink-3);font-size:14px;margin:0 0 20px;max-width:640px;">Straight answers about how this directory works and what the data does &mdash; and doesn't &mdash; tell you.</p>
  <div style="max-width:760px;">{faq_teaser_html}</div>
</section>
'''
index_body = index_body.replace('<section id="about"', faq_section + '\n<section id="about"')

ld_website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Licensed Care MN",
    "url": f"{SITE_DOMAIN}/",
    "description": index_desc,
    "potentialAction": {
        "@type": "SearchAction",
        "target": {"@type": "EntryPoint", "urlTemplate": f"{SITE_DOMAIN}/search.html?q={{search_term_string}}"},
        "query-input": "required name=search_term_string",
    },
}
ld_org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Licensed Care MN",
    "url": f"{SITE_DOMAIN}/",
    "description": "A directory of Minnesota DHS-licensed Community Residential Setting (CRS) providers, built from public state licensing data.",
}
index_meta_extra = seo_meta(index_title, index_desc, "index.html", jsonld_blocks=[ld_website, ld_org])

with open("site/index.html", "w") as f:
    f.write(PAGE.format(favicon=FAVICON_HREF, title=index_title, meta_extra=index_meta_extra, prefix="", header=header(), footer=footer(), body=index_body))

print("wrote site/index.html")

# ---------- guide.html (long-form educational content: written to rank on its
# own for informational queries and to be directly citable by AI answer
# engines -- general, non-location-specific content only, per the
# never-fabricate-real-business-data rule; nothing here describes a specific
# real operator) ----------
service_type_rows = "".join(f'''
    <div class="card" style="padding:16px 18px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start;">
      <div class="topic-icon" style="margin:0;flex-shrink:0;">{icon(TAG_META[t]["icon"], extra='style="width:20px;height:20px;stroke:var(--accent-ink)"')}</div>
      <div>
        <div style="font-weight:700;font-size:14.5px;margin-bottom:3px;">{t}</div>
        <div style="font-size:13.5px;color:var(--ink-2);line-height:1.6;margin-bottom:6px;">{TAG_META[t]["desc"]}</div>
        <a href="search.html?tag={t.replace(" ", "+")}" style="font-size:12.5px;font-weight:700;color:var(--brand);">See {tag_counts_active[t]} active locations licensed for this &rsaquo;</a>
      </div>
    </div>''' for t in TAGS)

# Full FAQ content (including the CRS-licensing-specific questions that used
# to live inline here) now lives on its own page -- faq.html, built right
# after this one -- so there's exactly one FAQPage per topic, not duplicated
# schema/content spread across guide.html and faq.html.
guide_body = f'''
<div class="wrap" style="padding:22px 24px 0;">
  <div style="font-size:12.5px;color:var(--ink-3);font-weight:600;margin-bottom:14px;"><a href="index.html">Home</a> &rsaquo; CRS Licensing Guide</div>
</div>

<div class="wrap" style="padding:0 24px 8px;max-width:820px;">
  <h1 class="display" style="font-size:32px;line-height:1.2;margin:0 0 14px;">How to Choose a Licensed Community Residential Setting in Minnesota</h1>
  <p style="font-size:15.5px;color:var(--ink-2);line-height:1.7;margin:0 0 8px;">A Community Residential Setting (CRS) is a residential program &mdash; commonly a group home, foster care home, or supported living site &mdash; licensed by the Minnesota Department of Human Services (DHS) under Minnesota Statutes Chapter 245D, the state's Home and Community-Based Services standards. This guide explains what that licensing actually covers, how the service categories differ, and what's worth asking before you or someone you're helping moves forward &mdash; using the same {N_LOC}-location, {len(COUNTIES)}-county dataset that powers this directory's <a href="search.html" style="color:var(--brand);font-weight:600;">search</a>.</p>
</div>

<div class="wrap" style="padding:20px 24px 0;max-width:820px;">
  <h2 style="font-weight:800;font-size:19px;margin:0 0 10px;">What is a Community Residential Setting (CRS)?</h2>
  <p style="font-size:14.5px;color:var(--ink-2);line-height:1.75;margin:0 0 28px;">A CRS is a licensed residential program where DHS has approved the operator to provide 24-hour or scheduled support to people with disabilities, mental illness, or other qualifying needs, outside of a hospital or institutional setting. Licensing falls under Chapter 245D, and every CRS location holds a license number tied to a specific address and license holder (operator) &mdash; the same identifiers shown on every profile in this directory. DHS, not this site, is the licensing authority; this directory republishes DHS's own public data to make it searchable.</p>

  <h2 style="font-weight:800;font-size:19px;margin:0 0 4px;">What are the CRS service types, and how do they differ?</h2>
  <p style="font-size:14.5px;color:var(--ink-2);line-height:1.75;margin:0 0 16px;">DHS licenses several distinct CRS service sub-types. Here's what's actually on file for this launch cohort, with the real count of active locations for each:</p>
  <div style="margin-bottom:12px;">{service_type_rows}</div>

  <h2 style="font-weight:800;font-size:19px;margin:0 0 10px;">How do I check whether a provider's license is currently active?</h2>
  <p style="font-size:14.5px;color:var(--ink-2);line-height:1.75;margin:0 0 28px;">Every profile in this directory shows a license-status badge pulled from the same DHS export: <strong>Active License</strong>, <strong>Provisional / Conditional</strong>, or <strong>Not Currently Licensed</strong>. Status can change between DHS data pulls, so for any time-sensitive placement decision, confirm current status directly with the provider or with DHS before referring or admitting someone &mdash; treat this directory as a fast, complete starting point, not a live regulatory feed.</p>

  <h2 style="font-weight:800;font-size:19px;margin:0 0 10px;">What should I ask before choosing a provider?</h2>
  <ul style="font-size:14.5px;color:var(--ink-2);line-height:1.9;margin:0 0 28px;padding-left:22px;">
    <li>Is the license currently Active, and does the service sub-type match the actual need (Foster Care vs. Crisis Respite vs. Adult Mental Health Certification, etc.)?</li>
    <li>Does the location currently have openings, and how soon could someone be admitted?</li>
    <li>What's the staff-to-resident ratio and on-site supervision schedule &mdash; ask directly, since DHS's public export doesn't include this level of operational detail?</li>
    <li>Is the county and location practical for family visits, medical appointments, and case-manager check-ins?</li>
    <li>Has the listing been claimed by the operator (a claimed profile can offer more detail than DHS's bare licensing record alone)?</li>
  </ul>

  <h2 style="font-weight:800;font-size:19px;margin:0 0 10px;">How complete is this directory?</h2>
  <p style="font-size:14.5px;color:var(--ink-2);line-height:1.75;margin:0 0 28px;">This prototype covers a {N_CO}-operator, {N_LOC}-location launch cohort &mdash; every operator with fewer than 9 licensed locations statewide &mdash; not the full statewide list of Minnesota CRS providers. It's a working proof of concept for a statewide expansion, built to prove the model on real data rather than mockups. See <a href="index.html#about" style="color:var(--brand);font-weight:600;">About this prototype</a> for the exact scope.</p>

  <div class="card" style="padding:18px 20px;margin-bottom:0;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
    <div>
      <div style="font-weight:800;font-size:15px;margin-bottom:4px;">Have more questions?</div>
      <div style="font-size:13.5px;color:var(--ink-2);">License status, the DHS-Verified badge, how to reach a provider, and more &mdash; answered on the full FAQ page.</div>
    </div>
    <a class="btn-secondary" href="faq.html">See all FAQs</a>
  </div>

  <div class="card" style="margin-top:16px;padding:20px 22px;background:var(--surface-2);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
    <div>
      <div style="font-weight:800;font-size:15px;margin-bottom:4px;">Ready to search?</div>
      <div style="font-size:13.5px;color:var(--ink-2);">Filter all {N_LOC} licensed locations by county, service type, and status.</div>
    </div>
    <a class="btn-primary" href="search.html">Browse providers</a>
  </div>
</div>
<div style="height:36px;"></div>
'''

guide_title = "How to Choose a Licensed CRS Provider in Minnesota"
guide_desc = f"A plain-language guide to Minnesota CRS licensing under Chapter 245D — service types, how to verify license status, and what to ask before choosing a provider."
ld_guide_breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE_DOMAIN}/index.html"},
        {"@type": "ListItem", "position": 2, "name": "CRS Licensing Guide", "item": f"{SITE_DOMAIN}/guide.html"},
    ],
}
ld_guide_article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": guide_title,
    "description": guide_desc,
    "url": f"{SITE_DOMAIN}/guide.html",
    "author": {"@type": "Organization", "name": "Licensed Care MN"},
    "publisher": {"@type": "Organization", "name": "Licensed Care MN"},
    "about": "Minnesota Community Residential Setting (CRS) licensing",
}
guide_meta_extra = seo_meta(guide_title, guide_desc, "guide.html", jsonld_blocks=[ld_guide_article, ld_guide_breadcrumb])

with open("site/guide.html", "w") as f:
    f.write(PAGE.format(favicon=FAVICON_HREF, title=guide_title, meta_extra=guide_meta_extra, prefix="", header=header(), footer=footer(), body=guide_body))

print("wrote site/guide.html")

# ---------- faq.html (single canonical FAQ page -- consolidates what used to
# be two smaller FAQ sections split across index.html and guide.html into one
# FAQPage, grouped by topic. General, non-location-specific content only. ----------
FAQ_GROUPS = [
    ("About Licensed Care MN", [
        ("Is this directory affiliated with Minnesota DHS?",
         "No. This site is built from Minnesota DHS's public Community Residential Setting (CRS) licensing lookup, but it is an independent directory &mdash; not operated, endorsed, or reviewed by the Minnesota Department of Human Services."),
        ("Is it free to search?",
         f"Yes. Searching, filtering by county or service type, and viewing every one of the {N_LOC} listed locations is free and does not require an account. Filtering runs entirely in your browser against the published dataset."),
        ("Can I trust the license status shown on a listing?",
         "Each listing's status reflects Minnesota DHS's public licensing data as of this snapshot. License status can change, so for a time-sensitive placement, always confirm current status directly with the provider or with DHS before referring or admitting someone."),
        ("What's the difference between the service types (Foster Care, Crisis Respite, etc.)?",
         'Each is a distinct DHS-licensed service sub-type with its own scope &mdash; see the <a href="guide.html">CRS licensing guide</a> for a plain-language breakdown of what each category actually means and how to tell them apart.'),
        ("Why isn't every Minnesota CRS provider listed here?",
         f"This prototype covers a {N_CO}-operator, {N_LOC}-location launch cohort (operators with fewer than 9 licensed locations statewide) to prove out the model before a full statewide expansion &mdash; see <a href=\"index.html#about\">About this prototype</a> for the exact scope."),
    ]),
    ("About CRS licensing", [
        ("What does the &ldquo;DHS-Verified&rdquo; badge mean?",
         "It means the field it's attached to &mdash; address, license number, license status &mdash; comes directly from Minnesota DHS's public licensing export, not from an unverified submission. It is not a quality rating or an endorsement of care."),
        ("What's the difference between Active, Provisional/Conditional, and Not Currently Licensed?",
         '<strong>Active</strong> means DHS shows the license currently in good standing. <strong>Provisional/Conditional</strong> covers licenses DHS has flagged with a condition, restriction, or provisional status short of full active standing. <strong>Not Currently Licensed</strong> means the license is not currently active under that number &mdash; it does not necessarily mean the location is closed, only that this specific license record is not active. Always confirm directly with DHS or the provider before treating any status as final.'),
        ("If a provider is licensed, is it automatically a good fit?",
         'Licensing confirms DHS has approved the operator to provide CRS services under state standards &mdash; it doesn\'t tell you about staff-to-resident ratios, day-to-day culture, or whether a specific person\'s needs will be well met. Treat an active license as a floor, not a full answer &mdash; see the <a href="guide.html">CRS licensing guide</a> for questions worth asking before choosing a provider.'),
        ("How do I actually reach a provider?",
         "Call the phone number on file, shown on that location's profile. If no phone number is shown, DHS's public export didn't include one for that record &mdash; this directory never invents a contact number to fill the gap."),
        ("Where does the information on this page come from?",
         'DHS\'s public CRS licensing lookup and Minnesota Statutes Chapter 245D (Home and Community-Based Services Standards). This is general information, not legal or clinical advice &mdash; for authoritative, current regulatory detail, contact <a href="https://mn.gov/dhs/" target="_blank" rel="noopener">Minnesota DHS</a> directly.'),
    ]),
]
FAQ_ALL = [qa for _, items in FAQ_GROUPS for qa in items]

faq_groups_html = ""
for group_title, items in FAQ_GROUPS:
    items_html = "".join(f'''
  <details class="card" style="padding:16px 20px;margin-bottom:10px;">
    <summary style="cursor:pointer;font-weight:700;font-size:14.5px;color:var(--ink);">{q}</summary>
    <div style="margin-top:10px;font-size:13.5px;color:var(--ink-2);line-height:1.65;">{a}</div>
  </details>''' for q, a in items)
    faq_groups_html += f'''
  <h2 style="font-weight:800;font-size:17px;margin:28px 0 12px;">{group_title}</h2>
  {items_html}'''

faq_body = f'''
<div class="wrap" style="padding:22px 24px 0;">
  <div style="font-size:12.5px;color:var(--ink-3);font-weight:600;margin-bottom:14px;"><a href="index.html">Home</a> &rsaquo; FAQ</div>
</div>

<div class="wrap" style="padding:0 24px 8px;max-width:820px;">
  <h1 class="display" style="font-size:30px;line-height:1.2;margin:0 0 12px;">Frequently Asked Questions</h1>
  <p style="font-size:15px;color:var(--ink-2);line-height:1.7;margin:0;">Straight answers about how Licensed Care MN works, what the DHS-sourced data does and doesn't tell you, and how Minnesota's CRS licensing terms fit together &mdash; all in one place.</p>
</div>

<div class="wrap" style="padding:6px 24px 0;max-width:820px;">
  {faq_groups_html}

  <div class="card" style="margin-top:32px;padding:20px 22px;background:var(--surface-2);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
    <div>
      <div style="font-weight:800;font-size:15px;margin-bottom:4px;">Still have a question?</div>
      <div style="font-size:13.5px;color:var(--ink-2);">Read the full <a href="guide.html" style="color:var(--brand);font-weight:600;">CRS licensing guide</a>, or jump straight to search.</div>
    </div>
    <a class="btn-primary" href="search.html">Browse providers</a>
  </div>
</div>
<div style="height:36px;"></div>
'''

faq_title = "Frequently Asked Questions | Licensed Care MN"
faq_desc = "Answers on how Licensed Care MN works, how to read DHS license status, and how Minnesota's CRS service categories differ — all in one FAQ."
ld_faq_page = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": _plain(q), "acceptedAnswer": {"@type": "Answer", "text": _plain(a)}}
        for q, a in FAQ_ALL
    ],
}
ld_faq_breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE_DOMAIN}/index.html"},
        {"@type": "ListItem", "position": 2, "name": "FAQ", "item": f"{SITE_DOMAIN}/faq.html"},
    ],
}
faq_meta_extra = seo_meta(faq_title, faq_desc, "faq.html", jsonld_blocks=[ld_faq_page, ld_faq_breadcrumb])

with open("site/faq.html", "w") as f:
    f.write(PAGE.format(favicon=FAVICON_HREF, title=faq_title, meta_extra=faq_meta_extra, prefix="", header=header(), footer=footer(), body=faq_body))

print("wrote site/faq.html")

# ---------- search.html ----------
search_body = f'''
<div style="border-bottom:1px solid var(--border);background:var(--surface);">
  <div class="wrap" style="padding:22px 24px 0;">
    <h1 class="display" style="font-size:21px;margin:0 0 4px;">Search {N_LOC} Minnesota DHS-licensed CRS providers</h1>
    <p style="color:var(--ink-3);font-size:13.5px;margin:0 0 16px;max-width:640px;">Filter by county, service type, or license status &mdash; every result links to a profile with real DHS license data. New to CRS licensing terms? See the <a href="guide.html" style="color:var(--brand);font-weight:600;">CRS licensing guide</a> or the <a href="faq.html" style="color:var(--brand);font-weight:600;">FAQ</a>.</p>
    <div class="search-bar" style="display:flex;align-items:center;gap:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:11px 8px 11px 16px;transition:box-shadow .2s ease,border-color .2s ease;">
      {icon("search", extra='style="stroke:var(--ink-3)"')}
      <input id="q" placeholder="Search by provider name, city, or county&hellip;" style="flex:1;border:none;outline:none;background:transparent;font-size:14.5px;font-family:inherit;color:var(--ink);">
    </div>
    <div id="activeChips" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 0 14px;"></div>
  </div>
</div>

<div class="wrap search-grid" style="padding:20px 24px 60px;">
  <aside class="card" style="padding:18px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">{icon("sliders", extra='style="width:16px;height:16px;stroke:var(--ink-2)"')}<div style="font-weight:800;font-size:14px;">Filters</div></div>

    <div class="label" style="margin-bottom:6px;">License status</div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-2);padding:5px 0;"><input type="radio" name="status" value="active" checked> Active only</label>
    <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-2);padding:5px 0;"><input type="radio" name="status" value="any"> Any status</label>

    <div class="label" style="margin:16px 0 6px;">Service type</div>
    <div id="tagFilters"></div>

    <div class="label" style="margin:16px 0 6px;">County</div>
    <select id="countySel" style="width:100%;border:1px solid var(--border);border-radius:9px;padding:9px 10px;font-size:13.5px;font-family:inherit;">
      <option value="">All counties</option>
    </select>

    <button id="clearBtn" class="btn-secondary" style="width:100%;justify-content:center;margin-top:16px;">Clear filters</button>
  </aside>

  <div>
    <div id="resultCount" style="font-size:14px;color:var(--ink-2);font-weight:600;margin-bottom:14px;"></div>
    <div id="results" style="display:flex;flex-direction:column;gap:14px;"></div>
    <div id="empty" style="display:none;text-align:center;padding:60px 20px;color:var(--ink-3);">No providers match these filters. Try clearing one.</div>
  </div>
</div>
<script>window.LOCATIONS_DATA = {json.dumps(LOCS)};</script>
<script src="assets/search.js"></script>
'''

search_title = "Browse Providers | Licensed Care MN"
search_desc = f"Filter all {N_LOC} Minnesota DHS-licensed CRS locations by county, service type, and license status — free, no account required."
search_meta_extra = seo_meta(search_title, search_desc, "search.html")
with open("site/search.html", "w") as f:
    f.write(PAGE.format(favicon=FAVICON_HREF, title=search_title, meta_extra=search_meta_extra, prefix="", header=header(), footer=footer(), body=search_body))
print("wrote site/search.html")

# ---------- search.js ----------
SEARCH_JS = '''
const STATUS_LABEL = {active:"Active License", caution:"Provisional / Conditional", critical:"Not Currently Licensed"};
const ICONS = {
  "check-circle": '<path d="M8.2 12.3l2.5 2.5 5-5.4"/><circle cx="12" cy="12" r="9" style="display:none"/>',
};
let ALL = [];
let selectedTags = new Set();
let selectedCounty = "";
let statusMode = "active";
let query = "";

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function cardHtml(l){
  const tagline = l.tags.slice(0,2).join(" \u00b7 ") || "Community Residential Setting";
  const statusClass = l.status_class;
  const statusIcon = statusClass === "active"
    ? '<circle cx="12" cy="12" r="9"/><path d="M8.2 12.3l2.5 2.5 5-5.4"/>'
    : '<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none"/>';
  return `
  <div class="bcard">
    <div class="avatar-init">${escapeHtml(l.program_name.slice(0,2).toUpperCase())}</div>
    <div style="flex:1;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div class="bcard-title">${escapeHtml(l.program_name)}</div>
          <div class="bcard-meta">${escapeHtml(tagline)} &middot; ${escapeHtml(l.city)}, ${escapeHtml(l.county)} County</div>
        </div>
      </div>
      <div class="bcard-tags">
        <div class="badge badge-dhs"><svg class="icon" style="width:12px;height:12px" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z"/><path d="M8.7 12.2l2.3 2.3 4.3-4.6"/></svg>DHS-Verified</div>
        <div class="status status-${statusClass}"><svg class="icon" style="width:12px;height:12px" viewBox="0 0 24 24" fill="none">${statusIcon}</svg>${STATUS_LABEL[statusClass]}</div>
        <div class="badge badge-unverified">Unclaimed</div>
      </div>
      <div class="bcard-cta">
        <a class="btn-primary" href="profiles/${l.slug}.html">View profile</a>
        <a class="btn-secondary" href="tel:${escapeHtml((l.phone||"").replace(/[^0-9+]/g,""))}"><svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none"><path d="M7 3.5H4.5A1.5 1.5 0 0 0 3 5c0 9.4 7.6 17 17 17a1.5 1.5 0 0 0 1.5-1.5V18c0-.6-.4-1.1-1-1.2-1.2-.3-2.3-.7-3.4-1.2-.5-.2-1 0-1.4.4l-1.7 1.7a15.3 15.3 0 0 1-6.2-6.2l1.7-1.7c.4-.4.5-.9.4-1.4a12 12 0 0 1-1.2-3.4c-.1-.6-.6-1-1.2-1Z"/></svg>${escapeHtml(l.phone||"")}</a>
      </div>
    </div>
  </div>`;
}

function applyFilters(){
  let out = ALL;
  if (statusMode === "active") out = out.filter(l => l.status_class === "active");
  if (selectedTags.size) out = out.filter(l => l.tags.some(t => selectedTags.has(t)));
  if (selectedCounty) out = out.filter(l => l.county === selectedCounty);
  if (query.trim()){
    const q = query.trim().toLowerCase();
    out = out.filter(l => (l.program_name + " " + l.company + " " + l.city + " " + l.county).toLowerCase().includes(q));
  }
  return out;
}

function renderChips(){
  const el = document.getElementById("activeChips");
  const chips = [];
  if (query.trim()) chips.push({label: `"${query.trim()}"`, clear: () => { query=""; document.getElementById("q").value=""; }});
  selectedTags.forEach(t => chips.push({label: t, clear: () => { selectedTags.delete(t); render(); }}));
  if (selectedCounty) chips.push({label: selectedCounty + " County", clear: () => { selectedCounty=""; document.getElementById("countySel").value=""; }});
  if (statusMode === "active") chips.push({label: "Active license", clear: () => { statusMode="any"; document.querySelector('input[name=status][value=any]').checked = true; }});
  el.innerHTML = chips.map((c,i) => `<span class="chip" data-i="${i}">${escapeHtml(c.label)} &times;</span>`).join("");
  [...el.children].forEach((node, i) => node.onclick = () => { chips[i].clear(); render(); });
}

function render(){
  const filtered = applyFilters();
  document.getElementById("resultCount").textContent = `${filtered.length} provider${filtered.length===1?"":"s"} match your search`;
  document.getElementById("results").innerHTML = filtered.map(cardHtml).join("");
  document.getElementById("empty").style.display = filtered.length ? "none" : "block";
  renderChips();
}

function init(locations){
  ALL = locations;
  const counties = [...new Set(locations.map(l=>l.county))].sort();
  const countySel = document.getElementById("countySel");
  counties.forEach(c => { const o=document.createElement("option"); o.value=c; o.textContent = c + " County"; countySel.appendChild(o); });

  const tags = [...new Set(locations.flatMap(l=>l.tags))].sort();
  const tagBox = document.getElementById("tagFilters");
  tagBox.innerHTML = tags.map(t => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);padding:5px 0;"><input type="checkbox" data-tag="${escapeHtml(t)}"> ${escapeHtml(t)}</label>`).join("");
  tagBox.querySelectorAll("input[type=checkbox]").forEach(cb => cb.onchange = () => {
    if (cb.checked) selectedTags.add(cb.dataset.tag); else selectedTags.delete(cb.dataset.tag);
    render();
  });

  document.getElementById("q").oninput = (e) => { query = e.target.value; render(); };
  countySel.onchange = (e) => { selectedCounty = e.target.value; render(); };
  document.querySelectorAll('input[name=status]').forEach(r => r.onchange = (e) => { statusMode = e.target.value; render(); });
  document.getElementById("clearBtn").onclick = () => {
    selectedTags.clear(); selectedCounty=""; statusMode="active"; query="";
    document.getElementById("q").value = "";
    countySel.value = "";
    tagBox.querySelectorAll("input").forEach(cb=>cb.checked=false);
    document.querySelector('input[name=status][value=active]').checked = true;
    render();
  };

  const params = new URLSearchParams(location.search);
  if (params.get("q")) { query = params.get("q"); document.getElementById("q").value = query; }
  if (params.get("tag")) { const t = params.get("tag"); if (tags.includes(t)) { selectedTags.add(t); tagBox.querySelector(`input[data-tag="${t}"]`).checked = true; } }
  if (params.get("county")) { const c = params.get("county"); if (counties.includes(c)) { selectedCounty = c; countySel.value = c; } }

  render();
}

if (window.LOCATIONS_DATA) {
  init(window.LOCATIONS_DATA);
} else {
  fetch("data/locations.json").then(r => r.json()).then(init);
}
'''
with open("site/assets/search.js", "w") as f:
    f.write(SEARCH_JS)
print("wrote site/assets/search.js")

# ---------- profile pages ----------
by_county = defaultdict(list)
for l in LOCS:
    by_county[l["county"]].append(l)

def profile_body(l):
    tags_html = "".join(f'<div class="svctag">{t}</div>' for t in l["tags"]) or '<div class="svctag">Community Residential Setting</div>'
    status_icon = "check-circle" if l["status_class"] == "active" else ("alert" if l["status_class"] == "caution" else "x-circle")
    tel = re.sub(r"[^0-9+]", "", l["phone"] or "")
    tag_sentence = ", ".join(l["tags"]) if l["tags"] else "Community Residential Setting services"
    nearby = [n for n in by_county[l["county"]] if n["slug"] != l["slug"]][:3]
    nearby_html = "".join(f'''
        <div class="card" style="padding:13px;display:flex;gap:10px;align-items:center;">
          <div class="avatar-init" style="width:36px;height:36px;font-size:11px;">{n["program_name"][:2].upper()}</div>
          <div style="flex:1;"><div style="font-weight:700;font-size:13px;">{n["program_name"]}</div><div style="font-size:11.5px;color:var(--ink-3);">{n["city"]} &middot; {STATUS_LABEL[n["status_class"]]}</div></div>
          <a href="{n["slug"]}.html" style="font-size:12px;font-weight:700;">View</a>
        </div>''' for n in nearby) or '<p style="font-size:13px;color:var(--ink-3);">No other launch-cohort locations in this county yet.</p>'

    return f'''
<div class="wrap" style="padding:18px 24px 0;">
  <div style="border:1.5px dashed var(--border);border-radius:14px;padding:14px 16px;background:oklch(97% 0.005 240);display:flex;align-items:center;gap:14px;">
    {icon("shield", extra='style="stroke:var(--brand)"')}
    <div style="flex:1;font-size:13.5px;color:var(--ink-2);"><strong style="color:var(--ink);">Is this your listing?</strong> This profile is auto-populated from Minnesota DHS licensing data and has not been claimed. Claiming adds photos, a description, and lets you respond to inquiries.</div>
    <button class="btn-primary" style="padding:9px 16px;font-size:13.5px;" disabled title="Prototype only &mdash; claim flow not wired up">Claim This Listing</button>
  </div>
</div>

<div class="wrap" style="padding:26px 24px 6px;">
  <div style="font-size:12.5px;color:var(--ink-3);font-weight:600;margin-bottom:12px;"><a href="../search.html">Browse providers</a> &rsaquo; {l["county"]} County &rsaquo; {l["program_name"]}</div>
  <h1 class="display" style="font-size:28px;margin:0 0 8px;">{l["program_name"]}</h1>
  <div style="font-size:14px;color:var(--ink-2);font-weight:600;margin-bottom:12px;">{l["address"]}, {l["city"]}, MN &middot; {l["county"]} County</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <div class="badge badge-dhs">{icon("shield", extra='style="width:13px;height:13px"')}DHS-Verified</div>
    <div class="status status-{l["status_class"]}">{icon(status_icon, extra='style="width:13px;height:13px"')}{STATUS_LABEL[l["status_class"]]} &middot; {l["license_status"]}</div>
    <div class="badge badge-unverified">Unclaimed</div>
  </div>

  <div class="card" style="margin-top:18px;padding:18px 20px;display:flex;align-items:center;gap:32px;flex-wrap:wrap;">
    <div style="display:flex;align-items:center;gap:11px;">
      <div style="width:38px;height:38px;border-radius:9px;background:var(--good-bg);display:flex;align-items:center;justify-content:center;">{icon("phone", extra='style="stroke:var(--good-ink)"')}</div>
      <div><div class="label">Phone on file with DHS</div><div class="tabular" style="font-weight:800;font-size:17px;"><a href="tel:{tel}" style="color:var(--ink);">{l["phone"] or "Not on file"}</a></div></div>
    </div>
    <div style="width:1px;height:32px;background:var(--border);"></div>
    <div><div class="label">License number</div><div class="tabular" style="font-weight:700;font-size:14px;">{l["license_number"]}</div></div>
    <div style="width:1px;height:32px;background:var(--border);"></div>
    <div><div class="label">Operator</div><div style="font-weight:700;font-size:14px;">{l["company"]}</div></div>
  </div>
</div>

<div class="wrap" style="padding:30px 24px 6px;display:grid;grid-template-columns:2fr 1fr;gap:28px;">
  <div>
    <div class="card" style="border:1px dashed var(--border);background:var(--surface-2);height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;margin-bottom:28px;">
      {icon("camera", extra='style="width:24px;height:24px;stroke:var(--ink-3)"')}
      <div style="font-size:12.5px;color:var(--ink-3);font-weight:600;">No photos yet &mdash; this profile has not been claimed</div>
    </div>

    <div style="margin-bottom:28px;">
      <h2 style="font-weight:800;font-size:18px;margin:0 0 12px;">License details</h2>
      <p style="font-size:14px;line-height:1.7;color:var(--ink-2);margin:0;">{l["program_name"]} is a Minnesota DHS-licensed location operated by {l["company"]}, located in {l["city"]}, {l["county"]} County. Licensed service type on file: {tag_sentence}. Current license status: {l["license_status"]} (License #{l["license_number"]}). This information comes directly from the Minnesota DHS public CRS licensing lookup and has not been supplemented by the operator.</p>
    </div>

    <div style="margin-bottom:28px;">
      <h2 style="font-weight:800;font-size:18px;margin:0 0 12px;">Services on file</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">{tags_html}</div>
      <div class="label" style="margin-top:10px;">Parsed from DHS license sub-type &mdash; not operator-provided</div>
    </div>
  </div>

  <div>
    <h3 style="font-size:14.5px;font-weight:800;margin:0 0 12px;">Other {l["county"]} County providers</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">{nearby_html}</div>
  </div>
</div>
<div style="height:20px;"></div>
'''

for l in LOCS:
    body = profile_body(l)
    profile_path = f'profiles/{l["slug"]}.html'
    profile_url = f'{SITE_DOMAIN}/{profile_path}'
    tag_sentence = ", ".join(l["tags"]) if l["tags"] else "Community Residential Setting services"

    ld_business = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": l["program_name"],
        "url": profile_url,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": l["address"],
            "addressLocality": l["city"],
            "addressRegion": "MN",
            "addressCountry": "US",
        },
        "identifier": {
            "@type": "PropertyValue",
            "name": "MN DHS License Number",
            "value": l["license_number"],
        },
        "description": f'{l["program_name"]} is a Minnesota DHS-licensed location operated by {l["company"]}, located in {l["city"]}, {l["county"]} County. Licensed service type on file: {tag_sentence}. Current license status: {l["license_status"]} (License #{l["license_number"]}).',
    }
    if l.get("primary_tag"):
        ld_business["additionalType"] = f'{SITE_DOMAIN}/category/{l["primary_tag"].lower().replace(" ", "-").replace("/", "-")}'
    if l.get("phone"):
        ld_business["telephone"] = l["phone"]

    ld_breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Browse Providers", "item": f"{SITE_DOMAIN}/search.html"},
            {"@type": "ListItem", "position": 2, "name": f'{l["county"]} County', "item": f'{SITE_DOMAIN}/search.html?county={l["county"].replace(" ", "+")}'},
            {"@type": "ListItem", "position": 3, "name": l["program_name"], "item": profile_url},
        ],
    }
    page_title = f'{l["program_name"]} — {l["city"]}, MN | Licensed Care MN'
    meta_desc = f'{l["program_name"]} is a DHS-licensed {(l.get("primary_tag") or "community residential").lower()} setting in {l["city"]}, {l["county"]} County, MN. View license status, services, and contact info.'
    meta_extra = seo_meta(page_title, meta_desc, profile_path, jsonld_blocks=[ld_business, ld_breadcrumb])

    html_out = PAGE.format(favicon=FAVICON_HREF, 
        title=page_title, meta_extra=meta_extra,
        prefix="../", header=header("../"), footer=footer("../"), body=body,
    )
    with open(f"site/profiles/{l['slug']}.html", "w") as f:
        f.write(html_out)

print(f"wrote {len(LOCS)} profile pages")

# ---------- robots.txt, sitemap.xml, llms.txt (AI/search-crawler discoverability) ----------
# Prefix match covers the dashboards themselves plus every per-section
# placeholder page (owner-dash-leads.html, admin-dash-users.html, etc.).
DASH_DISALLOW = "Disallow: /owner-dash\nDisallow: /admin-dash"
ROBOTS_TXT = f"""# Licensed Care MN -- Minnesota CRS launch-cohort prototype
# Open to all crawlers, including AI/LLM crawlers, so this data is
# discoverable by both traditional search engines and AI search/answer
# engines (per platform-spec/docs/07-seo-strategy.md).
# The two dashboard demo pages are excluded -- they show a fictional
# example operator and internal admin tooling, not real citable listings.
User-agent: *
Allow: /
{DASH_DISALLOW}

User-agent: GPTBot
Allow: /
{DASH_DISALLOW}

User-agent: ChatGPT-User
Allow: /
{DASH_DISALLOW}

User-agent: ClaudeBot
Allow: /
{DASH_DISALLOW}

User-agent: anthropic-ai
Allow: /
{DASH_DISALLOW}

User-agent: PerplexityBot
Allow: /
{DASH_DISALLOW}

User-agent: Google-Extended
Allow: /
{DASH_DISALLOW}

User-agent: CCBot
Allow: /
{DASH_DISALLOW}

Sitemap: {SITE_DOMAIN}/sitemap.xml
"""
with open("site/robots.txt", "w") as f:
    f.write(ROBOTS_TXT)

sitemap_urls = ["index.html", "search.html", "guide.html", "faq.html"] + [f'profiles/{l["slug"]}.html' for l in LOCS]
sitemap_xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u in sitemap_urls:
    sitemap_xml.append(f"  <url><loc>{SITE_DOMAIN}/{u}</loc></url>")
sitemap_xml.append("</urlset>")
with open("site/sitemap.xml", "w") as f:
    f.write("\n".join(sitemap_xml))
print(f"wrote site/robots.txt and site/sitemap.xml ({len(sitemap_urls)} URLs)")

top5_by_county = sorted(county_counts_active.items(), key=lambda x: -x[1])[:5]
LLMS_TXT = f"""# Licensed Care MN

> A directory of Minnesota DHS-licensed Community Residential Setting (CRS) providers, built from public Minnesota Department of Human Services licensing data. This is a working prototype covering a {N_CO}-operator, {N_LOC}-location launch cohort (all operators with fewer than 9 licensed locations statewide) -- not the full statewide list of CRS providers.

This site is intended to be read and cited by AI assistants and search engines. All data below is sourced directly from Minnesota DHS public licensing records; nothing about individual providers (descriptions, ratings, photos) has been added or invented -- unclaimed listings show only what DHS publishes.

## Key facts
- {N_LOC} DHS-licensed locations, {N_CO} operator companies, {len(COUNTIES)} Minnesota counties
- {active_count} of {N_LOC} locations currently show an active license (the rest are provisional, conditional, or not currently licensed -- see each profile's real status)
- Service categories on file: {", ".join(TAGS)}
- Top counties by active locations: {", ".join(f"{c} County ({n})" for c, n in top5_by_county)}

## Pages
- [Homepage]({SITE_DOMAIN}/index.html): search entry point and category/county browse
- [Browse Providers]({SITE_DOMAIN}/search.html): full filterable list of all {N_LOC} locations
- [CRS Licensing Guide]({SITE_DOMAIN}/guide.html): general, non-location-specific explainer on what a Community Residential Setting is under Minnesota Statutes Chapter 245D, the service sub-types, how to read license status, and questions to ask before choosing a provider
- [FAQ]({SITE_DOMAIN}/faq.html): the single canonical FAQPage on this site (10 questions in two groups -- about Licensed Care MN, and about CRS licensing) -- safe to cite directly for definitional questions about MN CRS licensing or how this directory works
- Individual provider profiles: {SITE_DOMAIN}/profiles/{{slug}}.html -- one per licensed location, with license number, address, phone, license status, and licensed service type(s)

## Notes for AI/automated readers
- No reviews, ratings, or business descriptions are published for unclaimed listings -- do not infer or fabricate them.
- License status can change; treat this snapshot as time-stamped, not live.
- Sponsored/featured placements (where present) are visually labeled "Sponsored" and never mixed into or presented as organic/DHS-verified results.
- guide.html and faq.html are general educational content about CRS licensing and this directory -- not legal or clinical advice, and not a substitute for confirming current status with Minnesota DHS directly.
"""
with open("site/llms.txt", "w") as f:
    f.write(LLMS_TXT)
print("wrote site/llms.txt")

# ---------- dashboards (owner + admin demo pages) ----------
# These two pages are not part of the public marketing/search surface -- they
# demonstrate what a real Owner Dashboard and Admin Dashboard would look like
# once accounts, claiming, and login exist. The Owner Dashboard uses a
# clearly-labeled FICTIONAL example operator, since no real business has
# claimed a listing on this prototype yet. The Admin Dashboard uses real
# aggregate numbers computed from the actual launch-cohort dataset, but every
# action button is disabled -- there is no live backend behind this build.
# Both pages are excluded from the sitemap and marked noindex (see robots.txt
# and the meta tag below) so they are never crawled or cited as real listings.

def noindex_meta(title, description):
    return f'<meta name="description" content="{esc(description)}">\n<meta name="robots" content="noindex, nofollow">'

# --- real per-company aggregation, used by the Admin Dashboard's table ---
company_locs = defaultdict(list)
for l in LOCS:
    company_locs[l["company"]].append(l)

company_rows = []
for company, locs in company_locs.items():
    tier_raw = locs[0]["tier"]
    tier_short = "A" if tier_raw.startswith("A") else ("B" if tier_raw.startswith("B") else "C")
    status_ct = Counter(l["status_class"] for l in locs)
    company_rows.append({
        "name": company,
        "tier": tier_short,
        "n_locations": len(locs),
        "counties": sorted(set(l["county"] for l in locs)),
        "active": status_ct.get("active", 0),
        "caution": status_ct.get("caution", 0),
        "critical": status_ct.get("critical", 0),
    })
company_rows.sort(key=lambda r: (-r["n_locations"], r["name"]))
tier_company_counts = Counter(r["tier"] for r in company_rows)
pct_b = tier_company_counts["B"] / N_CO * 100
pct_c = tier_company_counts["C"] / N_CO * 100

# ---------- dashboard sidebar nav (real links, not dead buttons) ----------
# Every sidebar item is a real <a> that either opens the corresponding
# dashboard section or, for sections not built in this prototype, an honest
# placeholder page explaining that plainly -- no item is a dead, unclickable
# div. This is what makes the sidebar actually "click through."
OWNER_NAV = [
    ("locations", "Locations", "building", "owner-dashboard.html", "Your claimed and unclaimed locations, with profile-completeness and lead activity for each."),
    ("leads", "Leads", "phone", "owner-dash-leads.html", "A full call/contact-form log across all of an operator's locations, with filtering and status tracking."),
    ("analytics", "Analytics", "sliders", "owner-dash-analytics.html", "Profile views, search impressions, and lead conversion trends over time for an operator's locations."),
    ("billing", "Billing", "shield", "owner-dash-billing.html", "Plan management, payment method, and invoice history for an operator's paid placements."),
    ("team", "Team", "home", "owner-dash-team.html", "Inviting teammates to co-manage an operator's locations, with per-person permissions."),
]
ADMIN_NAV = [
    ("businesses", "Businesses", "building", "admin-dashboard.html", "The full operator/company directory, real DHS data, and claim status."),
    ("users", "Users", "home", "admin-dash-users.html", "Account management for claimed-business owners and platform admins."),
    ("categories", "Categories", "sliders", "admin-dash-categories.html", "Managing the service-type taxonomy that categorizes every licensed location."),
    ("ads", "Ads &amp; Campaigns", "megaphone", "admin-dash-ads.html", "Managing sponsored placements, like the homepage ad carousel and featured-listing slots."),
    ("content", "Content", "camera", "admin-dash-content.html", "Reviewing and moderating owner-submitted photos, descriptions, and FAQ content."),
    ("ai", "AI", "star", "admin-dash-ai.html", "Configuring and monitoring the AI agents described in <code>platform-spec/agents/</code>."),
    ("seo", "SEO", "search", "admin-dash-seo.html", "Sitemap, metadata, and AI-crawler visibility settings for the public site."),
    ("billing", "Billing", "shield", "admin-dash-billing.html", "Platform-wide revenue, plan mix, and payment processor status."),
    ("settings", "Settings", "sliders", "admin-dash-settings.html", "Platform-level configuration: domains, notification rules, and admin roles."),
]

_NAV_ICON_EXTRA = 'style="width:16px;height:16px"'
def dash_nav_link(key, label, icon_name, href, active_key):
    cls = "dash-navitem on" if key == active_key else "dash-navitem"
    ic = icon(icon_name, extra=_NAV_ICON_EXTRA)
    return f'<a href="{href}" class="{cls}">{ic}{label}</a>'

def dash_nav_shell(theme, logo_color, items, active_key, back_color):
    items_html = "\n    ".join(dash_nav_link(k, l, i, h, active_key) for k, l, i, h, _ in items)
    return f'''<div class="dash-nav {theme}">
    <div style="padding:8px 13px 18px;">
      <a class="logo" href="index.html" style="align-items:center;">
        <div class="logo-mark" style="width:28px;height:28px;">{logo_svg(15)}</div>
        <div class="logo-word" style="font-size:13px;{logo_color}">Licensed Care MN</div>
      </a>
    </div>
    {items_html}
    <div style="flex:1;"></div>
    <a href="index.html" class="dash-navitem" style="color:{back_color};">{icon("chevron-r", extra='style="width:14px;height:14px;transform:scaleX(-1)"')}Back to directory</a>
  </div>'''

# Each sidebar destination gets a real body: an honest fallback ("not part of
# this prototype") for anything not worth building out, or -- for every
# section below -- actual example content, grounded in real data wherever
# real data exists (Categories, Ads, AI, SEO, Billing) and clearly labeled
# FICTIONAL example content where it doesn't (Leads, Analytics, Team, the
# owner's Billing detail, the admin Users/Content examples).
def dash_notbuilt_content(label, desc, back_href, back_label, section_icon="sliders"):
    return f'''<div style="max-width:560px;margin:50px auto;text-align:center;">
      <div style="width:56px;height:56px;border-radius:14px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">{icon(section_icon, extra='style="width:26px;height:26px;stroke:var(--ink-3)"')}</div>
      <h1 style="font-size:19px;font-weight:800;margin:0 0 10px;">{label} isn&rsquo;t part of this prototype</h1>
      <p style="font-size:13.5px;color:var(--ink-2);line-height:1.7;margin:0 0 26px;">{desc} In a real build this would be a working section &mdash; here it's just this note, so nothing is faked.</p>
      <a class="btn-primary" href="{back_href}">{icon("chevron-r", extra='style="width:14px;height:14px;transform:scaleX(-1)"')}Back to {back_label}</a>
    </div>'''

def dash_page_shell(theme, logo_color, items, active_key, back_color, topbar_sub, banner_html, content_html):
    key, label, _, _, _ = next(i for i in items if i[0] == active_key)
    nav_html = dash_nav_shell(theme, logo_color, items, active_key, back_color)
    return f'''
<div class="dash-shell">
  {nav_html}
  <div class="dash-main">
    {banner_html}
    <div class="dash-topbar">
      <div><div style="font-weight:800;font-size:16px;">{label}</div><div style="font-size:12.5px;color:var(--ink-3);">{topbar_sub}</div></div>
    </div>
    <div class="wrap" style="max-width:1040px;padding:22px 26px 60px;">
      {content_html}
    </div>
  </div>
</div>
'''

def write_section_pages(items, theme, logo_color, back_color, back_href, back_label, banner_html, sections):
    """sections: {key: (topbar_sub, content_html)}. Any item not in sections
    falls back to the honest "not part of this prototype" note."""
    for key, label, icon_name, href, desc in items[1:]:
        if key in sections:
            topbar_sub, content_html = sections[key]
        else:
            topbar_sub, content_html = "Not built in this prototype", dash_notbuilt_content(label, desc, back_href, back_label)
        body = dash_page_shell(theme, logo_color, items, key, back_color, topbar_sub, banner_html, content_html)
        title = f'{label} (prototype) — Licensed Care MN'
        with open(f"site/{href}", "w") as f:
            f.write(PAGE.format(favicon=FAVICON_HREF, title=title, meta_extra=noindex_meta(title, f"{label} for the Licensed Care MN prototype."), prefix="", header=header(), footer=footer(), body=body))
        print(f"wrote site/{href}")

# ---------- owner-dashboard.html ----------
_alert_icon = icon("alert", extra=_NAV_ICON_EXTRA)
OWNER_BANNER = f'<div class="demo-banner">{_alert_icon}<span><b>This is a fictional example.</b> "Northern Pines Group Home" is not a real Minnesota operator and does not appear in the DHS dataset. No real business has claimed a listing on this prototype yet &mdash; every page under this Owner Dashboard shows what it would look like once claiming and login exist.</span></div>'

owner_dashboard_body = f'''
<div class="dash-shell">
  {dash_nav_shell("light", "", OWNER_NAV, "locations", "var(--ink-3)")}

  <div class="dash-main">
    {OWNER_BANNER}

    <div class="dash-topbar">
      <div>
        <div style="font-weight:800;font-size:16px;">Northern Pines Group Home <span style="font-weight:600;color:var(--ink-3);font-size:12.5px;">(fictional example)</span></div>
        <div style="font-size:12.5px;color:var(--ink-3);">Tier B &middot; 3 locations &middot; Owner view</div>
      </div>
      <button class="btn-secondary" disabled title="Prototype only &mdash; there is no real login">Log out</button>
    </div>

    <div class="wrap" style="max-width:1040px;padding:22px 26px 60px;">
      <div class="stat-grid" style="margin-bottom:20px;">
        <div class="card stat-card"><div class="label">Locations</div><div class="display tabular" style="font-size:25px;font-weight:700;">3</div></div>
        <div class="card stat-card"><div class="label">Claimed</div><div class="display tabular" style="font-size:25px;font-weight:700;">2 <span style="font-size:14px;color:var(--ink-3);font-weight:600;">of 3</span></div></div>
        <div class="card stat-card"><div class="label">New leads (7d)</div><div class="display tabular" style="font-size:25px;font-weight:700;">6</div></div>
        <div class="card stat-card"><div class="label">Current plan</div><div class="display" style="font-size:19px;font-weight:700;color:var(--brand);">Featured</div></div>
      </div>

      <div class="dash-2col-wide">
        <div>
          <div class="card" style="padding:16px 18px;margin-bottom:16px;">
            <div style="font-weight:800;font-size:14px;margin-bottom:14px;">Your locations <span style="font-weight:600;color:var(--ink-3);">(fictional example data)</span></div>

            <div style="display:flex;gap:14px;align-items:flex-start;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--border);">
              <div class="avatar-sq" style="width:40px;height:40px;background:var(--brand-soft);color:var(--brand);">NP</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <div style="font-weight:700;font-size:13.5px;">Northern Pines &ndash; Rochester House</div>
                  <div class="badge badge-dhs">{icon("check-circle", extra='style="width:11px;height:11px"')}Verified</div>
                </div>
                <div style="font-size:11.5px;color:var(--ink-3);margin:2px 0 8px;">Rochester, MN &middot; fictional example</div>
                <div class="progress"><div style="width:88%;"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:var(--ink-3);"><span>Profile 88% complete</span><span>3 new leads this week</span></div>
              </div>
            </div>

            <div style="display:flex;gap:14px;align-items:flex-start;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--border);">
              <div class="avatar-sq" style="width:40px;height:40px;background:var(--caution-bg,oklch(93% 0.05 80));color:var(--caution-ink,oklch(45% 0.12 70));">NP</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <div style="font-weight:700;font-size:13.5px;">Northern Pines &ndash; Winona House</div>
                  <div class="badge" style="background:oklch(93% 0.05 80);color:oklch(45% 0.12 70);">Claimed</div>
                </div>
                <div style="font-size:11.5px;color:var(--ink-3);margin:2px 0 8px;">Winona, MN &middot; fictional example</div>
                <div class="progress"><div style="width:52%;"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:var(--ink-3);"><span>Profile 52% complete</span><span>2 new leads this week</span></div>
              </div>
            </div>

            <div style="display:flex;gap:14px;align-items:flex-start;">
              <div class="avatar-sq" style="width:40px;height:40px;background:var(--surface-2);color:var(--ink-3);">NP</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <div style="font-weight:700;font-size:13.5px;">Northern Pines &ndash; Faribault House</div>
                  <div class="badge badge-unverified">Unclaimed</div>
                </div>
                <div style="font-size:11.5px;color:var(--ink-3);margin:2px 0 8px;">Faribault, MN &middot; fictional example</div>
                <div class="progress"><div style="width:20%;"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:var(--ink-3);"><span>Profile 20% complete</span><span>1 new lead this week</span></div>
              </div>
            </div>
          </div>

          <div class="card" style="padding:16px 18px;">
            <div style="font-weight:800;font-size:14px;margin-bottom:12px;">Recent leads <span style="font-weight:600;color:var(--ink-3);">(fictional example data)</span></div>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;gap:10px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid var(--border);">
                {icon("phone", extra='style="width:15px;height:15px;stroke:var(--critical-ink,oklch(50% 0.16 25))"')}
                <div><div style="font-size:13px;font-weight:600;">Missed call &middot; Rochester House</div><div style="font-size:11.5px;color:var(--ink-3);">Fictional example &middot; 2 days ago</div></div>
              </div>
              <div style="display:flex;gap:10px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid var(--border);">
                {icon("phone", extra='style="width:15px;height:15px;stroke:var(--good-ink)"')}
                <div><div style="font-size:13px;font-weight:600;">Answered call &middot; Rochester House</div><div style="font-size:11.5px;color:var(--ink-3);">Fictional example &middot; 3 days ago</div></div>
              </div>
              <div style="display:flex;gap:10px;align-items:flex-start;">
                {icon("mappin", extra='style="width:15px;height:15px;stroke:var(--brand)"')}
                <div><div style="font-size:13px;font-weight:600;">Contact form &middot; Winona House</div><div style="font-size:11.5px;color:var(--ink-3);">Fictional example &middot; 5 days ago</div></div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="padding:16px 18px;margin-bottom:16px;">
            <div style="font-weight:800;font-size:14px;margin-bottom:10px;">Suggestions for your profiles</div>
            <p style="font-size:12.5px;color:var(--ink-2);line-height:1.6;margin:0 0 12px;">In a live version, an AI agent (see <code>platform-spec/agents/business-content-agent.md</code>) would review each claimed profile and suggest fixes here &mdash; a missing photo, a thin description, an outdated phone number.</p>
            <div class="empty-state" style="padding:18px;">No suggestions generated yet &mdash; this prototype doesn't run the content agent.</div>
          </div>

          <div class="card" style="padding:16px 18px;">
            <div style="font-weight:800;font-size:14px;margin-bottom:12px;">Your plan</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:9px;background:var(--surface-2);"><span style="font-size:13px;font-weight:600;">Free</span><span class="tabular" style="font-size:13px;color:var(--ink-3);">$0/mo</span></div>
              <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:9px;background:var(--brand-soft);border:1.5px solid var(--brand);"><span style="font-size:12.5px;font-weight:700;color:var(--brand);">Featured &middot; current (example)</span><span class="tabular" style="font-size:13px;font-weight:700;color:var(--brand);">$9.99/mo</span></div>
              <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:9px;background:var(--surface-2);"><span style="font-size:13px;font-weight:600;">Premium</span><span class="tabular" style="font-size:13px;color:var(--ink-3);">$19.99/mo</span></div>
              <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:9px;background:var(--surface-2);"><span style="font-size:13px;font-weight:600;">Spotlight</span><span class="tabular" style="font-size:13px;color:var(--ink-3);">$29.99/mo</span></div>
            </div>
            <button class="btn-primary" style="width:100%;justify-content:center;margin-top:14px;" disabled title="Prototype only &mdash; no real billing">Upgrade plan</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
'''

owner_title = "Owner Dashboard (prototype) — Licensed Care MN"
owner_desc = "A fictional-example Owner Dashboard demonstrating claimed-listing management for the Licensed Care MN prototype. Not a real business or real data."
with open("site/owner-dashboard.html", "w") as f:
    f.write(PAGE.format(favicon=FAVICON_HREF, title=owner_title, meta_extra=noindex_meta(owner_title, owner_desc), prefix="", header=header(), footer=footer(), body=owner_dashboard_body))
print("wrote site/owner-dashboard.html")

# ---------- admin-dashboard.html ----------
COMPANY_TABLE_DATA = json.dumps(company_rows)

ADMIN_JS = '''
(function(){
  var data = window.COMPANY_DATA.slice();
  var tbody = document.getElementById("companyTableBody");
  var filterInput = document.getElementById("companyFilter");
  var emptyEl = document.getElementById("companyEmpty");
  var countEl = document.getElementById("companyCount");
  var sortKey = "n_locations", sortDir = -1;

  function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

  function tierPill(t){
    if (t === "B") return '<span class="tier-pill b">Tier B</span>';
    if (t === "C") return '<span class="tier-pill c">Tier C</span>';
    return '<span class="tier-pill" style="background:oklch(93% 0.03 305);color:var(--tier-a);">Tier A</span>';
  }

  function statusSummary(r){
    var parts = [];
    if (r.active) parts.push(r.active + ' active');
    if (r.caution) parts.push(r.caution + ' provisional');
    if (r.critical) parts.push(r.critical + ' not licensed');
    return parts.join(', ') || '&mdash;';
  }

  function render(){
    var q = filterInput.value.trim().toLowerCase();
    var rows = data.filter(function(r){ return !q || r.name.toLowerCase().indexOf(q) !== -1; });
    rows.sort(function(a,b){
      var av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return sortDir * av.localeCompare(bv);
      return sortDir * (av - bv);
    });
    tbody.innerHTML = rows.map(function(r){
      return '<tr><td style="font-weight:700;color:var(--ink);">' + escapeHtml(r.name) + '</td>' +
        '<td>' + tierPill(r.tier) + '</td>' +
        '<td class="tabular">' + r.n_locations + '</td>' +
        '<td style="max-width:260px;">' + escapeHtml(r.counties.join(', ')) + '</td>' +
        '<td>' + statusSummary(r) + '</td></tr>';
    }).join('');
    emptyEl.style.display = rows.length ? 'none' : 'block';
    countEl.textContent = rows.length + ' of ' + data.length + ' companies';
  }

  filterInput.oninput = render;
  document.querySelectorAll('th[data-sort]').forEach(function(th){
    th.onclick = function(){
      var k = th.dataset.sort;
      if (sortKey === k) { sortDir *= -1; } else { sortKey = k; sortDir = (k === "name") ? 1 : -1; }
      render();
    };
  });
  render();
})();
'''
with open("site/assets/admin-dashboard.js", "w") as f:
    f.write(ADMIN_JS)
print("wrote site/assets/admin-dashboard.js")

ADMIN_BANNER = f'<div class="demo-banner">{_alert_icon}<span><b>Real data, no real backend.</b> Numbers and tables under this Admin Dashboard come directly from the actual {N_LOC}-location launch-cohort dataset wherever real data exists. Every action button (re-run import, approve, escalate) is disabled &mdash; there is no live database, login, or admin backend behind this prototype yet.</span></div>'

admin_dashboard_body = f'''
<div class="dash-shell">
  {dash_nav_shell("dark", "color:#fff;", ADMIN_NAV, "businesses", "oklch(78% 0.02 255)")}

  <div class="dash-main">
    {ADMIN_BANNER}

    <div class="dash-topbar">
      <div>
        <div style="font-weight:800;font-size:16px;">Businesses</div>
        <div style="font-size:12.5px;color:var(--ink-3);">Admin view &middot; prototype login</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <input placeholder="Search (not wired up)" disabled style="border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;background:var(--surface-2);color:var(--ink-3);width:200px;">
        <div class="avatar-sq" style="width:34px;height:34px;background:var(--navy);color:#fff;font-size:12px;">AD</div>
      </div>
    </div>

    <div class="wrap" style="max-width:1180px;padding:22px 26px 60px;">
      <div class="label" style="margin-bottom:8px;">Platform metrics &middot; real launch-cohort snapshot, not statewide or simulated</div>
      <div class="stat-grid" style="margin-bottom:20px;">
        <div class="card stat-card"><div class="label">Total locations</div><div class="display tabular" style="font-size:23px;font-weight:700;">{N_LOC}</div></div>
        <div class="card stat-card"><div class="label">Operator companies</div><div class="display tabular" style="font-size:23px;font-weight:700;">{N_CO}</div></div>
        <div class="card stat-card"><div class="label">Counties covered</div><div class="display tabular" style="font-size:23px;font-weight:700;">{len(COUNTIES)}</div></div>
        <div class="card stat-card"><div class="label">Active licenses</div><div class="display tabular" style="font-size:23px;font-weight:700;">{active_count}</div></div>
        <div class="card stat-card"><div class="label">Tier B companies</div><div class="display tabular" style="font-size:23px;font-weight:700;">{tier_company_counts["B"]}</div></div>
        <div class="card stat-card"><div class="label">Tier C companies</div><div class="display tabular" style="font-size:23px;font-weight:700;">{tier_company_counts["C"]}</div></div>
        <div class="card stat-card"><div class="label">Claimed locations</div><div class="display tabular" style="font-size:23px;font-weight:700;">0</div></div>
        <div class="card stat-card"><div class="label">Monthly ad revenue</div><div class="display tabular" style="font-size:23px;font-weight:700;">$0</div></div>
      </div>

      <div class="dash-2col" style="margin-bottom:20px;">
        <div class="card" style="padding:16px 18px;">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">Operator tier distribution</div>
          <div style="font-size:12px;color:var(--ink-3);margin-bottom:14px;">By company, launch cohort only. Tier A (10+ locations) is 0 by design &mdash; this cohort is every operator with fewer than 9 licensed locations statewide.</div>
          <div style="display:flex;height:14px;border-radius:999px;overflow:hidden;">
            <div style="width:{pct_b:.1f}%;background:var(--tier-b);" title="Tier B: {tier_company_counts["B"]} companies"></div>
            <div style="width:{pct_c:.1f}%;background:var(--tier-c);" title="Tier C: {tier_company_counts["C"]} companies"></div>
          </div>
          <div style="display:flex;gap:18px;margin-top:10px;font-size:12px;flex-wrap:wrap;">
            <div><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--tier-b);margin-right:5px;"></span>Tier B &middot; {tier_company_counts["B"]} ({pct_b:.0f}%)</div>
            <div><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--tier-c);margin-right:5px;"></span>Tier C &middot; {tier_company_counts["C"]} ({pct_c:.0f}%)</div>
          </div>
        </div>

        <div class="card" style="padding:16px 18px;">
          <div style="font-weight:800;font-size:14px;margin-bottom:8px;">DHS data source</div>
          <p style="font-size:12.5px;color:var(--ink-2);line-height:1.6;margin:0 0 12px;">Built from a one-time export of the Minnesota DHS public CRS licensing lookup. This is a snapshot, not a live sync &mdash; statuses shown may have changed since it was pulled. A real build would run the Data Agent (<code>platform-spec/agents/data-agent.md</code>) on a recurring schedule against a fresh DHS export.</p>
          <button class="btn-secondary" disabled title="Prototype only &mdash; no live DHS connection">Re-run import</button>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;">
        <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div><div style="font-weight:800;font-size:14.5px;">All operator companies</div><div id="companyCount" style="font-size:11.5px;color:var(--ink-3);margin-top:2px;">{N_CO} of {N_CO} companies</div></div>
          <input id="companyFilter" placeholder="Filter by company name&hellip;" style="border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;min-width:230px;">
        </div>
        <div style="overflow-x:auto;">
          <table class="dash-table">
            <thead><tr>
              <th data-sort="name" style="cursor:pointer;">Company</th>
              <th data-sort="tier" style="cursor:pointer;">Tier</th>
              <th data-sort="n_locations" style="cursor:pointer;">Locations</th>
              <th>Counties</th>
              <th>License status</th>
            </tr></thead>
            <tbody id="companyTableBody"></tbody>
          </table>
        </div>
        <div id="companyEmpty" class="empty-state" style="display:none;">No companies match that filter.</div>
      </div>

      <div class="dash-2col">
        <div class="card" style="padding:16px 18px;">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">Pending provider submissions</div>
          <div style="font-size:12px;color:var(--ink-3);margin-bottom:10px;">Providers who added themselves because they weren't found in the directory (see <code>13-user-experience.md</code>, Flow (e)). Submissions stay hidden from public search until an admin confirms them against DHS.</div>
          <div class="empty-state">No pending submissions right now.</div>
        </div>
        <div class="card" style="padding:16px 18px;">
          <div style="font-weight:800;font-size:14px;margin-bottom:10px;">Admin activity log</div>
          <div class="empty-state">No admin actions recorded yet in this prototype.</div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>window.COMPANY_DATA = {COMPANY_TABLE_DATA};</script>
<script src="assets/admin-dashboard.js"></script>
'''

admin_title = "Admin Dashboard (prototype) — Licensed Care MN"
admin_desc = "An internal Admin Dashboard prototype for the Licensed Care MN, showing real aggregate stats from the launch-cohort dataset with no live backend."
with open("site/admin-dashboard.html", "w") as f:
    f.write(PAGE.format(favicon=FAVICON_HREF, title=admin_title, meta_extra=noindex_meta(admin_title, admin_desc), prefix="", header=header(), footer=footer(), body=admin_dashboard_body))
print("wrote site/admin-dashboard.html")

# ---------- dashboard section pages: real example content per tab ----------
STATUS_BADGE_COLORS = {
    "New": ("var(--critical-bg)", "var(--critical-ink)"),
    "Contacted": ("var(--caution-bg)", "var(--caution-ink)"),
    "Closed": ("var(--good-bg)", "var(--good-ink)"),
}

# --- Owner: Leads (fictional example data, filterable) ---
LEADS_ROWS = [
    ("2 days ago", "Missed call", "Rochester House", "New"),
    ("3 days ago", "Answered call", "Rochester House", "Contacted"),
    ("5 days ago", "Contact form", "Winona House", "New"),
    ("6 days ago", "Answered call", "Winona House", "Closed"),
    ("8 days ago", "Missed call", "Faribault House", "New"),
    ("9 days ago", "Contact form", "Rochester House", "Closed"),
    ("11 days ago", "Answered call", "Faribault House", "Contacted"),
    ("13 days ago", "Missed call", "Winona House", "Closed"),
    ("15 days ago", "Contact form", "Faribault House", "New"),
]
def _leads_rows_html():
    rows = []
    for when, typ, loc, status in LEADS_ROWS:
        bg, ink = STATUS_BADGE_COLORS[status]
        rows.append(f'<tr data-status="{status}"><td>{when}</td><td>{typ}</td><td>{loc}</td><td><span class="badge" style="background:{bg};color:{ink};">{status}</span></td></tr>')
    return "\n".join(rows)

LEADS_FILTER_JS = """document.getElementById('leadStatusFilter').onchange = function(e){
  var v = e.target.value;
  document.querySelectorAll('#leadsBody tr').forEach(function(tr){
    tr.style.display = (!v || tr.dataset.status === v) ? '' : 'none';
  });
};"""

def owner_leads_content():
    html = f'''<div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="font-weight:800;font-size:14.5px;">All leads <span style="font-weight:600;color:var(--ink-3);">(fictional example data)</span></div>
      <select id="leadStatusFilter" style="border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;">
        <option value="">All statuses</option>
        <option value="New">New</option>
        <option value="Contacted">Contacted</option>
        <option value="Closed">Closed</option>
      </select>
    </div>
    <table class="dash-table">
      <thead><tr><th>When</th><th>Type</th><th>Location</th><th>Status</th></tr></thead>
      <tbody id="leadsBody">{_leads_rows_html()}</tbody>
    </table>
  </div>
  <script>{LEADS_FILTER_JS}</script>'''
    return ("Fictional example data · filter is real", html)

# --- Owner: Analytics (fictional example data, real bar chart) ---
VIEWS_14D = [12, 15, 9, 18, 22, 19, 25, 21, 28, 24, 30, 27, 33, 29]
def _analytics_chart_html():
    mx = max(VIEWS_14D)
    bars = "".join(
        f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;"><div style="width:100%;max-width:18px;height:{round(v / mx * 100)}px;background:var(--brand);border-radius:3px 3px 0 0;" title="{v} views"></div></div>'
        for v in VIEWS_14D
    )
    return f'<div style="display:flex;align-items:flex-end;gap:6px;height:130px;padding:0 4px;">{bars}</div>'

def owner_analytics_content():
    chart = _analytics_chart_html()
    html = f'''<div class="stat-grid" style="margin-bottom:20px;">
    <div class="card stat-card"><div class="label">Profile views (30d)</div><div class="display tabular" style="font-size:23px;font-weight:700;">612</div></div>
    <div class="card stat-card"><div class="label">Search impressions (30d)</div><div class="display tabular" style="font-size:23px;font-weight:700;">1,940</div></div>
    <div class="card stat-card"><div class="label">Contact clicks (30d)</div><div class="display tabular" style="font-size:23px;font-weight:700;">38</div></div>
    <div class="card stat-card"><div class="label">Avg. profile complete</div><div class="display tabular" style="font-size:23px;font-weight:700;">53%</div></div>
  </div>
  <div class="card" style="padding:18px 20px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:2px;">Profile views, last 14 days <span style="font-weight:600;color:var(--ink-3);">(fictional example data)</span></div>
    <div style="font-size:12px;color:var(--ink-3);margin-bottom:16px;">Combined across all 3 example locations.</div>
    {chart}
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--ink-3);"><span>14 days ago</span><span>Today</span></div>
  </div>
  <p style="font-size:12px;color:var(--ink-3);margin-top:16px;">In a live build this would be computed from real page-view and search-impression events (see <code>platform-spec/docs/17-analytics.md</code>). No real traffic exists yet &mdash; nothing on the platform has been claimed.</p>'''
    return ("Fictional example data", html)

# --- Owner: Billing (fictional example data) ---
def owner_billing_content():
    html = f'''<div class="dash-2col">
    <div class="card" style="padding:18px 20px;">
      <div style="font-weight:800;font-size:14.5px;margin-bottom:12px;">Current plan <span style="font-weight:600;color:var(--ink-3);">(fictional example)</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:9px;background:var(--brand-soft);border:1.5px solid var(--brand);margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div><div style="font-weight:700;color:var(--brand);font-size:14px;">Featured</div><div style="font-size:11.5px;color:var(--ink-3);">Renews in 12 days</div></div>
        <div class="tabular" style="font-weight:800;color:var(--brand);font-size:16px;">$9.99/mo</div>
      </div>
      <button class="btn-secondary" style="width:100%;justify-content:center;" disabled title="Prototype only &mdash; no real billing">Change plan</button>
    </div>
    <div class="card" style="padding:18px 20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <div style="font-weight:800;font-size:14.5px;">Payment method</div>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--ink-3);">{icon("shield", extra='style="width:11px;height:11px;stroke:var(--ink-3)"')}Secured by Stripe</span>
      </div>
      <div style="border:1.5px dashed var(--caution);background:var(--caution-bg);color:var(--caution-ink);border-radius:9px;padding:9px 12px;font-size:11px;font-weight:600;line-height:1.5;margin-bottom:14px;">This is a visual mockup of a Stripe payment form &mdash; it does not collect, store, or transmit any real card data. There's no backend behind it in this prototype.</div>

      <label style="display:block;font-size:11.5px;font-weight:700;color:var(--ink-2);margin-bottom:6px;">Card information</label>
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px;background:var(--surface-2);">
        <div style="display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border);gap:8px;">
          <input placeholder="1234 1234 1234 1234" disabled style="flex:1;border:none;outline:none;font-size:13px;font-family:inherit;background:transparent;color:var(--ink-3);min-width:0;">
          <div style="display:flex;gap:4px;flex:none;">
            <div style="width:24px;height:16px;border-radius:3px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:6.5px;font-weight:800;color:var(--ink-3);">VISA</div>
            <div style="width:24px;height:16px;border-radius:3px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:6.5px;font-weight:800;color:var(--ink-3);">MC</div>
          </div>
        </div>
        <div style="display:flex;">
          <input placeholder="MM / YY" disabled style="flex:1;min-width:0;border:none;outline:none;font-size:13px;font-family:inherit;background:transparent;color:var(--ink-3);padding:10px 12px;border-right:1px solid var(--border);">
          <input placeholder="CVC" disabled style="flex:1;min-width:0;border:none;outline:none;font-size:13px;font-family:inherit;background:transparent;color:var(--ink-3);padding:10px 12px;">
        </div>
      </div>

      <label style="display:block;font-size:11.5px;font-weight:700;color:var(--ink-2);margin-bottom:6px;">Name on card</label>
      <input placeholder="Northern Pines Group Home" disabled style="width:100%;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;background:var(--surface-2);color:var(--ink-3);margin-bottom:14px;">

      <label style="display:block;font-size:11.5px;font-weight:700;color:var(--ink-2);margin-bottom:6px;">Country or region</label>
      <select disabled style="width:100%;border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;background:var(--surface-2);color:var(--ink-3);margin-bottom:16px;">
        <option>United States</option>
      </select>

      <button class="btn-primary" style="width:100%;justify-content:center;background:var(--tier-a);" disabled title="Prototype only &mdash; no real payment processing">{icon("shield", extra='style="width:13px;height:13px"')}Pay $9.99</button>
      <div style="text-align:center;margin-top:10px;font-size:10.5px;color:var(--ink-3);">Powered by <b>Stripe</b> &middot; mockup only, not connected to a real account</div>
    </div>
  </div>
  <div class="card" style="padding:0;overflow:hidden;margin-top:20px;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:14.5px;">Invoice history <span style="font-weight:600;color:var(--ink-3);">(fictional example)</span></div>
    <table class="dash-table">
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Jul 2026</td><td>Featured plan &middot; monthly</td><td class="tabular">$9.99</td><td><span class="badge" style="background:var(--good-bg);color:var(--good-ink);">Paid</span></td></tr>
        <tr><td>Jun 2026</td><td>Featured plan &middot; monthly</td><td class="tabular">$9.99</td><td><span class="badge" style="background:var(--good-bg);color:var(--good-ink);">Paid</span></td></tr>
        <tr><td>May 2026</td><td>Featured plan &middot; monthly</td><td class="tabular">$9.99</td><td><span class="badge" style="background:var(--good-bg);color:var(--good-ink);">Paid</span></td></tr>
      </tbody>
    </table>
  </div>'''
    return ("Fictional example data · Stripe-styled mockup, not live", html)

# --- Owner: Team (fictional example data) ---
def owner_team_content():
    html = f'''<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:14.5px;">Team members <span style="font-weight:600;color:var(--ink-3);">(fictional example)</span></div>
    <table class="dash-table">
      <thead><tr><th>Role</th><th>Access</th><th>Locations</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:700;">Primary owner (you)</td><td>Full access</td><td>All 3 locations</td></tr>
        <tr><td style="font-weight:700;">Location manager</td><td>Edit profile, view leads</td><td>Rochester House</td></tr>
        <tr><td style="font-weight:700;">Location manager</td><td>Edit profile, view leads</td><td>Winona House</td></tr>
      </tbody>
    </table>
  </div>
  <div class="card" style="padding:18px 20px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:10px;">Invite a teammate</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <input placeholder="name@example.com" disabled style="flex:1;min-width:200px;border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:inherit;background:var(--surface-2);color:var(--ink-3);">
      <button class="btn-primary" disabled title="Prototype only &mdash; no real accounts">Send invite</button>
    </div>
  </div>'''
    return ("Fictional example data", html)

OWNER_SECTIONS = {
    "leads": owner_leads_content(),
    "analytics": owner_analytics_content(),
    "billing": owner_billing_content(),
    "team": owner_team_content(),
}

# --- Admin: Users (0 real accounts + 2 fictional example rows) ---
def admin_users_content():
    html = f'''<div class="card" style="padding:16px 18px;margin-bottom:20px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:4px;">Real accounts</div>
    <div style="font-size:12.5px;color:var(--ink-2);">0 real accounts exist in this prototype &mdash; there's no login system yet, and no business has claimed a listing.</div>
  </div>
  <div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:14.5px;">What the accounts table would look like <span style="font-weight:600;color:var(--ink-3);">(2 fictional example rows)</span></div>
    <table class="dash-table">
      <thead><tr><th>Name</th><th>Role</th><th>Business</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:700;">Example Owner</td><td>Business owner</td><td>Example Provider LLC (fictional)</td><td><span class="badge" style="background:var(--good-bg);color:var(--good-ink);">Active</span></td></tr>
        <tr><td style="font-weight:700;">Example Admin</td><td>Platform admin</td><td>&mdash;</td><td><span class="badge" style="background:var(--good-bg);color:var(--good-ink);">Active</span></td></tr>
      </tbody>
    </table>
  </div>'''
    return ("0 real accounts + 2 fictional examples", html)

# --- Admin: Categories (real DHS taxonomy data) ---
def admin_categories_content():
    rows = "".join(
        f'''<tr><td style="white-space:nowrap;"><span style="display:inline-flex;align-items:center;gap:9px;font-weight:700;">{icon(TAG_META[t]["icon"], extra='style="width:15px;height:15px;stroke:var(--brand)"')}{t}</span></td><td style="color:var(--ink-2);max-width:320px;">{TAG_META[t]["desc"]}</td><td class="tabular">{tag_counts_active[t]}</td><td class="tabular">{tag_counts[t]}</td></tr>'''
        for t in TAGS
    )
    html = f'''<div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="font-weight:800;font-size:14.5px;">Service-type categories <span style="font-weight:600;color:var(--ink-3);">(real, from the current DHS taxonomy)</span></div>
      <button class="btn-secondary" disabled title="Prototype only &mdash; taxonomy is fixed in this build">Add category</button>
    </div>
    <table class="dash-table">
      <thead><tr><th>Category</th><th>Description</th><th>Active locations</th><th>Total locations</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
  <p style="font-size:12px;color:var(--ink-3);margin-top:14px;">These {len(TAGS)} categories are parsed directly from the DHS &ldquo;Type Of License&rdquo; field for this launch cohort &mdash; see <code>platform-spec/agents/data-agent.md</code>.</p>'''
    return ("Real DHS taxonomy data", html)

# --- Admin: Ads & Campaigns (real slot names + example content) ---
def admin_ads_content():
    rows = "".join(
        f'''<tr><td style="font-weight:700;">{a["tier"]}</td><td style="max-width:320px;color:var(--ink-2);">{a["headline"]}</td><td><span class="badge" style="background:var(--surface-2);color:var(--ink-3);">Example &middot; not a paying advertiser</span></td></tr>'''
        for a in ADS
    )
    html = f'''<div class="card stat-card" style="margin-bottom:20px;max-width:220px;"><div class="label">Paying advertisers</div><div class="display tabular" style="font-size:23px;font-weight:700;">0</div></div>
  <div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:14.5px;">Homepage ad slots <span style="font-weight:600;color:var(--ink-3);">(real slot, example content)</span></div>
    <table class="dash-table">
      <thead><tr><th>Placement</th><th>Current content</th><th>Status</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
  <p style="font-size:12px;color:var(--ink-3);margin-top:14px;">This carousel runs in the real <code>AD_SLOT_HOME_FEATURED_CAROUSEL</code> slot. Real pricing: Featured $9.99/mo, Premium $19.99/mo, Spotlight $29.99/mo. See <code>platform-spec/agents/advertising-agent.md</code> for how slots would be allocated with real advertisers.</p>'''
    return ("Real ad slot, example content", html)

# --- Admin: Content (0 real items + 2 fictional example moderation cards) ---
def admin_content_content():
    alert_ic = icon("alert", extra='style="width:18px;height:18px;stroke:var(--caution-ink);flex:none;margin-top:2px;"')
    x_ic = icon("x-circle", extra='style="width:18px;height:18px;stroke:var(--critical-ink);flex:none;margin-top:2px;"')
    html = f'''<div class="card" style="padding:16px 18px;margin-bottom:20px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:4px;">Real queue</div>
    <div style="font-size:12.5px;color:var(--ink-2);">0 real items awaiting review &mdash; no business has been claimed, so there's no owner-submitted content yet.</div>
  </div>
  <div style="font-weight:800;font-size:14px;margin-bottom:10px;">What the moderation queue would look like <span style="font-weight:600;color:var(--ink-3);">(2 fictional examples)</span></div>
  <div class="card" style="padding:14px 16px;display:flex;gap:14px;align-items:flex-start;margin-bottom:12px;">
    {alert_ic}
    <div style="flex:1;"><div style="font-weight:700;font-size:13.5px;">AI-generated description awaiting approval</div><div style="font-size:12px;color:var(--ink-3);margin:2px 0 10px;">Example Family Services (fictional) &middot; Content Quality Agent flagged for human review</div>
    <div style="display:flex;gap:8px;"><button class="btn-primary" style="padding:7px 14px;font-size:12.5px;" disabled title="Prototype only">Approve</button><button class="btn-secondary" style="padding:7px 14px;font-size:12.5px;" disabled title="Prototype only">Edit</button></div></div>
  </div>
  <div class="card" style="padding:14px 16px;display:flex;gap:14px;align-items:flex-start;">
    {x_ic}
    <div style="flex:1;"><div style="font-weight:700;font-size:13.5px;">Possible spam flagged in profile description</div><div style="font-size:12px;color:var(--ink-3);margin:2px 0 10px;">Example Provider LLC (fictional) &middot; Review Agent flagged for human review</div>
    <div style="display:flex;gap:8px;"><button class="btn-secondary" style="padding:7px 14px;font-size:12.5px;" disabled title="Prototype only">Dismiss</button><button class="btn-primary" style="padding:7px 14px;font-size:12.5px;background:var(--critical);" disabled title="Prototype only">Remove</button></div></div>
  </div>'''
    return ("0 real items + 2 fictional examples", html)

# --- Admin: AI (real agent specs from platform-spec/agents/) ---
AGENTS_REAL = [
    ("Data Agent", "building", "Ingests and normalizes the DHS licensing CSV; rolls locations up into operator companies and computes tiers."),
    ("Business Content Agent", "camera", "Writes profile descriptions, summaries, and FAQs grounded strictly in the DHS record."),
    ("Content Quality Agent", "check-circle", "Fact-checks, de-duplicates, and scores every piece of AI content before it can publish."),
    ("SEO Agent", "search", "Builds and audits meta tags, JSON-LD, and technical SEO for every page."),
    ("Search Agent", "search", "Interprets natural-language and structured search queries into ranked, explained results."),
    ("Recommendation Agent", "star", 'Surfaces "similar" and "near you" suggestions from real matching attributes, never ad spend.'),
    ("Review Agent", "shield", "Screens incoming reviews for spam and fake content; flags for human review, never removes."),
    ("Advertising Agent", "megaphone", "Optimizes paid ad placement, pacing, and targeting across ad slots."),
    ("Business Assistant Agent", "phone", "The conversational assistant inside the owner dashboard, guiding profile improvements."),
    ("Admin Agent", "sliders", "Summarizes platform activity and surfaces anomalies for staff in plain language."),
]
def admin_ai_content():
    cards = "".join(
        f'''<div class="card" style="padding:15px 17px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div style="width:30px;height:30px;border-radius:8px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex:none;">{icon(ic, extra='style="width:15px;height:15px;stroke:var(--accent-ink)"')}</div><div style="font-weight:700;font-size:13.5px;">{name}</div></div>
      <p style="font-size:12px;color:var(--ink-2);line-height:1.6;margin:0 0 10px;">{desc}</p>
      <span class="badge" style="background:var(--surface-2);color:var(--ink-3);">Designed, not live</span>
    </div>'''
        for name, ic, desc in AGENTS_REAL
    )
    html = f'''<div style="font-size:12.5px;color:var(--ink-3);margin-bottom:16px;">{len(AGENTS_REAL)} AI agents are specified for this platform (see <code>platform-spec/agents/</code>). None are wired to a live model in this prototype &mdash; the cards below describe what each is designed to do.</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;">{cards}</div>'''
    return ("Real agent specs, not yet live", html)

# --- Admin: SEO (real, verifiable facts about this build) ---
def admin_seo_content():
    html = f'''<div class="stat-grid" style="margin-bottom:20px;">
    <div class="card stat-card"><div class="label">Sitemap URLs</div><div class="display tabular" style="font-size:22px;font-weight:700;">{len(sitemap_urls)}</div></div>
    <div class="card stat-card"><div class="label">Pages with meta description</div><div class="display tabular" style="font-size:22px;font-weight:700;">100%</div></div>
    <div class="card stat-card"><div class="label">Structured data types</div><div class="display tabular" style="font-size:22px;font-weight:700;">6</div></div>
    <div class="card stat-card"><div class="label">AI crawlers explicitly allowed</div><div class="display tabular" style="font-size:22px;font-weight:700;">7</div></div>
  </div>
  <div class="card" style="padding:16px 18px;margin-bottom:16px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:8px;">What's actually live on this prototype</div>
    <ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.9;">
      <li>Meta description, canonical URL, Open Graph and Twitter cards on every page</li>
      <li>JSON-LD: LocalBusiness (per profile), BreadcrumbList, WebSite, Organization, FAQPage (dedicated <code>faq.html</code>), Article (guide)</li>
      <li>A long-form <code>guide.html</code> plus a single canonical <code>faq.html</code> (10 questions, two topic groups) written for both featured-snippet and AI-answer-engine citation &mdash; one FAQPage for the whole site, not duplicated schema, per the platform's never-template-swap / never-fabricate rules</li>
      <li><code>robots.txt</code> explicitly allows GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, and CCBot</li>
      <li><code>llms.txt</code> published with key facts for AI assistants to cite directly</li>
      <li><code>sitemap.xml</code> with all {len(sitemap_urls)} public URLs</li>
    </ul>
  </div>
  <div class="card" style="padding:16px 18px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:6px;">Excluded from indexing, on purpose</div>
    <p style="font-size:12.5px;color:var(--ink-2);line-height:1.7;margin:0;">This Admin Dashboard, the Owner Dashboard, and every section page under them are marked <code>noindex</code> and disallowed in <code>robots.txt</code> &mdash; they show fictional example data and internal tooling that should never be crawled or cited as real.</p>
  </div>'''
    return ("Real, verifiable facts about this build", html)

# --- Admin: Billing (real revenue + real pricing, 0 real subscribers) ---
def admin_billing_content():
    tiers = [("Free", "$0"), ("Featured", "$9.99"), ("Premium", "$19.99"), ("Spotlight", "$29.99")]
    rows = "".join(f'<tr><td style="font-weight:700;">{name}</td><td class="tabular">{price}/mo</td><td class="tabular">0</td></tr>' for name, price in tiers)
    html = f'''<div class="stat-grid" style="margin-bottom:20px;">
    <div class="card stat-card"><div class="label">Claimed locations</div><div class="display tabular" style="font-size:23px;font-weight:700;">0</div></div>
    <div class="card stat-card"><div class="label">Monthly recurring revenue</div><div class="display tabular" style="font-size:23px;font-weight:700;">$0</div></div>
    <div class="card stat-card"><div class="label">Payment processor</div><div class="display" style="font-size:16px;font-weight:700;color:var(--ink-3);">Not connected</div></div>
  </div>
  <div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:14.5px;">Plan mix <span style="font-weight:600;color:var(--ink-3);">(real pricing, 0 real subscribers)</span></div>
    <table class="dash-table"><thead><tr><th>Plan</th><th>Price</th><th>Subscribers</th></tr></thead><tbody>{rows}</tbody></table>
  </div>'''
    return ("Real revenue ($0), real pricing", html)

# --- Admin: Settings (illustrative platform config) ---
def admin_settings_content():
    html = f'''<div class="card" style="padding:16px 18px;margin-bottom:16px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:10px;">Site domain</div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <input value="{SITE_DOMAIN}" disabled style="flex:1;min-width:220px;border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:inherit;background:var(--surface-2);color:var(--ink-3);">
      <button class="btn-secondary" disabled title="Prototype only">Save</button>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin-top:6px;">Real placeholder domain from <code>build_site.py</code> &mdash; to be replaced before this goes live.</div>
  </div>
  <div class="card" style="padding:16px 18px;margin-bottom:16px;">
    <div style="font-weight:800;font-size:14px;margin-bottom:10px;">Notifications <span style="font-weight:600;color:var(--ink-3);">(illustrative)</span></div>
    <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;color:var(--ink-2);"><span>New lead email alerts</span><input type="checkbox" checked disabled></label>
    <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;color:var(--ink-2);"><span>DHS re-import summary</span><input type="checkbox" checked disabled></label>
    <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;color:var(--ink-2);"><span>Content-moderation digest</span><input type="checkbox" disabled></label>
  </div>
  <div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;font-size:14.5px;">Admin roles <span style="font-weight:600;color:var(--ink-3);">(illustrative)</span></div>
    <table class="dash-table"><thead><tr><th>Role</th><th>Can do</th></tr></thead><tbody>
      <tr><td style="font-weight:700;">Super Admin</td><td>Everything, including re-running DHS imports and changing billing settings.</td></tr>
      <tr><td style="font-weight:700;">Admin</td><td>Review content, manage categories and ads; cannot change billing or run imports.</td></tr>
      <tr><td style="font-weight:700;">Support</td><td>View-only access to businesses and users, for handling support requests.</td></tr>
    </tbody></table>
  </div>'''
    return ("Real domain, illustrative settings", html)

ADMIN_SECTIONS = {
    "users": admin_users_content(),
    "categories": admin_categories_content(),
    "ads": admin_ads_content(),
    "content": admin_content_content(),
    "ai": admin_ai_content(),
    "seo": admin_seo_content(),
    "billing": admin_billing_content(),
    "settings": admin_settings_content(),
}

write_section_pages(OWNER_NAV, "light", "", "var(--ink-3)", "owner-dashboard.html", "Owner Dashboard", OWNER_BANNER, OWNER_SECTIONS)
write_section_pages(ADMIN_NAV, "dark", "color:#fff;", "oklch(78% 0.02 255)", "admin-dashboard.html", "Admin Dashboard", ADMIN_BANNER, ADMIN_SECTIONS)


