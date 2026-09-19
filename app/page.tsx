import Link from "next/link";
import { getDirectoryOverview } from "@/lib/directory";
import { SERVICE_TAGS } from "@/lib/types";

const tagDescriptions: Record<(typeof SERVICE_TAGS)[number], string> = {
  "Foster Care / Supported Living": "Licensed foster care and supported independent-living settings.",
  "Crisis Respite": "Short-term crisis stabilization and respite care.",
  "Out-of-Home Respite": "Planned respite care provided outside the family home.",
  "Remote Overnight Supervision": "Overnight supervision provided remotely rather than on-site.",
  "Adult Mental Health Certification": "DHS-certified adult mental health service sites."
};

export default async function HomePage() {
  const { stats, tagCounts, topCounties } = await getDirectoryOverview();

  return (
    <>
      <section className="hero">
        <div className="hero-glow a" /><div className="hero-glow b" />
        <div className="wrap hero-content">
          <div className="hero-kicker">Minnesota CRS provider directory</div>
          <h1 className="display hero-title">Find licensed care,<br />start with the facts.</h1>
          <p className="hero-copy">Search {stats.locations.toLocaleString()} provider locations across {stats.counties} Minnesota counties by provider name, city, county, service type, or listed license status.</p>
          <form action="/search" className="search-bar hero-search">
            <label className="sr-only" htmlFor="home-search">Search providers</label>
            <input id="home-search" name="q" placeholder="Search by provider name, city, county, ZIP, or license #" />
            <button className="btn-primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="directory-stats" aria-label="Directory statistics">
        <div className="wrap stat-row">
          <div><strong>{stats.locations.toLocaleString()}</strong><span>DHS-listed locations</span></div>
          <div><strong>{stats.companies.toLocaleString()}</strong><span>Operator companies</span></div>
          <div><strong>{stats.active.toLocaleString()}</strong><span>Listed active licenses</span></div>
          <div><strong>{stats.counties}</strong><span>Counties covered</span></div>
        </div>
      </section>

      <section className="wrap content-section">
        <div className="section-intro">
          <span className="eyebrow">Start with reliable context</span>
          <h2 className="display">A clearer place to begin your search</h2>
          <p>Browse DHS-derived licensing records before making calls. This launch directory is a fixed data snapshot, so always verify current license status directly with Minnesota DHS.</p>
        </div>
        <div className="grid-3">
          <div className="topic-tile static-tile"><div className="topic-icon">✓</div><div className="topic-title">DHS-sourced records</div><div className="topic-desc">License details, listed addresses, and statuses come from the launch dataset rather than user-submitted listings.</div></div>
          <div className="topic-tile static-tile"><div className="topic-icon">⌕</div><div className="topic-title">Search without an account</div><div className="topic-desc">Filter providers by county, service type, and status without a login wall or lead-generation form.</div></div>
          <div className="topic-tile static-tile"><div className="topic-icon">!</div><div className="topic-title">Verify before deciding</div><div className="topic-desc">Licensing status can change. Use this directory to narrow your search, then confirm current information with DHS.</div></div>
        </div>
      </section>

      <section className="wrap content-section">
        <div className="section-intro"><span className="eyebrow">Browse by service type</span><h2 className="display">Find a setting that fits the need</h2></div>
        <div className="grid-topics">
          {SERVICE_TAGS.map((tag) => (
            <Link className="topic-tile" href={`/search?tag=${encodeURIComponent(tag)}`} key={tag}>
              <div className="topic-icon">↗</div><div className="topic-title">{tag}</div><div className="topic-desc">{tagDescriptions[tag]}</div>
              <div className="topic-count">{tagCounts.get(tag)?.toLocaleString() ?? 0} listed active locations</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap content-section">
        <div className="section-intro"><span className="eyebrow">County coverage</span><h2 className="display">Explore leading counties</h2><p>These counties have the most locations listed as active in the launch dataset.</p></div>
        <div className="county-top-grid">
          {topCounties.map(({ county, count }, index) => (
            <Link className={`county-top-card ${index === 0 ? "lead" : ""}`} href={`/search?county=${encodeURIComponent(county)}`} key={county}>
              <span className="county-rank">{index === 0 ? "Top county" : `#${index + 1}`}</span>
              <strong>{county}</strong><span>{count} listed active locations</span><div className="progress"><div style={{ width: `${Math.round((count / topCounties[0].count) * 100)}%` }} /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap content-section" id="about">
        <div className="snapshot-notice"><strong>About this launch</strong><p>Licensed Care MN is a working directory prototype built from a fixed Minnesota DHS licensing snapshot. It is not affiliated with or endorsed by DHS, and it is not a substitute for directly confirming a provider’s current license status.</p><Link className="btn-secondary" href="/guide">Read the CRS guide</Link></div>
      </section>
    </>
  );
}
